# Phase 10: AI Matching Engine (Basic) — Detailed Development Plan

## 1. Objective

Implement the core AI matching engine that provides semantic matching between employer/individual needs and training programs, powers personalized recommendations on the storefront, and generates human-readable explanations for why programs are recommended.

---

## 2. Prerequisites

- Phase 1 completed (database with pgvector, program_embeddings table)
- Phase 3 completed (training programs with rich metadata in database)
- Phase 4 completed (storefront and search endpoints to integrate with)
- AI API access configured (OpenAI or Anthropic Claude)

---

## 3. Detailed Tasks

### 3.1 Backend — AI Embedding Pipeline

#### 3.1.1 Program Embedding Generation

When a program is published or updated, generate a vector embedding for semantic search.

```typescript
// services/ai/embedding.service.ts

async function generateProgramEmbedding(program_id: UUID) {
  // 1. Fetch program with all metadata
  const program = await db.training_programs.findUnique({
    where: { program_id },
    include: { category: true, provider: true, trainers: true }
  });

  // 2. Construct embedding text from program data
  const embeddingText = buildProgramEmbeddingText(program);
  // Example output:
  // "Advanced Leadership Skills Training. Category: Leadership and Management.
  //  Learn strategic leadership, team management, decision making.
  //  Target audience: Mid to senior level managers in manufacturing and services.
  //  Duration: 3 days. Delivery: Physical in Kuala Lumpur.
  //  Skills: Leadership, Strategic Thinking, Team Building, Decision Making.
  //  Certification: Certificate of Completion. HRD Corp Claimable."

  // 3. Call AI API to generate embedding
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: embeddingText
  });

  // 4. Store in pgvector
  await db.program_embeddings.upsert({
    where: { program_id },
    create: {
      program_id,
      embedding: embedding.data[0].embedding,
      embedding_model: "text-embedding-3-small"
    },
    update: {
      embedding: embedding.data[0].embedding,
      updated_at: new Date()
    }
  });
}
```

#### 3.1.2 Embedding Text Builder

```typescript
function buildProgramEmbeddingText(program: TrainingProgram): string {
  const parts = [
    program.title,
    program.description,
    `Category: ${program.category?.name}`,
    program.learning_outcomes ? `Learning outcomes: ${program.learning_outcomes}` : '',
    program.target_audience ? `Target audience: ${program.target_audience}` : '',
    program.industry_focus?.length ? `Industries: ${program.industry_focus.join(', ')}` : '',
    program.skill_tags_names?.length ? `Skills: ${program.skill_tags_names.join(', ')}` : '',
    `Delivery: ${program.delivery_mode}`,
    program.location ? `Location: ${program.location}` : '',
    program.duration_days ? `Duration: ${program.duration_days} days` : '',
    program.certification ? `Certification: ${program.certification}` : '',
    program.hrd_corp_claimable ? 'HRD Corp Claimable' : ''
  ];

  return parts.filter(Boolean).join('. ');
}
```

#### 3.1.3 Batch Embedding Job

```typescript
// jobs/generate-embeddings.job.ts
// Runs on:
// 1. Program publish (triggered by webhook/event)
// 2. Program update (if description or key fields changed)
// 3. Bulk re-index (admin triggered, for model upgrades)

// For bulk: process all published programs without embeddings
// Rate limited to stay within AI API limits
// Process in batches of 50
```

---

### 3.2 Backend — AI Matching Service

#### 3.2.1 Semantic Search (Need-to-Program Matching)

**POST /api/ai/match**
```
Role: authenticated user

Request Body:
{
  query: string (natural language description of training need),
  filters: {
    delivery_mode: string,
    location: string,
    max_fee: number,
    min_duration_days: number,
    max_duration_days: number,
    hrd_corp_claimable: boolean,
    category_id: UUID
  },
  limit: number (default 10)
}

Process:
1. Generate embedding for the query text
2. Perform vector similarity search in pgvector:
   SELECT p.*, pe.embedding <=> query_embedding AS distance
   FROM training_programs p
   JOIN program_embeddings pe ON p.program_id = pe.program_id
   WHERE p.status = 'published'
   AND (apply filters)
   ORDER BY distance ASC
   LIMIT limit
3. Convert distance to match_score (0-100)
4. Apply boosts:
   - provider quality tier boost (+5 for trusted, +10 for premium)
   - effectiveness score boost
   - engagement boost (popular programs)
5. Re-rank by combined score
6. Generate match explanations for top results
7. Store match records in ai_match_records
8. Return ranked results

Response 200:
{
  data: [
    {
      program_id,
      title,
      provider: { provider_name, quality_tier },
      match_score: 92,
      match_reason: "This program directly addresses leadership development for manufacturing managers, matching your stated need for strategic leadership training.",
      key_matches: [
        "Covers strategic leadership skills",
        "Targets mid-senior managers",
        "Relevant to manufacturing industry",
        "Available in your preferred location"
      ],
      ...program card fields
    }
  ]
}
```

#### 3.2.2 Match Explanation Generator

```typescript
// services/ai/explanation.service.ts

async function generateMatchExplanation(
  userNeed: string,
  program: TrainingProgram,
  matchScore: number
): Promise<MatchExplanation> {

  const prompt = `
    A user is looking for training: "${userNeed}"

    We matched them with this program:
    Title: ${program.title}
    Description: ${program.description}
    Category: ${program.category}
    Skills: ${program.skill_tags}
    Target Audience: ${program.target_audience}
    Industry: ${program.industry_focus}
    Delivery: ${program.delivery_mode}
    Location: ${program.location}
    Duration: ${program.duration_days} days
    Fee: RM ${program.fee}

    Match score: ${matchScore}/100

    Generate:
    1. A one-sentence explanation of why this program matches (max 150 chars)
    2. A list of 3-5 specific matching points (what need it addresses)
    3. Any potential gaps or considerations

    Respond in JSON format:
    {
      "reason": "...",
      "key_matches": ["...", "..."],
      "considerations": ["..."]
    }
  `;

  const response = await ai.chat({
    model: "claude-haiku-4-5-20251001",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.content);
}
```

#### 3.2.3 Personalized Recommendation Engine

**GET /api/ai/recommendations**
```
Role: authenticated user
Query Params: limit (default 12), context ("storefront" | "program_detail")

Process:
1. Build user profile vector from:
   - employer: industry, training_interests, company_size
   - individual: skill_interests, career_goals, education_level
2. Add behavioral signals:
   - recently viewed program categories
   - search history keywords
   - saved program types
   - enquiry topics
3. Generate combined query embedding from profile + behavior
4. Vector similarity search against program embeddings
5. Apply collaborative filtering boost:
   - "employers in your industry also viewed/enquired about X"
6. Exclude already viewed programs (optional, configurable)
7. Return ranked recommendations

Response: same format as match results
```

#### 3.2.4 Similar Programs Engine

**GET /api/ai/similar/:program_id**
```
Public endpoint
Query Params: limit (default 6), same_provider (boolean, default false)

Process:
1. Get embedding for the given program
2. Find nearest neighbors in pgvector (excluding self)
3. If same_provider = true, filter to same provider
4. If same_provider = false, filter to different providers
5. Return similar programs

Response: program card data with similarity_score
```

#### 3.2.5 Broadcast Request AI Matching

**GET /api/ai/match-providers/:request_id**
```
Role: system (called internally when broadcast request is created)

Process:
1. Get broadcast request description and requirements
2. Generate embedding for request
3. For each active provider:
   a. Get all their program embeddings
   b. Find best matching program
   c. Calculate provider relevance score
4. Rank providers by relevance
5. Return ranked provider list with relevance scores

Used to:
- Sort the provider notification (most relevant providers notified first)
- Show relevance score in provider's request feed
```

---

### 3.3 Backend — AI API Integration Layer

#### 3.3.1 AI Client Abstraction

```typescript
// services/ai/client.ts

interface AIClient {
  generateEmbedding(text: string): Promise<number[]>;
  chat(params: ChatParams): Promise<ChatResponse>;
}

// Implementation for OpenAI
class OpenAIClient implements AIClient { ... }

// Implementation for Anthropic Claude
class ClaudeClient implements AIClient { ... }

// Factory
function createAIClient(): AIClient {
  if (config.AI_PROVIDER === 'openai') return new OpenAIClient();
  if (config.AI_PROVIDER === 'anthropic') return new ClaudeClient();
}
```

#### 3.3.2 Rate Limiting and Cost Control

```typescript
// AI API call tracking and limiting
// - embedding calls: max 1000 per hour
// - chat calls: max 500 per hour
// - daily spend limit: configurable
// - cache embeddings (program text hash → embedding) to avoid recomputation
// - cache explanations for same program-query pairs (1 hour TTL)
```

#### 3.3.3 Fallback Strategy

```
If AI API is unavailable:
1. For search: fall back to pg_trgm text search (already implemented in Phase 4)
2. For recommendations: fall back to rule-based matching (category + industry + skills overlap)
3. For explanations: show generic explanation based on matching metadata fields
4. Log failure for monitoring
5. Alert admin if failure rate exceeds threshold
```

---

### 3.4 Backend — Matching Integration Points

#### 3.4.1 Storefront Integration
Update Phase 4 endpoints to use AI:
- GET /api/storefront/recommended → powered by AI recommendation engine
- GET /api/search/programs → add AI semantic relevance to ranking (when sort_by = "relevance")
- GET /api/storefront/because-you-searched → use AI to find related programs

#### 3.4.2 Program Detail Integration
- related programs (same provider) → AI similar programs engine
- similar programs (other providers) → AI similar programs engine

#### 3.4.3 Broadcast Integration
- when broadcast request created → run AI provider matching
- provider feed sort by "relevance" → use AI relevance scores

---

### 3.5 Web Frontend — AI Recommendation Display

#### 3.5.1 Match Score Badge on Program Cards
```
┌─────────────────────────┐
│ 🎯 92% Match             │
│ Program Title...         │
│ ...                      │
└─────────────────────────┘
```
- circular score indicator (green > 80, yellow > 60, grey < 60)
- only shown on recommendation and search result cards
- not shown on general browsing (storefront featured, trending)

#### 3.5.2 Match Explanation on Program Detail
```
┌─────────────────────────────────────────────┐
│  Why This Program Matches Your Need          │
│  ─────────────────────────────────────────  │
│  🎯 Match Score: 92/100                      │
│                                              │
│  "This program directly addresses leadership │
│  development for manufacturing managers"     │
│                                              │
│  ✅ Covers strategic leadership skills       │
│  ✅ Targets mid-senior managers              │
│  ✅ Relevant to manufacturing industry       │
│  ✅ Available in your preferred location     │
│                                              │
│  ⚠️ Considerations:                         │
│  • Duration (3 days) may exceed your         │
│    preferred 2-day timeframe                 │
└─────────────────────────────────────────────┘
```
- shown on program detail page when accessed via recommendation or search
- collapsible section
- key matches with checkmarks
- considerations with warning icons

#### 3.5.3 AI Recommendation Section on Storefront
```
┌─────────────────────────────────────────────┐
│  🤖 Recommended For You                      │
│  Based on your industry, interests, and      │
│  recent activity                             │
│  ─────────────────────────────────────────  │
│  [Card with 🎯 85%] [Card with 🎯 82%]      │
│  [Card with 🎯 78%] [Card with 🎯 75%] →    │
└─────────────────────────────────────────────┘
```

---

### 3.6 Mobile App — AI Features

#### 3.6.1 Match Score Display
- match score badge on program cards in recommendation sections
- simplified match explanation on program detail screen

#### 3.6.2 Recommendation Feed
- AI-powered recommendations in home screen
- same data as web, mobile-optimized layout

---

## 4. Acceptance Criteria

- [ ] Program embeddings generated for all published programs
- [ ] New/updated programs get embeddings automatically
- [ ] Semantic search returns relevant results for natural language queries
- [ ] Match scores are consistent and meaningful (high for relevant, low for irrelevant)
- [ ] Match explanations are accurate and human-readable
- [ ] Personalized recommendations reflect user profile and behavior
- [ ] Similar programs engine returns genuinely related programs
- [ ] Broadcast request AI matching ranks providers relevantly
- [ ] Fallback to text search works when AI API is unavailable
- [ ] AI API costs are tracked and within budget
- [ ] Response time for AI-powered search is under 3 seconds
- [ ] Match scores and explanations display correctly on web and mobile
- [ ] Recommendation section on storefront shows personalized results
- [ ] AI does not hallucinate or recommend non-existent programs

---

## 5. Estimated Effort

| Task | Effort |
|------|--------|
| Embedding pipeline (generate, store, batch job) | 2-3 days |
| AI client abstraction and integration | 2 days |
| Semantic search with pgvector | 2-3 days |
| Match explanation generator | 2 days |
| Personalized recommendation engine | 2-3 days |
| Similar programs engine | 1 day |
| Broadcast request AI matching | 1-2 days |
| Storefront and search integration | 2 days |
| Fallback and error handling | 1 day |
| Rate limiting and cost controls | 1 day |
| Web: Match score and explanation UI | 2 days |
| Web: Recommendation section update | 1 day |
| Mobile: AI feature display | 1 day |
| Testing and tuning | 3-4 days |
| **Total** | **21-27 days** |

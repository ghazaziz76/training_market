# Phase 13: Differentiating Features Wave 1 — Detailed Development Plan

## 1. Objective

Launch the three flagship differentiating features: AI Training Advisor chatbot, Provider Quality Tier System, and HRD Corp Levy Optimizer. These create the initial competitive moat.

---

## 2. Prerequisites

- Phase 10 completed (AI matching engine with embeddings and explanation)
- Phase 12 completed (analytics data flowing)
- Provider and program data mature enough for quality scoring

---

## 3. Feature A: AI Training Advisor Chatbot

### 3.A.1 Backend — AI Advisor Service

#### Conversation Management

**POST /api/advisor/conversations**
```
Role: employer, individual
Process: create new conversation, return conversation_id
```

**POST /api/advisor/conversations/:id/messages**
```
Role: conversation owner

Request Body:
{
  message: string
}

Process:
1. Append user message to conversation
2. Build AI prompt with:
   - system prompt (advisor personality and capabilities)
   - user profile context (industry, interests, company size)
   - conversation history
   - available tools: search_programs, get_program_detail, create_broadcast
3. Call AI API with tool use support
4. If AI calls search_programs tool:
   a. Execute semantic search against catalog
   b. Return results to AI
   c. AI formulates recommendation with reasoning
5. If AI calls create_broadcast tool:
   a. Extract request parameters from conversation
   b. Pre-fill broadcast form data
   c. Return link to broadcast creation page
6. Append AI response to conversation
7. Store programs_recommended references
8. Return AI response

Response 200:
{
  data: {
    message: string (AI response),
    programs_mentioned: [{ program_id, title, match_score }],
    suggested_action: "view_program" | "compare" | "enquire" | "broadcast" | null,
    action_data: { ... }
  }
}
```

#### AI System Prompt
```
You are the Training Market AI Training Advisor. You help employers and
individuals find the right training programs.

Rules:
- Only recommend programs that exist in the catalog (use search_programs tool)
- Always explain why you recommend a program
- Ask clarifying questions when the need is vague
- Consider budget, location, delivery mode, team size, and timeline
- If no suitable programs exist, suggest creating a broadcast request
- Be concise and professional
- Never make up program names or details
- Always mention the provider name and key details (fee, duration, mode)

Available tools:
- search_programs(query, filters) → returns matching programs
- get_program_detail(program_id) → returns full program info
- suggest_broadcast(params) → suggests creating a broadcast request

User context:
- Role: {role}
- Industry: {industry}
- Company size: {company_size}
- Location: {location}
- Training interests: {interests}
```

#### Conversation History

**GET /api/advisor/conversations**
```
Role: authenticated user
Returns list of past conversations with last message preview
```

**GET /api/advisor/conversations/:id**
```
Role: conversation owner
Returns full conversation with all messages
```

**DELETE /api/advisor/conversations/:id**
```
Role: conversation owner
Soft delete (archive)
```

### 3.A.2 Web Frontend — AI Advisor Chatbot

#### Chatbot Widget (floating button)
```
┌──────────────────────┐
│  🤖 Ask AI Advisor   │  ← Floating button (bottom-right)
└──────────────────────┘
```
- visible on all employer and individual pages
- click opens chat panel

#### Chat Panel
```
┌─────────────────────────────────────┐
│  AI Training Advisor           [─] [X] │
│  ─────────────────────────────────  │
│  🤖 Hi! I'm your Training Advisor.  │
│  Tell me what training you're       │
│  looking for, and I'll help you     │
│  find the best options.             │
│  ─────────────────────────────────  │
│  👤 My sales team needs training    │
│  on closing techniques. About 15    │
│  people, prefer physical in KL.     │
│  ─────────────────────────────────  │
│  🤖 Great! For sales closing skills │
│  training for 15 pax in KL, I found │
│  these programs:                    │
│                                     │
│  1. 🎯 92% Match                    │
│  Advanced Sales Closing Mastery     │
│  by ABC Training | RM 1,500/pax     │
│  3 days | Physical | KL             │
│  [View Program] [Enquire]           │
│                                     │
│  2. 🎯 85% Match                    │
│  Sales Excellence Workshop          │
│  by XYZ Academy | RM 1,200/pax     │
│  2 days | Physical | KL             │
│  [View Program] [Enquire]           │
│                                     │
│  Would you like more details on     │
│  either program, or should I look   │
│  for different options?             │
│  ─────────────────────────────────  │
│  [Type your message...        ] [→] │
│  ─────────────────────────────────  │
│  Past Conversations ▼               │
└─────────────────────────────────────┘
```

- slide-in panel from right side (or modal)
- minimizable to floating button
- conversation history preserved across page navigation
- program cards inline with action buttons
- typing indicator while AI responds
- past conversations list at bottom

#### Full Page Advisor (/advisor)
- same chat interface but full page width
- more room for program cards and detail
- side panel for program preview without leaving chat

### 3.A.3 Mobile App — AI Advisor

- dedicated Advisor tab in bottom navigation
- chat interface optimized for mobile
- program cards tappable to view detail
- voice input button (future enhancement)

---

## 4. Feature B: Provider Quality Tier System

### 4.B.1 Backend — Quality Tier Service

#### Tier Definitions

| Tier | Badge | Criteria |
|------|-------|----------|
| Verified | ✓ | Admin verification completed |
| Trusted | ✓✓ | Verified + 10 completed programs + 4.0 rating + 80% response rate + 6 months on platform |
| Premium | ✓✓✓ | Trusted + HRD Corp registered + accreditation + 4.5 rating + 90% response rate + 50 completed programs |

#### Tier Calculation Engine

```typescript
// services/quality-tier.service.ts

async function calculateProviderTier(provider_id: UUID): Promise<QualityTier> {
  const provider = await getProviderWithStats(provider_id);

  // Check Premium criteria
  if (
    provider.verification_status === 'verified' &&
    provider.hrd_corp_registered_provider &&
    provider.accreditation_details &&
    provider.average_rating >= 4.5 &&
    provider.response_rate >= 90 &&
    provider.total_completed_programs >= 50 &&
    monthsOnPlatform(provider) >= 12
  ) {
    return 'premium';
  }

  // Check Trusted criteria
  if (
    provider.verification_status === 'verified' &&
    provider.average_rating >= 4.0 &&
    provider.response_rate >= 80 &&
    provider.total_completed_programs >= 10 &&
    monthsOnPlatform(provider) >= 6
  ) {
    return 'trusted';
  }

  // Check Verified criteria
  if (provider.verification_status === 'verified') {
    return 'verified';
  }

  return 'unverified';
}
```

#### Tier Recalculation Job (runs weekly)
- recalculates tier for all active providers
- if tier changes, update provider record
- notify provider of tier upgrade or downgrade
- log tier change

#### API Endpoints

**GET /api/providers/:id/tier-progress**
```
Role: provider (own profile)

Response:
{
  current_tier: "trusted",
  next_tier: "premium",
  progress: {
    verification: { met: true, required: "verified" },
    hrd_corp_registered: { met: false, required: true },
    accreditation: { met: true, required: "any accreditation" },
    average_rating: { met: false, current: 4.3, required: 4.5 },
    response_rate: { met: true, current: 92, required: 90 },
    completed_programs: { met: false, current: 35, required: 50 },
    months_on_platform: { met: true, current: 14, required: 12 }
  },
  tips: [
    "Improve your rating to 4.5 to progress toward Premium",
    "Complete 15 more programs to meet the requirement",
    "Register as HRD Corp provider to qualify"
  ]
}
```

### 4.B.2 Web Frontend — Quality Tier Display

#### Tier Badge Component (Reusable)
```
[✓ Verified]     ← grey badge
[✓✓ Trusted]     ← blue badge
[✓✓✓ Premium]    ← gold badge
```
- displayed on: provider profile, program cards, search results, proposal cards, storefront spotlight

#### Provider Tier Progress Page (/provider/quality-tier)
```
┌─────────────────────────────────────────────────┐
│  Your Quality Tier                               │
│  ─────────────────────────────────────────────  │
│  Current: ✓✓ Trusted                             │
│  Next: ✓✓✓ Premium                               │
│  ─────────────────────────────────────────────  │
│  Progress to Premium:                            │
│  ✅ Admin Verified                                │
│  ⬜ HRD Corp Registered Provider (register now →) │
│  ✅ Accreditation on file                         │
│  ⬜ Rating: 4.3 / 4.5 required                    │
│  ✅ Response Rate: 92% / 90% required             │
│  ⬜ Completed Programs: 35 / 50 required          │
│  ✅ Months on Platform: 14 / 12 required          │
│  ─────────────────────────────────────────────  │
│  ████████████░░░ 71% to Premium                  │
│  ─────────────────────────────────────────────  │
│  Tips:                                           │
│  💡 Register with HRD Corp to unlock requirement │
│  💡 Focus on collecting positive reviews          │
│  💡 Complete more training sessions               │
└─────────────────────────────────────────────────┘
```

#### Tier Benefits Explanation Page (/quality-tiers)
- public page explaining the tier system
- what each tier means for employers
- what each tier means for providers
- how to progress

---

## 5. Feature C: HRD Corp Levy Optimizer

### 5.C.1 Backend — Levy Optimizer Service

#### API Endpoints

**PUT /api/employer/levy-balance**
```
Role: employer

Request Body:
{
  total_levy: number,
  utilized_amount: number,
  year: number (current year)
}

Process: create or update levy_utilization_records
```

**GET /api/employer/levy-status**
```
Role: employer

Response:
{
  year: 2027,
  total_levy: 50000,
  utilized_amount: 15000,
  remaining_amount: 35000,
  utilization_percentage: 30,
  months_remaining: 8,
  monthly_target: 4375 (remaining / months_remaining),
  status: "underutilized" | "on_track" | "well_utilized"
}
```

**GET /api/employer/levy-optimizer/recommendations**
```
Role: employer

Process:
1. Get employer levy balance and utilization
2. Get employer profile (industry, interests, team size)
3. Calculate remaining budget and time
4. Query AI for optimized training plan:
   - programs matching industry and interests
   - programs fitting within remaining levy
   - distributed across remaining months
   - prioritized by impact and relevance
5. Return structured plan

Response:
{
  summary: {
    remaining_levy: 35000,
    months_remaining: 8,
    recommended_spend: 32000,
    programs_suggested: 6,
    employees_covered: 45
  },
  recommendations: [
    {
      priority: 1,
      program: { program_id, title, provider, fee },
      suggested_month: "March 2027",
      participants: 15,
      total_cost: 7500,
      reason: "Leadership development is your top training interest and this program has a 4.8 rating"
    },
    {
      priority: 2,
      program: { ... },
      suggested_month: "April 2027",
      ...
    }
  ],
  levy_projection: [
    { month: "Mar", projected_spend: 7500, projected_remaining: 27500 },
    { month: "Apr", projected_spend: 6000, projected_remaining: 21500 },
    ...
  ],
  tips: [
    "You have 8 months to utilize RM 35,000",
    "Consider group training sessions to maximize coverage",
    "Early bird rates can save 10-20% on some programs"
  ]
}
```

### 5.C.2 Web Frontend — Levy Optimizer Dashboard

#### Levy Overview Page (/employer/levy-optimizer)
```
┌─────────────────────────────────────────────────┐
│  HRD Corp Levy Optimizer                         │
│  ─────────────────────────────────────────────  │
│  Your Levy Balance (2027):                       │
│  ┌─────────────────────────────────────────┐    │
│  │  Total: RM 50,000                        │    │
│  │  Used:  RM 15,000 (30%)                  │    │
│  │  Remaining: RM 35,000                    │    │
│  │  ████████░░░░░░░░░░░░░░░░░░ 30%         │    │
│  │  8 months remaining this year            │    │
│  └─────────────────────────────────────────┘    │
│  [Update Levy Balance]                           │
│  ─────────────────────────────────────────────  │
│  ⚠️ You are underutilizing your levy.            │
│  At current pace, RM 25,000 will go unused.      │
│  ─────────────────────────────────────────────  │
│  AI Recommended Training Plan:                   │
│  ─────────────────────────────────────────────  │
│  1. March: Advanced Leadership (RM 7,500)        │
│     For: 15 managers | ABC Training              │
│     [View Program] [Add to Plan]                 │
│                                                  │
│  2. April: Excel for Finance (RM 6,000)          │
│     For: 12 finance staff | XYZ Academy          │
│     [View Program] [Add to Plan]                 │
│  ...                                             │
│  ─────────────────────────────────────────────  │
│  Levy Projection Chart:                          │
│  (bar chart showing monthly spend + remaining)   │
│  ─────────────────────────────────────────────  │
│  [Generate Annual Training Plan]                 │
└─────────────────────────────────────────────────┘
```

- levy balance input form (editable)
- utilization gauge/progress bar
- AI recommendations with program cards
- monthly projection chart
- link to annual training plan builder (Phase 14)

### 5.C.3 Mobile App — Levy Status

- simplified levy balance view
- utilization percentage and status
- top 3 AI recommendations
- link to full optimizer on web

---

## 6. Acceptance Criteria

### AI Training Advisor
- [ ] Chatbot opens from floating button on all pages
- [ ] Employer can describe training need in natural language
- [ ] AI asks relevant follow-up questions
- [ ] AI recommends real programs from the catalog with match scores
- [ ] AI never recommends programs that don't exist
- [ ] Program cards in chat are clickable (view, enquire)
- [ ] Conversation history persists across page navigation
- [ ] Past conversations are accessible
- [ ] If no programs match, AI suggests broadcast request
- [ ] Response time under 3 seconds
- [ ] Mobile chatbot works

### Quality Tier System
- [ ] Tier calculation correctly evaluates all criteria
- [ ] Tier badges display on all relevant surfaces
- [ ] Provider can view tier progress with specific criteria status
- [ ] Tier recalculation runs weekly
- [ ] Provider notified of tier changes
- [ ] Higher tier providers get ranking boost in search
- [ ] Tier progress page shows actionable tips

### Levy Optimizer
- [ ] Employer can input levy balance
- [ ] Utilization status calculates correctly
- [ ] AI recommendations generated based on profile and remaining levy
- [ ] Monthly projection chart displays correctly
- [ ] Underutilization warning shows when appropriate
- [ ] Recommendations link to actual programs

---

## 7. Estimated Effort

| Task | Effort |
|------|--------|
| AI Advisor: backend conversation service | 3-4 days |
| AI Advisor: tool use and catalog integration | 2-3 days |
| AI Advisor: web chatbot widget and panel | 3-4 days |
| AI Advisor: mobile chatbot | 2-3 days |
| AI Advisor: testing and prompt tuning | 2-3 days |
| Quality Tier: calculation engine | 2 days |
| Quality Tier: recalculation job | 1 day |
| Quality Tier: API and badge components | 1-2 days |
| Quality Tier: provider progress page | 2 days |
| Levy Optimizer: backend service and AI | 3-4 days |
| Levy Optimizer: web dashboard | 3-4 days |
| Levy Optimizer: mobile status view | 1 day |
| Testing across all features | 3-4 days |
| **Total** | **27-36 days** |

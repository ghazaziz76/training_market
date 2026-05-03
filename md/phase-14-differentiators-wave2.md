# Phase 14: Differentiating Features Wave 2 — Detailed Development Plan

## 1. Objective

Deploy four advanced differentiating features: Competitive Bidding Enhancements, Group Training Pool, Training Effectiveness Tracking, and Annual Training Plan Builder. These features deepen the data flywheel and employer engagement.

---

## 2. Prerequisites

- Phase 6 completed (broadcast requests and proposals)
- Phase 10 completed (AI matching engine)
- Phase 12 completed (analytics pipeline)
- Phase 13 completed (quality tiers, levy optimizer)

---

## 3. Feature A: Competitive Bidding Enhancements

### 3.A.1 Backend Enhancements

**AI Value Scoring Improvements**
```typescript
async function calculateProposalValueScore(proposal, request): Promise<number> {
  let score = 0;

  // Fee fit (30% weight)
  const feeScore = calculateFeeFit(proposal.proposed_fee, request.budget_min, request.budget_max);
  score += feeScore * 0.30;

  // Provider quality (25% weight)
  const tierScores = { premium: 100, trusted: 75, verified: 50 };
  score += (tierScores[proposal.provider.quality_tier] || 25) * 0.25;

  // Provider track record (20% weight)
  const trackRecord = (proposal.provider.average_rating / 5) * 50 +
                      (proposal.provider.response_rate / 100) * 30 +
                      Math.min(proposal.provider.total_completed_programs / 100, 1) * 20;
  score += trackRecord * 0.20;

  // Program relevance (15% weight) - if linked to existing program
  if (proposal.program_id) {
    const relevance = await calculateSemanticMatch(request.description, proposal.program);
    score += relevance * 0.15;
  }

  // Value adds (10% weight)
  const valueAddScore = proposal.value_add_offers ? 80 : 0;
  score += valueAddScore * 0.10;

  return Math.round(score);
}
```

**Proposal Count Visibility for Providers**
- update GET /api/broadcast-requests/:id to include total_proposals count
- providers can see how many proposals were submitted (not details)
- creates urgency and competitive awareness

**Value-Add Structured Input**
```typescript
// Enhanced proposal submission
value_add_offers: [
  { type: "free_coaching", description: "1 free coaching session post-training" },
  { type: "extra_materials", description: "Complimentary workbook and templates" },
  { type: "extended_support", description: "30-day post-training email support" },
  { type: "group_discount", description: "10% discount for 20+ participants" },
  { type: "custom", description: "..." }
]
```

**Award Badge System**
```sql
-- Add to training_providers table
awards_won INTEGER DEFAULT 0,
award_badges JSONB DEFAULT '[]'

-- Example badge: { type: "selected_provider", count: 5, last_awarded: "2027-03-15" }
```

- when proposal is selected, increment provider awards_won
- display "Selected Provider" badge with win count on provider profile
- "Won X proposals" displayed on storefront

### 3.A.2 Web Frontend Enhancements

**Enhanced Proposal Comparison View**
- radar chart comparing shortlisted proposals across dimensions (fee, quality, relevance, value-adds, response speed)
- side-by-side detail comparison table
- AI summary: "Proposal #1 offers best value considering quality and price"

**Provider: Competitive Insights**
- after proposal submitted: "You are 1 of 5 providers who responded"
- win rate trend on provider dashboard

---

## 4. Feature B: Group Training Pool

### 4.B.1 Backend — Group Pool Service

#### Pool Detection Engine
```typescript
// jobs/detect-pool-opportunities.job.ts
// Runs daily

async function detectPoolOpportunities() {
  // 1. Find recent search patterns with overlapping needs
  //    e.g., 3 employers in KL searched for "OSHA safety" in past 14 days

  // 2. Find broadcast requests with similar topics
  //    e.g., 2 employers posted requests for "Excel training"

  // 3. Find enquiries for same program from different employers

  // 4. For each overlap:
  //    a. Calculate total potential participants
  //    b. Check if total meets minimum (e.g., 10 pax)
  //    c. Create group_training_pools record
  //    d. Notify eligible employers

  // Grouping criteria:
  // - Same skill topic or program category
  // - Same city/state or online
  // - Similar timeframe (within 30 days of each other)
  // - Combined participants >= minimum viable group
}
```

#### API Endpoints

**GET /api/pools/opportunities**
```
Role: employer

Response:
{
  data: [
    {
      pool_id,
      skill_topic: "OSHA Safety Compliance",
      delivery_mode: "physical",
      location: "Kuala Lumpur",
      target_date_range: "March - April 2027",
      current_participants: 8,
      min_participants: 10,
      employers_interested: 3,
      estimated_savings: "15-25% vs individual sessions",
      matching_programs: [
        { program_id, title, provider, fee, group_fee_estimate }
      ],
      status: "forming"
    }
  ]
}
```

**POST /api/pools/:pool_id/join**
```
Role: employer

Request Body:
{
  participant_count: number
}

Process:
1. Create pool_participants record
2. Update pool total_participants
3. If total >= minimum, change status to "confirmed"
4. Notify all participating employers
5. Notify matching TPs of confirmed pool
```

**POST /api/pools/:pool_id/leave**
```
Role: employer (participant)
Process: withdraw, update counts, check if still viable
```

**GET /api/pools/:pool_id**
```
Role: employer (participant or interested)
Returns pool detail with participating employers (company names only, no contacts)
```

**POST /api/pools/:pool_id/tp-offer**
```
Role: provider
Submit group training offer for a confirmed pool

Request Body:
{
  program_id: UUID,
  group_fee_per_pax: number,
  total_group_fee: number,
  proposed_dates: string,
  details: string
}
```

### 4.B.2 Web Frontend — Group Pool

**Pool Opportunities Page (/employer/group-training)**
```
┌─────────────────────────────────────────────────┐
│  Group Training Opportunities                    │
│  "Save costs by training together with other     │
│  companies"                                      │
│  ─────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────┐   │
│  │ 🏊 OSHA Safety Compliance               │   │
│  │ Physical | KL | March-April 2027         │   │
│  │ 8 participants from 3 companies          │   │
│  │ Need 2 more to confirm!                  │   │
│  │ Estimated savings: 15-25%                │   │
│  │ [Join Pool (add participants)]           │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │ ✅ Excel Advanced (CONFIRMED)            │   │
│  │ Online | 15 participants from 4 companies│   │
│  │ Waiting for TP offers                    │   │
│  │ [View Details]                           │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## 5. Feature C: Training Effectiveness Tracking

### 5.C.1 Backend — Effectiveness Service

#### Creating Effectiveness Tracking

**POST /api/effectiveness/track**
```
Role: employer

Request Body:
{
  program_id: UUID,
  provider_id: UUID,
  schedule_id: UUID (optional),
  kpi_description: string (e.g., "Sales team closing rate"),
  baseline_value: string (e.g., "25% close rate"),
  target_value: string (e.g., "40% close rate")
}

Process:
1. Create effectiveness_records entry
2. Schedule follow-up surveys at 30, 60, 90 days from training end date
```

#### Automated Survey System

**Survey Job (runs daily)**
```typescript
async function sendEffectivenessSurveys() {
  // Find records where:
  // - 30 days passed and survey_30_day_sent = false
  // - 60 days passed and survey_60_day_sent = false
  // - 90 days passed and survey_90_day_sent = false

  // Send survey notification with link
  // Survey is a simple form: rating (1-5), open text feedback, KPI update
}
```

**POST /api/effectiveness/:record_id/survey**
```
Role: employer (owner)

Request Body:
{
  survey_type: "30_day" | "60_day" | "90_day",
  impact_rating: number (1-5),
  actual_value: string,
  feedback: string,
  would_recommend: boolean
}

Process:
1. Store survey response
2. Update effectiveness_records
3. Recalculate program effectiveness_score:
   average of all impact_ratings for this program
4. Update training_programs.effectiveness_score
5. Feed back into AI matching ranking
```

#### Effectiveness Analytics

**GET /api/effectiveness/my-tracking**
```
Role: employer

Response:
{
  data: [
    {
      record_id,
      program: { title, provider },
      kpi_description,
      baseline_value,
      target_value,
      actual_value,
      impact_rating,
      surveys_completed: 2,
      surveys_total: 3,
      status: "tracking" | "completed"
    }
  ]
}
```

**GET /api/programs/:id/effectiveness**
```
Public endpoint

Response:
{
  effectiveness_score: 4.2,
  total_tracked: 15,
  would_recommend_pct: 87,
  average_impact_rating: 4.2,
  sample_feedback: [
    { rating: 5, feedback: "Significant improvement in team performance" }
  ]
}
```

### 5.C.2 Web Frontend — Effectiveness Dashboard

**Employer Effectiveness Page (/employer/effectiveness)**
```
┌─────────────────────────────────────────────────┐
│  Training Effectiveness Tracker                  │
│  ─────────────────────────────────────────────  │
│  Active Tracking: 3 | Completed: 8              │
│  Average Impact: ★ 4.2                          │
│  ─────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────┐   │
│  │ Advanced Leadership Skills               │   │
│  │ KPI: Team productivity score             │   │
│  │ Baseline: 65/100 → Target: 80/100       │   │
│  │ Current: 78/100 (after 60 days)         │   │
│  │ Impact: ★★★★☆ (4/5)                     │   │
│  │ Surveys: ██░ 2/3 completed              │   │
│  │ [Complete 90-day Survey]                 │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Program Detail: Effectiveness Badge**
- effectiveness score on program card (e.g., "4.2/5 effectiveness")
- on program detail: verified effectiveness section with ratings and sample feedback

---

## 6. Feature D: Annual Training Plan Builder

### 6.D.1 Backend — Annual Plan Service

#### API Endpoints

**POST /api/training-plans**
```
Role: employer

Request Body:
{
  year: number,
  total_budget: number,
  departments: [
    {
      name: "Sales",
      headcount: 20,
      skill_gaps: ["Negotiation", "Closing"],
      budget_allocation: 15000
    }
  ]
}
```

**POST /api/training-plans/:plan_id/generate-ai**
```
Role: employer (owner)

Process:
1. Get plan parameters (departments, budget, skill gaps)
2. Get employer profile (industry, interests)
3. Call AI to generate suggested plan:
   - match programs to department skill gaps
   - distribute across quarters
   - fit within budget
   - consider levy balance
4. Return structured plan

Response:
{
  suggested_items: [
    {
      quarter: "Q1",
      department: "Sales",
      program: { program_id, title, provider, fee },
      participants: 10,
      total_cost: 15000,
      reason: "Addresses negotiation skill gap for sales team"
    }
  ],
  total_estimated_cost: 45000,
  levy_coverage: "90% coverable by HRD Corp levy"
}
```

**PUT /api/training-plans/:plan_id/items**
```
Role: employer (owner)
Add, edit, or remove plan items
Employer adjusts the AI-generated plan
```

**GET /api/training-plans/:plan_id/progress**
```
Role: employer (owner)

Response:
{
  planned: 8 programs,
  completed: 3,
  in_progress: 1,
  upcoming: 4,
  completion_pct: 37.5,
  budget_spent: 18000,
  budget_remaining: 27000,
  on_track: true
}
```

**GET /api/training-plans/:plan_id/export**
```
Role: employer (owner)
Returns PDF report with full plan and progress
```

### 6.D.2 Web Frontend — Plan Builder

**Annual Plan Page (/employer/training-plan)**
```
┌─────────────────────────────────────────────────┐
│  Annual Training Plan 2027                       │
│  ─────────────────────────────────────────────  │
│  Budget: RM 50,000 | Spent: RM 18,000 (36%)    │
│  Programs: 3/8 completed | On Track ✅           │
│  ─────────────────────────────────────────────  │
│  Q1 (Jan-Mar):                                   │
│  ✅ Advanced Leadership (Sales, 10 pax, RM 15K)  │
│  🔄 Excel Training (Finance, 8 pax, RM 9.6K)    │
│                                                  │
│  Q2 (Apr-Jun):                                   │
│  📅 OSHA Safety (Operations, 20 pax, RM 10K)    │
│  📅 Digital Marketing (Marketing, 5 pax, RM 5K) │
│                                                  │
│  Q3-Q4: ...                                      │
│  ─────────────────────────────────────────────  │
│  [Add Training] [Generate AI Suggestions]        │
│  [Export PDF Report]                             │
└─────────────────────────────────────────────────┘
```

- timeline/kanban view of plan items by quarter
- drag and drop to reschedule
- link plan items to actual programs on platform
- progress tracking (planned → booked → completed)
- budget burn-down chart

---

## 7. Acceptance Criteria

### Competitive Bidding
- [ ] AI value score accurately ranks proposals
- [ ] Proposal count visible to providers
- [ ] Value-add structured input works
- [ ] Award badges display on provider profiles
- [ ] Comparison radar chart renders correctly

### Group Training Pool
- [ ] Pool detection identifies overlapping needs
- [ ] Employers can join and leave pools
- [ ] Pool confirms when minimum participants met
- [ ] TPs can submit group offers for confirmed pools
- [ ] Estimated savings display correctly

### Effectiveness Tracking
- [ ] Employer can set up tracking with KPIs
- [ ] Automated surveys sent at 30/60/90 days
- [ ] Survey responses stored and effectiveness score updated
- [ ] Effectiveness score visible on program cards and detail
- [ ] Effectiveness data feeds into AI ranking

### Annual Plan Builder
- [ ] Employer can create plan with departments and budget
- [ ] AI generates suggested plan based on skill gaps
- [ ] Employer can adjust plan items
- [ ] Progress tracking shows completion vs planned
- [ ] PDF export generates correctly

---

## 8. Estimated Effort

| Task | Effort |
|------|--------|
| Competitive Bidding: backend enhancements | 2-3 days |
| Competitive Bidding: web enhancements | 2-3 days |
| Group Pool: detection engine and backend | 3-4 days |
| Group Pool: web pages | 2-3 days |
| Effectiveness: backend and survey system | 3-4 days |
| Effectiveness: web dashboard | 2-3 days |
| Annual Plan: backend and AI generation | 3-4 days |
| Annual Plan: web builder interface | 3-4 days |
| Mobile updates for all features | 2-3 days |
| Testing | 3-4 days |
| **Total** | **25-35 days** |

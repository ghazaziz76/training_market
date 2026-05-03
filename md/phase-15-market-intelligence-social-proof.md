# Phase 15: Market Intelligence, Social Proof, and Smart Calendar — Detailed Development Plan

## 1. Objective

Deploy training market intelligence dashboards, social proof indicators, and the smart training calendar. These features make the platform the authoritative source for Malaysian training market data and make scheduling effortless.

---

## 2. Prerequisites

- Phase 12 completed (analytics pipeline with sufficient aggregated data)
- Phase 14 completed (effectiveness data flowing)
- Sufficient platform usage data for meaningful intelligence

---

## 3. Feature A: Training Market Intelligence

### 3.A.1 Backend — Market Intelligence Service

#### Intelligence Data Pipeline

**Weekly Intelligence Aggregation Job**
```typescript
async function generateMarketIntelligence() {
  // 1. Trending Skills Analysis
  //    - aggregate search queries by skill/topic
  //    - compare with previous period
  //    - identify rising and declining trends
  //    - break down by industry

  // 2. Industry Training Patterns
  //    - aggregate training activity by employer industry
  //    - average spend per employee by industry
  //    - most popular categories per industry
  //    - training frequency by industry

  // 3. Supply-Demand Gap Analysis
  //    - topics with high search volume but few programs
  //    - topics with many programs but low engagement
  //    - broadcast requests with few or no proposals

  // 4. Pricing Benchmarks
  //    - average fee by category
  //    - average fee by delivery mode
  //    - fee range per category
  //    - pricing trends over time

  // 5. Regional Patterns
  //    - training demand by state
  //    - delivery mode preference by region
  //    - top categories by state

  // Store results in market_intelligence_reports table
}
```

**Table: market_intelligence_reports**
```sql
CREATE TABLE market_intelligence_reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type VARCHAR(50) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_intelligence_type ON market_intelligence_reports(report_type);
CREATE INDEX idx_intelligence_period ON market_intelligence_reports(period_start);
```

#### API Endpoints

**GET /api/intelligence/employer/dashboard**
```
Role: employer

Response:
{
  your_industry: "Manufacturing",
  trending_skills: [
    { skill: "Lean Manufacturing", trend: "rising", searches_this_month: 450 },
    { skill: "Industry 4.0", trend: "rising", searches_this_month: 320 },
    { skill: "OSHA Safety", trend: "stable", searches_this_month: 280 }
  ],
  industry_benchmark: {
    average_training_spend_per_employee: 2500,
    your_spend_per_employee: 1800,
    comparison: "28% below industry average",
    average_training_coverage: 65,
    your_coverage: 40
  },
  popular_in_your_industry: [
    { category: "Safety and Compliance", enrollment_count: 320 },
    { category: "Manufacturing and Operations", enrollment_count: 280 }
  ],
  companies_like_yours: {
    average_programs_per_year: 8,
    your_programs_this_year: 3,
    top_training_areas: ["Safety", "Lean", "Leadership"]
  }
}
```

**GET /api/intelligence/provider/dashboard**
```
Role: provider

Response:
{
  opportunity_gaps: [
    {
      topic: "ESG Training",
      demand_signals: 150,
      current_supply: 3,
      opportunity: "high",
      note: "150 searches last month but only 3 programs available"
    },
    {
      topic: "AI for Business",
      demand_signals: 120,
      current_supply: 5,
      opportunity: "high"
    }
  ],
  your_categories: [
    {
      category: "Leadership",
      your_average_fee: 1500,
      market_average_fee: 1350,
      comparison: "11% above market average",
      your_enquiry_rate: 4.5,
      market_average_enquiry_rate: 3.2
    }
  ],
  pricing_benchmarks: [
    {
      category: "Leadership",
      min_fee: 500,
      average_fee: 1350,
      max_fee: 3000,
      your_fee: 1500,
      position: "above_average"
    }
  ],
  regional_demand: [
    { state: "Kuala Lumpur", searches: 2500, your_programs_here: 5 },
    { state: "Selangor", searches: 1800, your_programs_here: 2 },
    { state: "Johor", searches: 900, your_programs_here: 0, note: "No coverage" }
  ]
}
```

**GET /api/intelligence/trending-skills**
```
Public endpoint (limited data for non-authenticated)

Response:
{
  data: [
    { skill: "AI and Machine Learning", trend: "rising", change_pct: 45 },
    { skill: "Cybersecurity", trend: "rising", change_pct: 32 },
    { skill: "ESG Compliance", trend: "rising", change_pct: 28 }
  ]
}
```

### 3.A.2 Web Frontend — Intelligence Dashboards

**Employer Intelligence Page (/employer/intelligence)**
```
┌─────────────────────────────────────────────────┐
│  Training Market Intelligence                    │
│  Your Industry: Manufacturing                    │
│  ─────────────────────────────────────────────  │
│  Trending Skills in Manufacturing:               │
│  📈 Lean Manufacturing (+45%)                    │
│  📈 Industry 4.0 (+32%)                          │
│  ➡️ OSHA Safety (stable)                         │
│  📉 Basic Excel (-15%)                           │
│  ─────────────────────────────────────────────  │
│  How You Compare:                                │
│  Training Spend/Employee: RM 1,800               │
│  Industry Average: RM 2,500                      │
│  ██████████░░░░░ You are 28% below average       │
│  ─────────────────────────────────────────────  │
│  Companies in Manufacturing are training:        │
│  1. Safety and Compliance (320 enrollments)       │
│  2. Manufacturing Operations (280)                │
│  3. Leadership (200)                              │
│  ─────────────────────────────────────────────  │
│  Similar companies train 8 programs/year.         │
│  You have completed 3 this year.                 │
└─────────────────────────────────────────────────┘
```

**Provider Intelligence Page (/provider/intelligence)**
- opportunity gaps with demand signals
- pricing benchmarks with visual position indicators
- regional demand heatmap
- recommendations: "Consider offering ESG Training — high demand, low supply"

---

## 4. Feature B: Social Proof

### 4.B.1 Backend — Social Proof Data

#### Social Proof Endpoints

**GET /api/programs/:id/social-proof**
```
Public endpoint

Response:
{
  enrollment_count_industry: {
    label: "12 companies in Manufacturing enrolled",
    count: 12,
    industry: "Manufacturing"
  },
  recent_activity: {
    label: "5 employers enquired this week",
    count: 5
  },
  verified_rating: {
    average: 4.5,
    count: 23,
    label: "Rated 4.5 by 23 verified participants"
  },
  effectiveness_badge: {
    score: 4.2,
    label: "4.2/5 effectiveness rating"
  }
}
```

**GET /api/storefront/social-feed**
```
Public endpoint (anonymized)

Response:
{
  data: [
    { type: "enrollment", message: "A company in Manufacturing just enrolled in OSHA Safety", time: "2 hours ago" },
    { type: "enquiry", message: "3 companies enquired about Leadership training today", time: "4 hours ago" },
    { type: "broadcast", message: "A new training request was posted for Data Analytics", time: "6 hours ago" }
  ]
}
```

### 4.B.2 Web Frontend — Social Proof Display

**Program Card Social Proof**
- subtle text below card: "12 companies in your industry enrolled"
- or: "Enquired by 5 employers this week"

**Program Detail Social Proof Section**
```
┌─────────────────────────────────────────────────┐
│  What Others Are Saying                          │
│  ─────────────────────────────────────────────  │
│  ★ 4.5 average from 23 verified participants     │
│  ─────────────────────────────────────────────  │
│  ✅ 87% would recommend this training            │
│  📊 4.2/5 effectiveness rating                   │
│  🏢 12 companies in Manufacturing enrolled       │
│  ─────────────────────────────────────────────  │
│  Recent Feedback:                                │
│  "Excellent program, our team productivity       │
│  improved significantly" — Manufacturing, KL     │
│  ─────────────────────────────────────────────  │
│  💡 Companies like yours commonly pair this with:│
│  [Related Program Card] [Related Program Card]   │
└─────────────────────────────────────────────────┘
```

**Storefront Activity Feed**
- subtle scrolling ticker or section on storefront
- anonymized recent activity
- creates feeling of active, living marketplace

---

## 5. Feature C: Smart Training Calendar

### 5.C.1 Backend — Smart Calendar Service

#### API Endpoints

**GET /api/calendar/sessions**
```
Role: employer

Query Params:
- month: number
- year: number
- category_id: UUID (optional)
- delivery_mode: string (optional)
- state: string (optional)

Response:
{
  data: [
    {
      schedule_id,
      program: { program_id, title, provider_name, delivery_mode },
      start_date, end_date,
      venue_or_platform,
      available_seats,
      fee_per_pax,
      hrd_corp_claimable: boolean
    }
  ]
}
```

**GET /api/calendar/my-enrollments**
```
Role: employer

Returns all booked/planned training for employer's team

Response:
{
  data: [
    {
      schedule_id,
      program_title,
      provider,
      start_date, end_date,
      participants: [{ name, email }],
      status: "booked" | "completed" | "cancelled"
    }
  ]
}
```

**POST /api/calendar/check-conflicts**
```
Role: employer

Request Body:
{
  employee_ids: UUID[],
  proposed_start_date: date,
  proposed_end_date: date
}

Response:
{
  conflicts: [
    {
      employee: { name },
      existing_training: { title, start_date, end_date },
      conflict_type: "overlap" | "same_week"
    }
  ],
  recommendation: "2 employees have conflicts. Consider scheduling for the following week."
}
```

**GET /api/calendar/optimal-timing**
```
Role: employer

Query Params: month_range (e.g., "3" for next 3 months)

Response:
{
  optimal_weeks: [
    { week_start: "2027-03-10", reason: "No existing training scheduled, off-peak period" },
    { week_start: "2027-03-24", reason: "Only 1 employee has training, minimal disruption" }
  ],
  busy_periods: [
    { week_start: "2027-03-17", reason: "3 training programs already scheduled" }
  ],
  peak_warning: "March is a popular training month. Book early."
}
```

**GET /api/calendar/export**
```
Role: employer
Format: ical

Returns .ics file with all employer training dates
Compatible with Google Calendar, Outlook, Apple Calendar
```

### 5.C.2 Web Frontend — Smart Calendar

**Calendar Page (/employer/calendar)**
```
┌─────────────────────────────────────────────────┐
│  Training Calendar              [Month ▼] [Export]│
│  ─────────────────────────────────────────────  │
│  ┌───┬───┬───┬───┬───┬───┬───┐                 │
│  │Mon│Tue│Wed│Thu│Fri│Sat│Sun│                 │
│  ├───┼───┼───┼───┼───┼───┼───┤                 │
│  │   │   │   │1  │2  │3  │4  │                 │
│  │   │   │   │   │   │   │   │                 │
│  ├───┼───┼───┼───┼───┼───┼───┤                 │
│  │5  │6  │7  │8  │9  │10 │11 │                 │
│  │   │🔵 │🔵 │🔵 │   │   │   │                 │
│  │   │Lead│ersh│ip │   │   │   │                 │
│  ├───┼───┼───┼───┼───┼───┼───┤                 │
│  │12 │13 │14 │15 │16 │17 │18 │                 │
│  │   │   │   │🟢 │🟢 │   │   │                 │
│  │   │   │   │Exc│el │   │   │                 │
│  └───┴───┴───┴───┴───┴───┴───┘                 │
│  🔵 Your team's training                         │
│  🟢 Available sessions (matching your interests) │
│  🟡 Recommended timing                           │
│  ─────────────────────────────────────────────  │
│  Available Sessions This Month:                  │
│  [Session list with program details]             │
│  ─────────────────────────────────────────────  │
│  Scheduling Tips:                                │
│  💡 Week of March 10 is ideal — no conflicts     │
│  ⚠️ Week of March 17 — 3 programs already booked │
└─────────────────────────────────────────────────┘
```

- monthly calendar view with color-coded events
- employer's booked training in blue
- available sessions in green
- click day to see available sessions
- conflict detection when considering a program
- optimal timing suggestions sidebar
- export to .ics for calendar sync

---

## 6. Acceptance Criteria

### Market Intelligence
- [ ] Trending skills calculated correctly from search data
- [ ] Industry benchmarks show meaningful comparisons
- [ ] Provider opportunity gaps identify real demand-supply mismatches
- [ ] Pricing benchmarks are accurate
- [ ] All data is anonymized (no identifiable employer/provider info in aggregates)
- [ ] Intelligence refreshes weekly

### Social Proof
- [ ] Enrollment counts show on program cards (anonymized)
- [ ] Verified ratings display correctly
- [ ] Effectiveness badge shows for tracked programs
- [ ] Activity feed shows anonymized recent platform activity
- [ ] Social proof data is genuinely anonymized

### Smart Calendar
- [ ] Calendar shows employer's booked training
- [ ] Calendar shows available sessions across providers
- [ ] Conflict detection identifies scheduling overlaps
- [ ] Optimal timing suggestions are actionable
- [ ] .ics export works with Google Calendar and Outlook
- [ ] Over-training alert triggers correctly

---

## 7. Estimated Effort

| Task | Effort |
|------|--------|
| Intelligence: data pipeline and aggregation | 3-4 days |
| Intelligence: API endpoints | 2-3 days |
| Intelligence: employer dashboard | 2-3 days |
| Intelligence: provider dashboard | 2-3 days |
| Social proof: backend and API | 2 days |
| Social proof: frontend integration | 2 days |
| Smart calendar: backend service | 3-4 days |
| Smart calendar: conflict and timing APIs | 2 days |
| Smart calendar: web calendar view | 3-4 days |
| Smart calendar: .ics export | 1 day |
| Mobile updates | 2 days |
| Testing | 3-4 days |
| **Total** | **25-33 days** |

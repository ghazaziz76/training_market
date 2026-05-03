# Phase 12: Analytics and Reporting — Detailed Development Plan

## 1. Objective

Implement analytics dashboards for training providers (program performance, enquiry metrics) and admin (platform-wide metrics, trends, revenue). Build the data pipeline to track, aggregate, and visualize key business metrics.

---

## 2. Prerequisites

- Phases 1-11 completed (all core features with user_activities, enquiries, proposals, subscriptions data flowing)
- Sufficient usage data to display meaningful analytics

---

## 3. Detailed Tasks

### 3.1 Backend — Analytics Data Pipeline

#### 3.1.1 Analytics Aggregation Tables

**Table: daily_program_stats**
```sql
CREATE TABLE daily_program_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES training_programs(program_id),
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    unique_views INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    enquiries INTEGER DEFAULT 0,
    search_appearances INTEGER DEFAULT 0,
    recommendation_appearances INTEGER DEFAULT 0,
    clicks_from_search INTEGER DEFAULT 0,
    clicks_from_recommendation INTEGER DEFAULT 0,
    UNIQUE(program_id, date)
);

CREATE INDEX idx_daily_program_stats_date ON daily_program_stats(date);
CREATE INDEX idx_daily_program_stats_program ON daily_program_stats(program_id);
```

**Table: daily_provider_stats**
```sql
CREATE TABLE daily_provider_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES training_providers(provider_id),
    date DATE NOT NULL,
    total_views INTEGER DEFAULT 0,
    total_enquiries INTEGER DEFAULT 0,
    total_proposals_submitted INTEGER DEFAULT 0,
    proposals_shortlisted INTEGER DEFAULT 0,
    proposals_selected INTEGER DEFAULT 0,
    average_response_hours DECIMAL(8,2),
    UNIQUE(provider_id, date)
);
```

**Table: daily_platform_stats**
```sql
CREATE TABLE daily_platform_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    total_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_searches INTEGER DEFAULT 0,
    total_program_views INTEGER DEFAULT 0,
    total_enquiries INTEGER DEFAULT 0,
    total_broadcast_requests INTEGER DEFAULT 0,
    total_proposals INTEGER DEFAULT 0,
    total_active_subscriptions INTEGER DEFAULT 0,
    daily_revenue DECIMAL(12,2) DEFAULT 0
);
```

#### 3.1.2 Aggregation Background Jobs

**Daily Stats Aggregator (runs at 1:00 AM)**
```typescript
// jobs/daily-stats-aggregator.job.ts

async function aggregateDailyStats(date: Date) {
  // 1. Aggregate program stats from user_activities
  const programStats = await db.$queryRaw`
    SELECT
      target_id as program_id,
      COUNT(*) FILTER (WHERE activity_type = 'view_program') as views,
      COUNT(DISTINCT user_id) FILTER (WHERE activity_type = 'view_program') as unique_views,
      COUNT(*) FILTER (WHERE activity_type = 'save_program') as saves,
      COUNT(*) FILTER (WHERE activity_type = 'enquire') as enquiries
    FROM user_activities
    WHERE DATE(created_at) = ${date}
    AND target_type = 'program'
    GROUP BY target_id
  `;

  // 2. Upsert daily_program_stats

  // 3. Aggregate provider stats

  // 4. Aggregate platform stats
  //    - count users, new users, active users
  //    - count searches from search_history
  //    - count enquiries, broadcasts, proposals
  //    - sum revenue from payment_transactions

  // 5. Upsert daily_provider_stats and daily_platform_stats
}
```

**Search Trend Aggregator (runs hourly)**
```typescript
// Aggregates search query frequencies for trending topics
// Stored in Redis for real-time access
// Top 50 search terms in last 7 days
```

#### 3.1.3 Analytics API Endpoints

**GET /api/analytics/provider/overview**
```
Role: provider

Query Params: period ("7d" | "30d" | "90d" | "12m")

Response 200:
{
  summary: {
    total_views: number,
    total_enquiries: number,
    total_proposals_submitted: number,
    proposals_won: number,
    average_response_hours: number,
    conversion_rate: number (enquiries / views %)
  },
  trends: {
    views: [{ date, value }],
    enquiries: [{ date, value }],
    proposals: [{ date, value }]
  },
  comparison: {
    views_change_pct: number (vs previous period),
    enquiries_change_pct: number,
    conversion_change_pct: number
  }
}
```

**GET /api/analytics/provider/programs**
```
Role: provider

Query Params: period, sort_by (views, enquiries, conversion), limit

Response:
{
  data: [
    {
      program_id, title,
      views, unique_views, saves, enquiries,
      search_appearances, recommendation_appearances,
      click_through_rate, conversion_rate
    }
  ]
}
```

**GET /api/analytics/provider/programs/:program_id**
```
Role: provider (owner)

Response: detailed daily stats for a specific program over selected period
```

**GET /api/analytics/provider/enquiries**
```
Role: provider

Response:
{
  total: number,
  by_type: { general: n, quotation: n, enrolment: n, custom: n },
  by_status: { sent: n, read: n, replied: n, closed: n },
  response_time: { average_hours: n, median_hours: n },
  trends: [{ date, count }]
}
```

**GET /api/analytics/provider/proposals**
```
Role: provider

Response:
{
  total_submitted: number,
  shortlisted: number,
  selected: number,
  rejected: number,
  win_rate: number,
  average_proposed_fee: number,
  trends: [{ date, submitted, won }]
}
```

**GET /api/analytics/admin/overview**
```
Role: admin
Query Params: period

Response:
{
  users: {
    total, new_this_period, growth_rate,
    by_role: { employer: n, individual: n, provider: n },
    trends: [{ date, new_users, active_users }]
  },
  programs: {
    total_published, new_this_period, by_category: [{name, count}],
    pending_review: number
  },
  engagement: {
    total_searches, total_views, total_enquiries,
    total_broadcasts, total_proposals,
    conversion_funnel: {
      searches: n, views: n, saves: n, enquiries: n, proposals: n
    }
  },
  revenue: {
    total_this_period, growth_rate,
    by_plan: [{ plan_name, count, revenue }],
    trends: [{ date, revenue }],
    mrr: number (monthly recurring revenue)
  },
  ai: {
    total_matches, average_score, recommendation_ctr,
    api_cost: number
  }
}
```

**GET /api/analytics/admin/search-trends**
```
Role: admin

Response:
{
  top_queries: [{ query, count, trend: "up" | "down" | "stable" }],
  top_categories: [{ category, searches }],
  searches_with_no_results: [{ query, count }]
}
```

**GET /api/analytics/admin/export**
```
Role: admin
Query Params: report_type ("users" | "programs" | "revenue" | "engagement"), period, format ("csv" | "xlsx")

Process: generate report file, return download URL
```

---

### 3.2 Web Frontend — Provider Analytics Dashboard

#### 3.2.1 Provider Analytics Overview (/provider/analytics)
```
┌─────────────────────────────────────────────────┐
│  Analytics Dashboard          Period: [Last 30d ▼]│
│  ─────────────────────────────────────────────  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────┐│
│  │ Views    │ │ Enquiries│ │ Convert  │ │ Won │ │
│  │ 1,245    │ │ 45       │ │ 3.6%     │ │ 3   │ │
│  │ ↑ 12%    │ │ ↑ 8%     │ │ ↑ 0.5%   │ │ ↑ 2 │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────┘│
│  ─────────────────────────────────────────────  │
│  Views and Enquiries Over Time (line chart)      │
│  [Views line] [Enquiries line]                   │
│  ─────────────────────────────────────────────  │
│  Top Performing Programs:                        │
│  ┌────┬──────────────────┬──────┬─────┬───────┐ │
│  │ #  │ Program          │ Views│ Enq │ Conv% │ │
│  ├────┼──────────────────┼──────┼─────┼───────┤ │
│  │ 1  │ Advanced Excel    │ 320  │ 15  │ 4.7% │ │
│  │ 2  │ Leadership Skills  │ 280  │ 12  │ 4.3% │ │
│  │ 3  │ OSHA Safety        │ 210  │ 8   │ 3.8% │ │
│  └────┴──────────────────┴──────┴─────┴───────┘ │
│  ─────────────────────────────────────────────  │
│  Enquiry Breakdown:                              │
│  [Pie chart: by type] [Bar chart: by status]     │
│  ─────────────────────────────────────────────  │
│  Response Performance:                           │
│  Average Response Time: 4.2 hours                │
│  Response Rate: 92%                              │
│  ─────────────────────────────────────────────  │
│  Proposal Performance:                           │
│  Submitted: 12 | Won: 3 | Win Rate: 25%         │
└─────────────────────────────────────────────────┘
```

- period selector: 7d, 30d, 90d, 12 months
- stat cards with trend comparison vs previous period
- line chart for views and enquiries over time
- top programs table with sortable columns
- enquiry breakdown charts
- proposal performance stats

#### 3.2.2 Program Analytics Detail (/provider/analytics/programs/:id)
- daily views and enquiries chart for single program
- search appearance vs click-through rate
- recommendation appearance vs click-through rate
- enquiry sources breakdown
- comparison with provider's other programs

---

### 3.3 Web Frontend — Admin Analytics Dashboard

#### 3.3.1 Admin Analytics Overview (/admin/analytics)
- user growth chart (line, stacked by role)
- revenue trend chart (bar)
- engagement funnel (searches → views → saves → enquiries)
- platform KPIs cards
- conversion metrics

#### 3.3.2 Search Trends (/admin/analytics/search-trends)
- top search queries table with trend arrows
- "searches with no results" list (opportunity detection)
- category popularity chart
- search volume over time

#### 3.3.3 Export Reports
- button to export each report section
- CSV and Excel format options
- date range selection

---

## 4. Acceptance Criteria

- [ ] Daily aggregation job runs correctly and populates stats tables
- [ ] Provider analytics dashboard shows accurate metrics
- [ ] Period selector changes data across all charts and stats
- [ ] Trend comparison (vs previous period) calculates correctly
- [ ] Top programs table sorts correctly
- [ ] Line and bar charts render correctly with real data
- [ ] Admin analytics show platform-wide accurate metrics
- [ ] Search trends display correctly
- [ ] Export generates correct CSV/Excel files
- [ ] Analytics handle edge cases (new provider with no data, zero values)

---

## 5. Estimated Effort

| Task | Effort |
|------|--------|
| Analytics tables and aggregation jobs | 2-3 days |
| Provider analytics API endpoints | 2-3 days |
| Admin analytics API endpoints | 2-3 days |
| Export report generation | 1-2 days |
| Web: Provider analytics dashboard | 3-4 days |
| Web: Program analytics detail | 1-2 days |
| Web: Admin analytics dashboard | 3-4 days |
| Web: Charts integration (Recharts/Chart.js) | 1-2 days |
| Testing | 2 days |
| **Total** | **16-23 days** |

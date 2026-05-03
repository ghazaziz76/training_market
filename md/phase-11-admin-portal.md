# Phase 11: Admin Portal — Detailed Development Plan

## 1. Objective

Build a comprehensive admin portal for platform management including user management, program moderation, storefront content management, taxonomy management, subscription oversight, broadcast moderation, and platform health monitoring.

---

## 2. Prerequisites

- Phases 1-10 completed (all core features built)
- Admin user role and RBAC configured in Phase 2
- All backend services have admin endpoints defined in prior phases

---

## 3. Detailed Tasks

### 3.1 Backend — Admin Service (Consolidated)

Most admin endpoints are already defined in prior phases. This phase consolidates them and adds missing admin-specific functionality.

#### 3.1.1 Admin Dashboard Stats Endpoint

**GET /api/admin/dashboard/stats**
```
Role: admin

Response 200:
{
  users: {
    total: number,
    employers: number,
    individuals: number,
    providers: number,
    new_this_month: number,
    growth_pct: number (vs last month)
  },
  programs: {
    total_published: number,
    pending_review: number,
    total_categories: number,
    new_this_month: number
  },
  subscriptions: {
    total_active: number,
    revenue_this_month: number,
    revenue_this_year: number,
    expiring_soon: number (next 30 days),
    churn_rate: number
  },
  activity: {
    total_enquiries_this_month: number,
    total_broadcasts_this_month: number,
    total_proposals_this_month: number,
    total_searches_this_month: number
  },
  ai: {
    total_matches_this_month: number,
    average_match_score: number,
    api_cost_this_month: number
  }
}

Cached in Redis, refreshed every 15 minutes
```

#### 3.1.2 Admin Activity Log

**Table: admin_audit_logs**
```sql
CREATE TABLE admin_audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES users(user_id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_admin ON admin_audit_logs(admin_user_id);
CREATE INDEX idx_audit_action ON admin_audit_logs(action);
CREATE INDEX idx_audit_created ON admin_audit_logs(created_at);
```

**GET /api/admin/audit-logs**
```
Role: admin
Query Params: admin_user_id, action, target_type, date_from, date_to, page, limit

Returns audit log entries with admin user info
```

All admin actions should log to this table:
- user status change (activate, suspend)
- provider verification
- program approval/rejection
- subscription manual change
- taxonomy changes
- storefront content changes
- guidance rule changes

#### 3.1.3 Platform Health Endpoint

**GET /api/admin/health**
```
Role: admin

Response:
{
  database: { status: "healthy", response_time_ms: 5 },
  redis: { status: "healthy", response_time_ms: 2, memory_usage: "45MB" },
  ai_api: { status: "healthy", quota_remaining: "85%" },
  email_service: { status: "healthy" },
  storage: { status: "healthy", usage: "2.3GB" },
  queues: {
    email: { waiting: 0, active: 0, failed: 0 },
    push: { waiting: 3, active: 1, failed: 0 },
    embedding: { waiting: 0, active: 0, failed: 0 }
  },
  uptime: "15d 4h 32m"
}
```

---

### 3.2 Web Frontend — Admin Dashboard

#### 3.2.1 Admin Layout
```
┌──────────────────────────────────────────────────┐
│  Training Market Admin    [Notifications] [Profile]│
├───────────────┬──────────────────────────────────┤
│  Sidebar      │  Main Content Area                │
│               │                                   │
│  📊 Dashboard │                                   │
│  👥 Users     │                                   │
│  🏢 Providers │                                   │
│  📚 Programs  │                                   │
│  🏪 Storefront│                                   │
│  📢 Broadcasts│                                   │
│  🏷️ Taxonomy  │                                   │
│  💳 Billing   │                                   │
│  🏛️ HRD Corp  │                                   │
│  🤖 AI        │                                   │
│  📈 Analytics │                                   │
│  📋 Audit Log │                                   │
│  ⚙️ Settings  │                                   │
│  🏥 Health    │                                   │
└───────────────┴──────────────────────────────────┘
```

#### 3.2.2 Dashboard Home (/admin)
```
┌─────────────────────────────────────────────────┐
│  Dashboard                                       │
│  ─────────────────────────────────────────────  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────┐│
│  │ Users    │ │ Programs │ │ Revenue  │ │Act │ │
│  │ 1,250    │ │ 345      │ │ RM 45K   │ │152 ││
│  │ +12%     │ │ 8 pending│ │ this mo  │ │enq ││
│  └──────────┘ └──────────┘ └──────────┘ └────┘│
│  ─────────────────────────────────────────────  │
│  User Growth (line chart - last 6 months)        │
│  ─────────────────────────────────────────────  │
│  Revenue Trend (bar chart - last 12 months)      │
│  ─────────────────────────────────────────────  │
│  Quick Actions:                                  │
│  [8 Programs Pending Review]                     │
│  [3 Providers Pending Verification]              │
│  [2 Subscriptions Expiring This Week]            │
│  ─────────────────────────────────────────────  │
│  Recent Activity:                                │
│  - New provider registered: XYZ Training (2h ago)│
│  - Program submitted for review: Excel Adv (3h) │
│  - New broadcast request: Sales Training (5h)    │
└─────────────────────────────────────────────────┘
```

- stat cards with trend indicators
- quick action alerts for items needing attention
- charts using Chart.js or Recharts

#### 3.2.3 User Management (/admin/users)
Already defined in Phase 2. Full implementation:
- user list table with sort, filter, search, pagination
- user detail page with profile, activity, actions
- bulk actions: activate, suspend (with confirmation)
- export user list as CSV

#### 3.2.4 Provider Management (/admin/providers)
- provider list with quality tier, subscription status, program count, verification status
- provider detail page with full profile, programs, enquiry stats, subscription info
- verification queue with approve/reject workflow
- quality tier override (admin can manually adjust)
- filters: tier, verification status, subscription status, search

#### 3.2.5 Program Moderation (/admin/programs)
Already defined in Phase 3. Full implementation:
- pending review queue (sorted by submission date)
- all programs list with status filters
- program review page with full preview
- approve/reject with notes
- bulk approve
- search and filter by category, provider, status

#### 3.2.6 Storefront Content Management (/admin/storefront)
```
┌─────────────────────────────────────────────────┐
│  Storefront Management                           │
│  ─────────────────────────────────────────────  │
│  [Hero Banners] [Featured Programs] [Spotlights] │
│  ─────────────────────────────────────────────  │
│  Hero Banners:                                   │
│  ┌────┬────────────────┬─────────┬──────┬─────┐ │
│  │ #  │ Title          │ Dates   │ Rank │ Act │ │
│  ├────┼────────────────┼─────────┼──────┼─────┤ │
│  │ 1  │ New Year Sale   │ Jan 1-31│ 1    │ ✏️🗑│ │
│  │ 2  │ IT Training Wk  │ Feb 1-7 │ 2    │ ✏️🗑│ │
│  └────┴────────────────┴─────────┴──────┴─────┘ │
│  [+ Add Hero Banner]                             │
│  ─────────────────────────────────────────────  │
│  Featured Programs:                              │
│  (same table format)                             │
│  [+ Add Featured Program]                        │
└─────────────────────────────────────────────────┘
```

- CRUD for hero banners (title, description, image upload, link, date range, priority)
- CRUD for featured programs (select program, date range, priority)
- CRUD for provider spotlights (select provider, date range)
- drag and drop reordering for priority
- preview how storefront will look

#### 3.2.7 Broadcast Moderation (/admin/broadcasts)
- list of all broadcast requests
- filter by status
- ability to close inappropriate requests
- view proposals per request
- flag system for reported content

#### 3.2.8 Taxonomy Management (/admin/taxonomy)
```
┌─────────────────────────────────────────────────┐
│  Categories and Skills                           │
│  ─────────────────────────────────────────────  │
│  [Categories] [Skill Tags]                       │
│  ─────────────────────────────────────────────  │
│  Categories:                                     │
│  ▼ Technology and IT (45 programs)               │
│    ├── Software Development (12)                 │
│    ├── Cybersecurity (8)                         │
│    ├── Cloud Computing (6)                       │
│    └── [+ Add Subcategory]                       │
│  ▼ Leadership and Management (38 programs)       │
│    ├── Strategic Leadership (15)                 │
│    └── ...                                       │
│  [+ Add Category]                                │
│  ─────────────────────────────────────────────  │
│  Edit Category:                                  │
│  Name: [________________]                        │
│  Icon: [Select icon ▼]                           │
│  Status: [Active ▼]                              │
│  [Save] [Delete]                                 │
└─────────────────────────────────────────────────┘
```

- hierarchical category tree view
- add, edit, delete categories and subcategories
- program count per category
- skill tags CRUD with search
- merge duplicate tags
- cannot delete category with active programs (warning)

#### 3.2.9 Billing Management (/admin/billing)
Already defined in Phase 8. Implementation:
- subscription overview with total active, revenue stats
- subscription list with filters
- individual subscription detail with manual actions
- plan management (CRUD for subscription plans)
- revenue charts (monthly, by plan)
- export billing data as CSV

#### 3.2.10 HRD Corp Rules Management (/admin/hrd-corp)
Already defined in Phase 7. Implementation:
- list of guidance rules (schemes)
- rule editor with eligibility, documents, steps, links
- preview employer view
- activate/deactivate rules

#### 3.2.11 AI Management (/admin/ai)
```
┌─────────────────────────────────────────────────┐
│  AI Management                                   │
│  ─────────────────────────────────────────────  │
│  Status: ● Online                                │
│  API Provider: OpenAI                            │
│  Monthly Cost: RM 1,250                          │
│  Embeddings Generated: 345 programs              │
│  Programs Without Embeddings: 2                  │
│  ─────────────────────────────────────────────  │
│  [Re-generate All Embeddings]                    │
│  [Generate Missing Embeddings]                   │
│  ─────────────────────────────────────────────  │
│  Matching Performance:                           │
│  Average Match Score: 78/100                     │
│  Matches This Month: 2,450                       │
│  Click-through on Recommendations: 34%           │
│  Enquiry Rate on Matches: 12%                    │
└─────────────────────────────────────────────────┘
```

- AI service status
- cost tracking
- embedding management (regenerate, fill missing)
- matching performance stats
- error log

#### 3.2.12 Audit Log (/admin/audit-log)
- chronological list of all admin actions
- filter by admin user, action type, date range
- detail view per entry
- export as CSV

#### 3.2.13 Platform Health (/admin/health)
- service status indicators (green/red)
- database, Redis, AI API, email, storage status
- queue depths and failure counts
- response time metrics
- uptime indicator
- auto-refresh every 30 seconds

#### 3.2.14 Settings (/admin/settings)
- platform name and branding
- contact email
- terms and conditions URL
- privacy policy URL
- notification default settings
- maintenance mode toggle

---

## 4. Acceptance Criteria

- [ ] Admin dashboard shows accurate stats with trend indicators
- [ ] All user management functions work (list, filter, detail, suspend, activate)
- [ ] Provider verification workflow works end to end
- [ ] Program moderation queue shows pending programs correctly
- [ ] Program approve/reject with notification works
- [ ] Storefront content management creates and displays banners, featured programs, spotlights
- [ ] Taxonomy management allows full CRUD for categories and skill tags
- [ ] Billing overview shows accurate subscription and revenue data
- [ ] Admin can manage subscription plans
- [ ] HRD Corp rules management works
- [ ] AI management page shows status and performance
- [ ] Audit log captures all admin actions
- [ ] Platform health page shows real-time service status
- [ ] Admin portal is only accessible to admin role users
- [ ] All admin actions are logged

---

## 5. Estimated Effort

| Task | Effort |
|------|--------|
| Admin dashboard stats endpoint | 1-2 days |
| Audit log system | 1-2 days |
| Platform health endpoint | 1 day |
| Web: Admin layout and navigation | 1-2 days |
| Web: Dashboard home with charts | 2-3 days |
| Web: User management pages | 2-3 days |
| Web: Provider management pages | 2 days |
| Web: Program moderation pages | 2 days |
| Web: Storefront content management | 3-4 days |
| Web: Taxonomy management | 2-3 days |
| Web: Billing management | 2 days |
| Web: HRD Corp rules management | 1-2 days |
| Web: AI management page | 1-2 days |
| Web: Audit log page | 1 day |
| Web: Health and settings pages | 1 day |
| Testing | 2-3 days |
| **Total** | **22-30 days** |

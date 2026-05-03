# Phase 6: Training Request Broadcast and TP Proposals — Detailed Development Plan

## 1. Objective

Enable employers to broadcast training requests to all registered training providers, and enable providers to respond with competitive proposals including quotations, program details, and supporting documents. This creates a reverse marketplace where demand drives supply.

---

## 2. Prerequisites

- Phase 2 completed (auth and profiles)
- Phase 3 completed (TP program management)
- Phase 5 completed (enquiry system patterns reusable)

---

## 3. Detailed Tasks

### 3.1 Backend — Training Request Broadcast Service

#### 3.1.1 Create Broadcast Request

**POST /api/broadcast-requests**
```
Role: employer

Request Body:
{
  title: string (required, max 500),
  description: string (required, max 5000),
  target_audience: string (who needs the training),
  participant_count: number (required),
  preferred_mode: "online" | "physical" | "hybrid" | "any",
  preferred_location: string,
  preferred_dates: string,
  budget_min: number,
  budget_max: number,
  industry_context: string,
  target_skills: string[],
  response_deadline: date (required, must be at least 3 days in future)
}

Process:
1. Validate all fields
2. Create training_request_broadcasts record with status "open"
3. Trigger broadcast notification job (async via BullMQ):
   a. Fetch all active providers with active subscriptions
   b. Create in-app notification for each provider
   c. Send email notification to each provider
   d. AI: calculate relevance score per provider and include in notification
4. Return created request

Response 201:
{
  success: true,
  data: { request_id, title, status, response_deadline, created_at }
}
```

#### 3.1.2 List Broadcast Requests (Employer View)

**GET /api/broadcast-requests/my-requests**
```
Role: employer
Query Params: status, page, limit, sort_by

Response 200:
{
  data: [
    {
      request_id,
      title,
      participant_count,
      budget_range: "RM 5,000 - RM 10,000",
      response_deadline,
      total_proposals,
      status,
      created_at
    }
  ],
  pagination: { total, page, limit, total_pages }
}
```

#### 3.1.3 Get Broadcast Request Detail

**GET /api/broadcast-requests/:request_id**
```
Role: employer (owner) or provider (any active)

Response for employer:
{
  data: {
    request_id, title, description, target_audience, participant_count,
    preferred_mode, preferred_location, preferred_dates,
    budget_min, budget_max, industry_context, target_skills,
    response_deadline, total_proposals, status, created_at,
    proposals: [
      {
        proposal_id, provider: { provider_name, logo_url, quality_tier, average_rating },
        proposed_fee, proposed_schedule, status, ai_value_score,
        created_at
      }
    ] (sorted by ai_value_score DESC)
  }
}

Response for provider:
{
  data: {
    request_id, title, description, target_audience, participant_count,
    preferred_mode, preferred_location, preferred_dates,
    budget_min, budget_max, industry_context, target_skills,
    response_deadline, total_proposals, status, created_at,
    my_proposal: { ... } or null (provider's own proposal if submitted)
  }
}
```

#### 3.1.4 Update Broadcast Request

**PUT /api/broadcast-requests/:request_id**
```
Role: employer (owner)
Only allowed when status is "open" and no proposals received yet.

Request Body: partial update of request fields
```

#### 3.1.5 Close Broadcast Request

**PUT /api/broadcast-requests/:request_id/close**
```
Role: employer (owner)

Request Body:
{
  reason: string (optional)
}

Process:
1. Set status to "closed"
2. Notify all providers who submitted proposals
```

#### 3.1.6 List Broadcast Requests (Provider Feed)

**GET /api/broadcast-requests/feed**
```
Role: provider
Query Params:
- status: "open" (default, providers only see open requests)
- industry: string
- skill_topic: string
- min_budget: number
- max_budget: number
- preferred_mode: string
- location: string
- sort_by: "newest" | "deadline" | "relevance"
- page, limit

Process:
1. Return open requests that have not passed deadline
2. If sort_by "relevance", use AI relevance score for this provider
3. Indicate if provider has already submitted proposal

Response 200:
{
  data: [
    {
      request_id,
      title,
      description (truncated to 300 chars),
      employer: { company_name, industry, company_size },
      participant_count,
      preferred_mode,
      preferred_location,
      budget_range: "RM 5,000 - RM 10,000",
      target_skills,
      response_deadline,
      total_proposals,
      days_remaining: number,
      my_proposal_submitted: boolean,
      ai_relevance_score: number (0-100, how relevant this request is to provider's programs),
      created_at
    }
  ],
  pagination: { total, page, limit, total_pages }
}
```

#### 3.1.7 Background Jobs

**Broadcast Notification Job**
- triggered on new broadcast request creation
- fetches all active providers
- creates notifications in batch
- sends emails in batch (rate limited, e.g., 50 per second)
- calculates AI relevance per provider

**Request Expiry Job**
- runs daily at midnight
- finds requests past response_deadline with status "open"
- sets status to "expired"
- notifies employer

---

### 3.2 Backend — Proposal Service

#### 3.2.1 Submit Proposal

**POST /api/broadcast-requests/:request_id/proposals**
```
Role: provider
Content-Type: multipart/form-data

Request Body:
{
  program_id: UUID (optional, link to existing program),
  proposal_message: string (required, max 5000),
  proposed_fee: number (required),
  fee_breakdown: string,
  proposed_schedule: string (required),
  proposed_duration: string,
  trainer_details: string,
  value_add_offers: string,
  attachments: File[] (max 5 files, max 10MB each)
}

Process:
1. Verify request is still "open" and not past deadline
2. Verify provider hasn't already submitted (unique constraint)
3. Upload attachments to storage
4. Create tp_proposals record with status "submitted"
5. Calculate ai_value_score:
   - fee vs budget range fit
   - provider quality tier weight
   - provider response rate
   - provider average rating
   - program relevance (if linked to existing program)
   - value add offers weight
6. Increment request total_proposals
7. Notify employer of new proposal
8. Return created proposal

Response 201:
{
  success: true,
  data: { proposal_id, status, created_at }
}
```

#### 3.2.2 Update Proposal

**PUT /api/proposals/:proposal_id**
```
Role: provider (owner)
Only allowed when proposal status is "submitted" and request is still "open"

Request Body: partial update of proposal fields
Process: re-calculate ai_value_score
```

#### 3.2.3 Withdraw Proposal

**PUT /api/proposals/:proposal_id/withdraw**
```
Role: provider (owner)
Process:
1. Set status to "withdrawn"
2. Decrement request total_proposals
3. Notify employer
```

#### 3.2.4 Get Proposal Detail

**GET /api/proposals/:proposal_id**
```
Role: employer (request owner) or provider (proposal owner)

Response 200:
{
  data: {
    proposal_id,
    request: { request_id, title },
    provider: { provider_name, logo_url, quality_tier, average_rating, total_completed_programs, response_rate },
    program: { title, description, learning_outcomes, delivery_mode } (if linked),
    proposal_message,
    proposed_fee,
    fee_breakdown,
    proposed_schedule,
    proposed_duration,
    trainer_details,
    value_add_offers,
    attachments: [{ file_name, file_url, file_type, file_size }],
    ai_value_score,
    status,
    employer_notes,
    created_at
  }
}
```

#### 3.2.5 Employer Actions on Proposals

**PUT /api/proposals/:proposal_id/shortlist**
```
Role: employer (request owner)
Process: set status to "shortlisted", notify provider
```

**PUT /api/proposals/:proposal_id/select**
```
Role: employer (request owner)
Process:
1. Set proposal status to "selected"
2. Set request status to "awarded"
3. Set request awarded_provider_id
4. Notify selected provider (congratulations)
5. Notify all other submitted/shortlisted providers (not selected)
6. Award badge to provider (increment win count)
```

**PUT /api/proposals/:proposal_id/reject**
```
Role: employer (request owner)
Request Body: { reason: string (optional) }
Process: set status to "rejected", notify provider
```

#### 3.2.6 Provider Proposal History

**GET /api/proposals/my-proposals**
```
Role: provider
Query Params: status, page, limit

Response:
{
  data: [
    {
      proposal_id,
      request: { request_id, title, employer_company, participant_count, budget_range },
      proposed_fee,
      status,
      ai_value_score,
      created_at
    }
  ],
  stats: {
    total_submitted: number,
    shortlisted: number,
    selected: number,
    rejected: number,
    win_rate: percentage
  }
}
```

---

### 3.3 Web Frontend — Employer Broadcast Request

#### 3.3.1 Create Broadcast Request Page (/employer/broadcast/new)
```
┌─────────────────────────────────────────────┐
│  Broadcast Training Request                  │
│  "Tell all providers what you need"          │
│  ─────────────────────────────────────────  │
│  Title: [________________________________]  │
│                                              │
│  Description: (what training do you need?)   │
│  [                                          │
│   Multi-line rich text                      │
│  ]                                          │
│                                              │
│  Target Audience: (who needs this training?) │
│  [________________________________]         │
│                                              │
│  Number of Participants: [___]               │
│                                              │
│  Preferred Mode:                             │
│  ( ) Online  ( ) Physical  ( ) Hybrid  (●) Any │
│                                              │
│  Preferred Location: [________________]      │
│  Preferred Dates: [________________]         │
│                                              │
│  Budget Range:                               │
│  Min RM [______]  Max RM [______]            │
│                                              │
│  Industry Context: [________________]        │
│                                              │
│  Target Skills:                              │
│  [Tag input with suggestions from skill_tags]│
│                                              │
│  Response Deadline: [Date picker, min 3 days]│
│                                              │
│  ─────────────────────────────────────────  │
│  ℹ️ This request will be sent to all         │
│  registered training providers on the        │
│  platform. Providers can submit proposals    │
│  until the deadline.                         │
│  ─────────────────────────────────────────  │
│  [Cancel]          [Broadcast Request]       │
└─────────────────────────────────────────────┘
```

- also accessible from storefront "No results" state and AI advisor
- form validation with helpful error messages
- confirmation dialog before broadcasting

#### 3.3.2 My Broadcast Requests Page (/employer/broadcasts)
- list of all broadcast requests with status badges
- columns: title, participants, budget, deadline, proposals received, status
- status badges: Open (green), Reviewing (yellow), Awarded (blue), Closed (grey), Expired (red)
- click to view detail and proposals

#### 3.3.3 Broadcast Request Detail and Proposals Page (/employer/broadcasts/:id)
```
┌─────────────────────────────────────────────┐
│  ← Back to My Requests                      │
│  ─────────────────────────────────────────  │
│  Title: Advanced Sales Training for Team     │
│  Status: Open | Deadline: 25 Jan 2027       │
│  Proposals: 5 received                       │
│  ─────────────────────────────────────────  │
│  Request Details (collapsible)               │
│  Description, audience, participants, etc.   │
│  ─────────────────────────────────────────  │
│  Proposals (sorted by AI Value Score)        │
│  ─────────────────────────────────────────  │
│  ┌─────────────────────────────────────┐   │
│  │ #1 AI Score: 92/100                  │   │
│  │ Provider: ABC Training ✓ Premium     │   │
│  │ ★ 4.7 (45 reviews)                  │   │
│  │ Proposed Fee: RM 8,500               │   │
│  │ Schedule: 15-17 Feb 2027             │   │
│  │ Value Adds: Free coaching session    │   │
│  │ Status: Submitted                    │   │
│  │ [View Details] [Shortlist] [Reject]  │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ #2 AI Score: 85/100                  │   │
│  │ Provider: XYZ Academy ✓ Trusted      │   │
│  │ ...                                   │   │
│  └─────────────────────────────────────┘   │
│  ─────────────────────────────────────────  │
│  [Compare Shortlisted] [Close Request]       │
└─────────────────────────────────────────────┘
```

#### 3.3.4 Proposal Detail Modal/Page
- full proposal message
- provider profile summary
- linked program details (if any)
- proposed fee with breakdown
- proposed schedule and duration
- trainer details
- value add offers
- attachments with download
- AI value score with explanation
- action buttons: Shortlist, Select, Reject

#### 3.3.5 Proposal Comparison View
- side by side comparison of shortlisted proposals (max 4)
- rows: provider, fee, schedule, quality tier, rating, value adds
- select winner button

---

### 3.4 Web Frontend — Provider Request Feed and Proposals

#### 3.4.1 Training Request Feed Page (/provider/requests)
```
┌─────────────────────────────────────────────┐
│  Training Requests                           │
│  "Employers are looking for training"        │
│  ─────────────────────────────────────────  │
│  Filters: [Industry ▼] [Mode ▼] [Location ▼]│
│  [Budget ▼] [Skills ▼]                      │
│  Sort: [Newest] [Deadline Soon] [Most Relevant]│
│  ─────────────────────────────────────────  │
│  ┌─────────────────────────────────────┐   │
│  │ 🔥 High Match (92%)                  │   │
│  │ Advanced Sales Training               │   │
│  │ Acme Corp | Manufacturing | 15 pax   │   │
│  │ Budget: RM 5,000 - RM 10,000        │   │
│  │ Mode: Physical | Location: KL         │   │
│  │ Deadline: 5 days remaining            │   │
│  │ Skills: Sales, Negotiation, Closing   │   │
│  │ Proposals: 3 submitted                │   │
│  │ [View Details] [Submit Proposal]      │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ 📋 Moderate Match (65%)              │   │
│  │ IT Security Awareness Training        │   │
│  │ Beta Industries | IT | 50 pax        │   │
│  │ ...                                   │   │
│  │ ✅ You have submitted a proposal      │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

- relevance score badge (based on AI match to provider's programs)
- urgency indicator (deadline countdown)
- "Already submitted" indicator
- filters for provider to find relevant requests

#### 3.4.2 Request Detail and Proposal Submission Page (/provider/requests/:id)
```
┌─────────────────────────────────────────────┐
│  ← Back to Requests                          │
│  ─────────────────────────────────────────  │
│  Advanced Sales Training                     │
│  Acme Corp | Manufacturing | Medium          │
│  ─────────────────────────────────────────  │
│  Full request details displayed...           │
│  ─────────────────────────────────────────  │
│                                              │
│  Submit Your Proposal                        │
│  ─────────────────────────────────────────  │
│  Link Existing Program: [Search dropdown ▼]  │
│  (optional: link to one of your programs)    │
│                                              │
│  Proposal Message:                           │
│  [                                          │
│   Explain your offering...                  │
│  ]                                          │
│                                              │
│  Proposed Fee: RM [________]                 │
│  Fee Breakdown: [________________________]   │
│                                              │
│  Proposed Schedule: [________________________]│
│  Proposed Duration: [________________________]│
│                                              │
│  Trainer Details:                            │
│  [                                          │
│   Trainer qualifications and experience     │
│  ]                                          │
│                                              │
│  Value-Add Offers:                           │
│  [                                          │
│   Free coaching, extra materials, etc.      │
│  ]                                          │
│                                              │
│  Attachments:                                │
│  [📎 Upload Quotation]                       │
│  [📎 Upload Program Details]                 │
│  [📎 Upload Supporting Documents]            │
│                                              │
│  ─────────────────────────────────────────  │
│  [Cancel]              [Submit Proposal]     │
└─────────────────────────────────────────────┘
```

- link existing program dropdown (shows provider's published programs)
- pre-fill some fields if program is linked
- attachment upload with drag and drop
- proposal preview before submit
- confirmation dialog

#### 3.4.3 My Proposals Page (/provider/proposals)
- list of all proposals submitted by provider
- columns: request title, employer, proposed fee, status, submitted date
- status badges: Submitted, Shortlisted, Selected (winner!), Rejected, Withdrawn
- click to view proposal detail
- stats panel: total, win rate, shortlist rate

---

### 3.5 Mobile App — Broadcast and Proposals

#### 3.5.1 Employer: Create Broadcast Request Screen
- simplified form for mobile
- multi-step wizard: Details → Requirements → Budget → Review
- submit with confirmation

#### 3.5.2 Employer: My Broadcasts and Proposals Screen
- list of broadcast requests
- tap to view proposals received
- proposal cards with key info and action buttons

#### 3.5.3 Provider: Request Feed Screen
- scrollable list of open requests
- relevance badges
- deadline countdown
- "Submit Proposal" button (basic flow on mobile, detailed management on web)

---

## 4. Acceptance Criteria

- [ ] Employer can create broadcast request with all required fields
- [ ] All active providers receive notification of new request
- [ ] Provider can view request feed with filters
- [ ] Provider can submit proposal with message, fee, schedule, and attachments
- [ ] Provider cannot submit duplicate proposal to same request
- [ ] Employer can view all proposals for a request, sorted by AI value score
- [ ] Employer can view full proposal detail with attachments
- [ ] Employer can shortlist, select, and reject proposals
- [ ] Selected provider receives award notification
- [ ] Non-selected providers receive notification
- [ ] Request status lifecycle works (open → reviewing → awarded/closed/expired)
- [ ] Request auto-expires after deadline
- [ ] Provider can view proposal history with stats
- [ ] Proposal comparison view works for shortlisted proposals
- [ ] AI relevance score shows for providers in request feed
- [ ] AI value score shows for employer in proposal list
- [ ] Mobile broadcast and proposal flows work

---

## 5. Estimated Effort

| Task | Effort |
|------|--------|
| Broadcast request CRUD backend | 3-4 days |
| Broadcast notification job | 1-2 days |
| Proposal CRUD backend | 3-4 days |
| AI value scoring logic | 2-3 days |
| Employer actions (shortlist, select, reject) | 1-2 days |
| Request expiry job | 0.5 days |
| Web: Create broadcast request page | 2 days |
| Web: My broadcasts and proposals view | 3-4 days |
| Web: Proposal detail and comparison | 2-3 days |
| Web: Provider request feed page | 2-3 days |
| Web: Proposal submission page | 2-3 days |
| Web: My proposals page | 1-2 days |
| Mobile: Employer broadcast screens | 2 days |
| Mobile: Provider request feed | 1-2 days |
| Testing | 2-3 days |
| **Total** | **25-35 days** |

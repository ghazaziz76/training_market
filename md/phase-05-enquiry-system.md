# Phase 5: Enquiry System and Employer-TP Interaction — Detailed Development Plan

## 1. Objective

Enable employers and individuals to enquire about training programs, request quotations, and communicate with training providers through a structured enquiry system with reply capabilities and document attachments.

---

## 2. Prerequisites

- Phase 2 completed (auth and profiles)
- Phase 3 completed (programs exist)
- Phase 4 completed (program detail page with enquiry buttons)

---

## 3. Detailed Tasks

### 3.1 Backend — Enquiry Service

#### 3.1.1 Create Enquiry

**POST /api/enquiries**
```
Role: employer, individual

Request Body:
{
  provider_id: UUID (required),
  program_id: UUID (optional, null for general enquiry),
  enquiry_type: "general" | "quotation_request" | "enrolment_request" | "custom_training",
  subject: string (required, max 500),
  message: string (required, max 5000),
  participant_count: number (optional),
  preferred_dates: string (optional),
  budget_range: string (optional)
}

Process:
1. Validate input
2. Verify provider and program exist
3. Create enquiry record with status "sent"
4. Create notification for provider
5. Send email notification to provider
6. Log user_activity (enquire)
7. Increment program enquiry_count
8. Return created enquiry

Response 201:
{
  success: true,
  data: {
    enquiry_id, subject, enquiry_type, status, created_at
  }
}
```

#### 3.1.2 List Enquiries (Requester View)

**GET /api/enquiries/sent**
```
Role: employer, individual
Query Params: status, enquiry_type, page, limit

Returns enquiries sent by authenticated user with provider and program info.

Response 200:
{
  data: [
    {
      enquiry_id,
      subject,
      enquiry_type,
      status,
      provider: { provider_name, logo_url },
      program: { title, program_id } (or null),
      reply_count: number,
      last_reply_at: timestamp,
      created_at
    }
  ],
  pagination: { total, page, limit, total_pages }
}
```

#### 3.1.3 List Enquiries (Provider View)

**GET /api/enquiries/received**
```
Role: provider
Query Params: status, enquiry_type, program_id, page, limit

Returns enquiries received by authenticated provider with requester info.

Response 200:
{
  data: [
    {
      enquiry_id,
      subject,
      enquiry_type,
      status,
      requester: { full_name, company_name (if employer), role },
      program: { title, program_id } (or null),
      participant_count,
      reply_count: number,
      last_reply_at: timestamp,
      created_at
    }
  ],
  pagination: { total, page, limit, total_pages }
}
```

#### 3.1.4 Get Enquiry Detail

**GET /api/enquiries/:enquiry_id**
```
Role: enquiry requester or target provider

Response 200:
{
  data: {
    enquiry_id,
    subject,
    enquiry_type,
    message,
    participant_count,
    preferred_dates,
    budget_range,
    status,
    requester: { user_id, full_name, email, company_name, industry, company_size },
    provider: { provider_id, provider_name, contact_email },
    program: { program_id, title, fee, delivery_mode },
    replies: [
      {
        reply_id,
        sender: { full_name, role },
        message,
        attachments: [
          { file_name, file_url, file_type, file_size }
        ],
        created_at
      }
    ],
    created_at,
    updated_at
  }
}

Process:
1. Verify user is either requester or provider
2. If provider viewing and status is "sent", update to "read"
3. Return full enquiry with all replies
```

#### 3.1.5 Reply to Enquiry

**POST /api/enquiries/:enquiry_id/replies**
```
Role: enquiry requester or target provider
Content-Type: multipart/form-data

Request Body:
{
  message: string (required, max 5000),
  attachments: File[] (optional, max 5 files, max 10MB each, pdf/doc/docx/xls/xlsx/jpg/png)
}

Process:
1. Verify user is participant in this enquiry
2. Upload attachments to object storage
3. Create enquiry_reply record with attachment metadata
4. Update enquiry status to "replied"
5. Update enquiry updated_at
6. Create notification for other party
7. Send email notification
8. Update provider response_rate and average_response_time (if provider is replying)
9. Return created reply

Response 201:
{
  success: true,
  data: {
    reply_id,
    message,
    attachments: [{ file_name, file_url, file_type }],
    created_at
  }
}
```

#### 3.1.6 Close Enquiry

**PUT /api/enquiries/:enquiry_id/close**
```
Role: enquiry requester

Process:
1. Set status to "closed"
2. Notify provider
```

#### 3.1.7 Enquiry Statistics

**GET /api/enquiries/stats**
```
Role: provider

Response:
{
  total_received: number,
  pending_reply: number,
  replied: number,
  average_response_hours: number,
  this_month: number,
  last_month: number
}
```

---

### 3.2 Web Frontend — Employer Enquiry Flow

#### 3.2.1 Enquiry Modal (from Program Detail Page)
Triggered by "Enquire" or "Request Quote" button on program detail page.

```
┌─────────────────────────────────────────┐
│  Send Enquiry                     [X]   │
│  ─────────────────────────────────────  │
│  Program: Advanced Leadership Skills    │
│  Provider: ABC Training Sdn Bhd        │
│  ─────────────────────────────────────  │
│  Enquiry Type:                          │
│  (●) General Enquiry                    │
│  ( ) Request Quotation                  │
│  ( ) Enrolment Request                  │
│  ( ) Custom Training Request            │
│  ─────────────────────────────────────  │
│  Subject: [____________________________]│
│  ─────────────────────────────────────  │
│  Message:                               │
│  [                                      │
│   Multi-line text area                  │
│                                         │
│  ]                                      │
│  ─────────────────────────────────────  │
│  Number of Participants: [___]          │
│  Preferred Dates: [____________________]│
│  Budget Range: [____________________]   │
│  ─────────────────────────────────────  │
│  [Cancel]              [Send Enquiry]   │
└─────────────────────────────────────────┘
```

- pre-filled program and provider info
- enquiry type selection (radio buttons)
- show participant/dates/budget fields for quotation and custom types
- character counter on message
- send button with loading state
- success confirmation with link to "My Enquiries"

#### 3.2.2 My Enquiries Page (/employer/enquiries)
```
┌─────────────────────────────────────────────┐
│  My Enquiries                               │
│  ─────────────────────────────────────────  │
│  Filters: [All] [Sent] [Read] [Replied] [Closed] │
│  ─────────────────────────────────────────  │
│  ┌─────────────────────────────────────┐   │
│  │ 📩 Request for Leadership Quotation  │   │
│  │ To: ABC Training | Program: Adv Lead │   │
│  │ Type: Quotation Request              │   │
│  │ Status: ● Replied (2 replies)        │   │
│  │ Last reply: 2 hours ago              │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ 📩 General enquiry about Excel       │   │
│  │ To: XYZ Academy | Program: Excel Adv │   │
│  │ Type: General                        │   │
│  │ Status: ● Sent (no reply yet)        │   │
│  │ Sent: 3 days ago                     │   │
│  └─────────────────────────────────────┘   │
│  ... more enquiries                        │
└─────────────────────────────────────────────┘
```

- enquiry cards with status indicators
- unread reply indicator (bold/badge)
- click to open enquiry thread

#### 3.2.3 Enquiry Thread Page (/employer/enquiries/:enquiry_id)
```
┌─────────────────────────────────────────────┐
│  ← Back to My Enquiries                     │
│  ─────────────────────────────────────────  │
│  Subject: Request for Leadership Quotation   │
│  Provider: ABC Training | Program: Adv Lead  │
│  Type: Quotation Request | Status: Replied   │
│  ─────────────────────────────────────────  │
│  [You - 15 Jan 2027, 10:00 AM]              │
│  Hi, we need a quotation for 15 pax for     │
│  the Advanced Leadership program...          │
│  ─────────────────────────────────────────  │
│  [ABC Training - 15 Jan 2027, 3:00 PM]      │
│  Thank you for your enquiry. Please find     │
│  attached our quotation and program details. │
│  📎 Quotation_ABC_Leadership.pdf             │
│  📎 Program_Details_Leadership.pdf           │
│  ─────────────────────────────────────────  │
│  [You - 16 Jan 2027, 9:00 AM]              │
│  Thank you. Can the dates be adjusted?       │
│  ─────────────────────────────────────────  │
│                                              │
│  Reply:                                      │
│  [                                          │
│   Type your reply...                        │
│  ]                                          │
│  📎 Attach files                             │
│  [Send Reply]           [Close Enquiry]      │
└─────────────────────────────────────────────┘
```

- conversation thread display (chronological)
- sender identification (you vs provider)
- attachment display with download links
- reply box with file attachment
- close enquiry button

---

### 3.3 Web Frontend — Provider Enquiry Management

#### 3.3.1 Received Enquiries Page (/provider/enquiries)
```
┌─────────────────────────────────────────────┐
│  Enquiries                                   │
│  ─────────────────────────────────────────  │
│  Stats: 12 Total | 3 Pending | 8 Replied    │
│  ─────────────────────────────────────────  │
│  Filters: [All] [New] [Read] [Replied] [Closed] │
│  Filter by: [Program ▼] [Type ▼]            │
│  ─────────────────────────────────────────  │
│  ┌─────────────────────────────────────┐   │
│  │ 🔴 NEW                               │   │
│  │ Request for Leadership Quotation      │   │
│  │ From: John Doe (Acme Corp)           │   │
│  │ Program: Advanced Leadership Skills   │   │
│  │ Type: Quotation Request | 15 pax     │   │
│  │ Received: 2 hours ago                │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ ✅ REPLIED                            │   │
│  │ Excel Training for Finance Team       │   │
│  │ From: Jane Smith (Beta Industries)   │   │
│  │ Program: Advanced Excel               │   │
│  │ Type: Enrolment Request | 8 pax      │   │
│  │ Last reply: 1 day ago                │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

- new enquiry highlight (red dot / bold)
- requester company info visible
- quick stats at top

#### 3.3.2 Enquiry Reply Page (/provider/enquiries/:enquiry_id)
Same thread layout as employer view plus:
- requester info panel (company name, industry, size, contact)
- program info panel (quick reference)
- reply with file attachments:
  - "Attach Quotation" quick button
  - "Attach Program Details" quick button
  - general file attachment
  - supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
  - max 5 files per reply, max 10MB each
- response time indicator ("Reply within 24 hours to maintain your response rate")

#### 3.3.3 Client Tracker View (/provider/clients)
```
┌──────────────────────────────────────────────┐
│  Client Tracker                               │
│  ─────────────────────────────────────────── │
│  ┌──────────┬─────────┬──────────┬─────────┐│
│  │ Company  │ Enquiry │ Status   │ Last    ││
│  │          │ Count   │          │ Contact ││
│  ├──────────┼─────────┼──────────┼─────────┤│
│  │ Acme Corp│ 3       │ Active   │ 2d ago  ││
│  │ Beta Ind │ 1       │ Replied  │ 5d ago  ││
│  │ Gamma Co │ 2       │ Closed   │ 2w ago  ││
│  └──────────┴─────────┴──────────┴─────────┘│
│  Click row to see all enquiries from client   │
└──────────────────────────────────────────────┘
```

- aggregated view of all employers who have enquired
- total enquiry count per employer
- latest enquiry status
- last contact date
- click to filter enquiries by this employer

---

### 3.4 Mobile App — Enquiry Screens

#### 3.4.1 Enquiry Form Screen
- accessed from program detail "Enquire" button
- simplified form: type, subject, message, participant count
- submit with loading indicator
- success screen with "View My Enquiries" button

#### 3.4.2 My Enquiries Screen
- list of enquiries with status badges
- pull to refresh
- tap to open thread

#### 3.4.3 Enquiry Thread Screen
- conversation bubbles (like messaging app)
- attachment thumbnails with download
- reply input at bottom with attachment button
- push notification for new replies

---

## 4. Acceptance Criteria

- [ ] Employer can send enquiry from program detail page
- [ ] Individual can send enquiry from program detail page
- [ ] Provider receives notification of new enquiry
- [ ] Provider can view all received enquiries with filters
- [ ] Provider can reply to enquiry with message and file attachments
- [ ] Employer receives notification of provider reply
- [ ] Employer can view enquiry thread with all replies
- [ ] Employer can reply back to provider
- [ ] File attachments upload and download correctly (PDF, DOC, images)
- [ ] Enquiry status updates correctly (sent → read → replied → closed)
- [ ] Provider response rate and average response time calculated correctly
- [ ] Client tracker shows aggregated employer data
- [ ] Mobile enquiry flow works end to end
- [ ] Email notifications sent for new enquiries and replies
- [ ] Program enquiry_count increments correctly

---

## 5. Estimated Effort

| Task | Effort |
|------|--------|
| Enquiry CRUD backend | 2-3 days |
| Reply with attachments backend | 2-3 days |
| File upload and storage | 1-2 days |
| Notification triggers | 1 day |
| Provider stats and client tracker backend | 1-2 days |
| Web: Enquiry modal | 1 day |
| Web: My Enquiries page (employer) | 2 days |
| Web: Enquiry thread page | 2-3 days |
| Web: Provider enquiry management page | 2-3 days |
| Web: Client tracker page | 1-2 days |
| Mobile: Enquiry screens | 2-3 days |
| Testing | 2 days |
| **Total** | **18-25 days** |

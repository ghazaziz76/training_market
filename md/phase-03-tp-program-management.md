# Phase 3: Training Provider — Program Management — Detailed Development Plan

## 1. Objective

Enable training providers to create, edit, manage, and publish their training programs through a comprehensive catalog management system. Programs should include all metadata needed for search, AI matching, storefront display, and HRD Corp guidance.

---

## 2. Prerequisites

- Phase 1 completed (database with training_programs, categories, skill_tags, trainers, program_schedules tables)
- Phase 2 completed (auth system, provider registration and profile)
- Provider can log in and has completed profile

---

## 3. Detailed Tasks

### 3.1 Backend — Training Catalog Service

#### 3.1.1 Program CRUD Endpoints

**POST /api/programs**
```
Role: provider
Headers: Authorization: Bearer <access_token>

Request Body:
{
  title: string (required, max 500),
  category_id: UUID (required),
  subcategory_id: UUID (optional),
  description: string (required, min 100 chars),
  short_description: string (max 500),
  learning_outcomes: string (required),
  target_audience: string (required),
  prerequisites: string,
  industry_focus: string[],
  skill_tag_ids: UUID[],
  delivery_mode: "online" | "physical" | "hybrid" (required),
  location: string (required if physical/hybrid),
  city: string,
  state: string,
  duration_hours: number,
  duration_days: number,
  min_participants: number,
  max_participants: number,
  fee: number (required),
  fee_notes: string,
  early_bird_fee: number,
  group_discount_info: string,
  certification: string,
  language: string (default "English"),
  materials_provided: string,
  hrd_corp_claimable: boolean,
  hrd_corp_scheme: string,
  hrd_corp_program_id: string
}

Process:
1. Validate all fields with Zod schema
2. Verify provider_id from auth token
3. Verify category_id exists
4. Verify skill_tag_ids exist
5. Generate slug from title
6. Create program with status "draft"
7. Update provider total_programs_count
8. Return created program

Response 201:
{
  success: true,
  data: { program object with all fields }
}
```

**GET /api/programs/:program_id**
```
Public endpoint (published programs) or provider-only (draft/pending)

Response 200:
{
  success: true,
  data: {
    ...program fields,
    provider: { provider_name, logo_url, quality_tier, average_rating },
    category: { name, slug },
    subcategory: { name, slug },
    skill_tags: [{ tag_id, name }],
    trainers: [{ name, qualification, specialization, photo_url }],
    schedules: [{ schedule_id, start_date, end_date, venue, available_seats, status }],
    promotions: [{ promotion_type, label, discount_value, end_date }]
  }
}
```

**PUT /api/programs/:program_id**
```
Role: provider (owner only)

Request Body: same as POST, all fields optional (partial update)

Process:
1. Verify program belongs to authenticated provider
2. Validate updated fields
3. If program was published and key fields changed, optionally set status back to "pending_review"
4. Update program record
5. Update updated_at timestamp
6. If description changed, trigger re-embedding for AI (async job)
```

**DELETE /api/programs/:program_id**
```
Role: provider (owner only)

Process:
1. Verify program belongs to authenticated provider
2. Set status to "archived" (soft delete, not hard delete)
3. Remove from search index
4. Update provider total_programs_count
```

**GET /api/programs/my-programs**
```
Role: provider
Query Params: status, category_id, search, page, limit, sort_by

Response 200:
{
  data: [
    {
      program_id, title, category, status, fee, delivery_mode,
      view_count, enquiry_count, created_at, published_at
    }
  ],
  pagination: { total, page, limit, total_pages }
}
```

#### 3.1.2 Program Status Workflow

```
draft → pending_review → published → archived
                       → rejected → draft (edit and resubmit)
```

**PUT /api/programs/:program_id/submit**
```
Role: provider
Process:
1. Validate all required fields are filled
2. Change status from "draft" to "pending_review"
3. Create notification for admin
```

**PUT /api/admin/programs/:program_id/review**
```
Role: admin
Request Body:
{
  action: "approve" | "reject",
  rejection_reason: string (required if reject)
}

Process:
1. If approve: set status to "published", set published_at, add to search index
2. If reject: set status to "rejected", store rejection_reason
3. Notify provider of result
```

#### 3.1.3 Schedule Management Endpoints

**POST /api/programs/:program_id/schedules**
```
Role: provider (owner only)

Request Body:
{
  start_date: date (required),
  end_date: date (required),
  start_time: time,
  end_time: time,
  venue: string (for physical/hybrid),
  online_platform: string (for online/hybrid),
  available_seats: number
}

Process:
1. Validate dates (end >= start, start >= today)
2. Validate program belongs to provider
3. Create schedule record
4. Return created schedule
```

**PUT /api/programs/:program_id/schedules/:schedule_id**
```
Role: provider (owner only)
Request Body: partial update of schedule fields
```

**DELETE /api/programs/:program_id/schedules/:schedule_id**
```
Role: provider (owner only)
Process: set status to "cancelled" if no bookings, or reject if has bookings
```

**GET /api/programs/:program_id/schedules**
```
Public for published programs
Returns all active schedules sorted by start_date
```

#### 3.1.4 Trainer Management Endpoints

**POST /api/providers/trainers**
```
Role: provider

Request Body:
{
  name: string (required),
  qualification: string,
  specialization: string,
  bio: string,
  photo_url: string,
  years_experience: number
}
```

**GET /api/providers/trainers**
```
Role: provider
Returns all trainers for the authenticated provider
```

**PUT /api/providers/trainers/:trainer_id**
```
Role: provider (owner only)
Partial update of trainer fields
```

**DELETE /api/providers/trainers/:trainer_id**
```
Role: provider (owner only)
Soft delete
```

**POST /api/programs/:program_id/trainers**
```
Role: provider (owner only)
Request Body: { trainer_ids: UUID[] }
Assigns trainers to a program
```

#### 3.1.5 Category and Taxonomy Endpoints

**GET /api/categories**
```
Public endpoint
Returns hierarchical category tree:
[
  {
    category_id, name, slug, icon,
    subcategories: [{ category_id, name, slug }]
  }
]
Cached in Redis (refresh on admin update)
```

**GET /api/skill-tags**
```
Public endpoint
Query Params: category_id, search
Returns: [{ tag_id, name, slug, category }]
```

**Admin CRUD for categories and tags:**
- POST /api/admin/categories
- PUT /api/admin/categories/:id
- DELETE /api/admin/categories/:id
- POST /api/admin/skill-tags
- PUT /api/admin/skill-tags/:id
- DELETE /api/admin/skill-tags/:id

#### 3.1.6 File Upload Endpoints

**POST /api/uploads/program-thumbnail**
```
Role: provider
File: image (max 2MB, jpg/png/webp)
Process: resize to 800x600, upload to storage, return URL
```

**POST /api/uploads/program-brochure**
```
Role: provider
File: PDF (max 10MB)
Process: upload to storage, return URL
```

**POST /api/uploads/trainer-photo**
```
Role: provider
File: image (max 2MB, jpg/png/webp)
Process: resize to 400x400, upload to storage, return URL
```

#### 3.1.7 Program Validation Rules

Required fields for submission (status change to pending_review):
- title
- category_id
- description (min 100 characters)
- learning_outcomes
- target_audience
- delivery_mode
- fee
- duration_hours or duration_days
- location (if physical or hybrid)
- at least 1 schedule
- at least 1 trainer assigned

Validation on save (draft):
- title required
- category_id required
- all other fields optional (allow saving incomplete draft)

---

### 3.2 Web Frontend — TP Program Management Dashboard

#### 3.2.1 My Programs Page (/provider/programs)
Components:
- page header with "My Programs" title and "Add New Program" button
- filter bar: status dropdown (All, Draft, Pending Review, Published, Rejected, Archived), category dropdown, search input
- program list as cards or table view (toggle):
  - Card view: thumbnail, title, category, status badge, fee, delivery mode, view count, enquiry count
  - Table view: title, category, status, fee, delivery mode, views, enquiries, created date
- sort options: newest, oldest, most views, most enquiries
- pagination
- empty state: "No programs yet. Create your first training program."
- click program → edit page

#### 3.2.2 Program Create/Edit Page (/provider/programs/new and /provider/programs/:id/edit)
Layout: multi-section form with sidebar navigation

**Section 1: Basic Information**
- title input (text, required)
- short description (textarea, max 500 chars, with character counter)
- category dropdown (required)
- subcategory dropdown (filters based on selected category)
- industry focus multi-select chips
- skill tags multi-select with search (from skill_tags table)
- language dropdown

**Section 2: Program Details**
- description (rich text editor with formatting: headers, bold, italic, lists, links)
- learning outcomes (rich text editor)
- target audience (textarea)
- prerequisites (textarea)
- materials provided (textarea)
- certification (text input)

**Section 3: Delivery and Location**
- delivery mode radio buttons: Online / Physical / Hybrid
- if physical/hybrid: location input, city dropdown, state dropdown
- if online/hybrid: online platform input
- duration hours input
- duration days input
- min participants input
- max participants input

**Section 4: Pricing**
- fee input (number, MYR)
- fee notes (textarea, for explaining what's included)
- early bird fee input (number, optional)
- group discount info (textarea, optional)

**Section 5: HRD Corp Information**
- HRD Corp claimable toggle
- if yes: HRD Corp scheme dropdown
- HRD Corp program ID input
- info text explaining why this matters for employers

**Section 6: Media**
- thumbnail upload with preview and crop
- brochure PDF upload with file name display
- drag and drop support

**Section 7: Trainers**
- assigned trainers list with remove button
- "Add Trainer" button → opens trainer selection modal
- trainer selection modal: list of provider's trainers with checkboxes
- "Create New Trainer" option in modal → opens trainer form

**Section 8: Schedules**
- schedule list showing all sessions
- "Add Schedule" button → opens schedule form modal
- schedule form: start date, end date, start time, end time, venue/platform, available seats
- edit and delete buttons per schedule
- calendar preview of all schedules

**Form Actions:**
- "Save as Draft" button (saves without validation of required fields)
- "Submit for Review" button (validates all required fields, changes status to pending_review)
- "Preview" button (shows how the program will look to employers)
- unsaved changes warning when navigating away

**Rejected Program:**
- show rejection reason banner at top
- "Edit and Resubmit" action available

#### 3.2.3 Program Preview Modal
- shows the program exactly as it will appear on the storefront
- program card preview
- program detail page preview
- read-only view

#### 3.2.4 Trainer Management Page (/provider/trainers)
- trainer list with photo, name, specialization, programs assigned count
- add new trainer button → form modal
- edit trainer
- delete trainer (with warning if assigned to programs)

---

### 3.3 Admin — Program Moderation

#### 3.3.1 Moderation Queue Page (/admin/programs/pending)
- list of programs with status "pending_review"
- sorted by submission date (oldest first)
- columns: title, provider, category, submitted date
- click to view program detail

#### 3.3.2 Program Review Page (/admin/programs/:id/review)
- full program detail view (same as employer would see)
- provider information section
- review action panel:
  - "Approve" button → confirms and publishes
  - "Reject" button → opens rejection reason textarea
- review history (if previously rejected and resubmitted)

#### 3.3.3 All Programs Page (/admin/programs)
- full list of all programs on platform
- filters: status, category, provider, delivery mode
- search by title
- bulk actions: approve, archive
- click to view/edit any program

---

### 3.4 Mobile App — Program Viewing (Read Only)

Note: Program creation and editing is web-only for TPs. Mobile shows program details for employers and individuals.

#### 3.4.1 Program Detail Screen
- scrollable detail view with all program information
- provider info with quality tier badge
- schedule list
- trainer profiles
- action buttons: Save, Enquire, Compare
- share program link

---

## 4. Acceptance Criteria

- [ ] Provider can create a new program as draft with minimal fields
- [ ] Provider can edit all program fields
- [ ] Provider can upload thumbnail and brochure
- [ ] Provider can manage trainers (create, edit, delete, assign to programs)
- [ ] Provider can manage schedules (create, edit, cancel per program)
- [ ] Provider can submit program for review (all required fields validated)
- [ ] Admin receives notification of pending program
- [ ] Admin can approve program (status changes to published)
- [ ] Admin can reject program with reason (provider notified)
- [ ] Provider can edit rejected program and resubmit
- [ ] Provider can archive a program
- [ ] Provider can view all their programs with filters and search
- [ ] Categories and skill tags load correctly in dropdowns
- [ ] Program detail page shows all information including trainers and schedules
- [ ] File uploads work for images and PDFs
- [ ] Draft saves work without full validation
- [ ] Rich text editor works for description and learning outcomes

---

## 5. Estimated Effort

| Task | Effort |
|------|--------|
| Program CRUD backend endpoints | 3-4 days |
| Schedule and trainer endpoints | 2-3 days |
| Category/taxonomy endpoints | 1 day |
| File upload endpoints | 1-2 days |
| Program validation logic | 1 day |
| Admin moderation endpoints | 1-2 days |
| Web: My Programs page | 2 days |
| Web: Program create/edit form (complex) | 4-5 days |
| Web: Trainer management page | 1-2 days |
| Web: Admin moderation pages | 2 days |
| Mobile: Program detail screen | 1-2 days |
| Testing | 2-3 days |
| **Total** | **21-28 days** |

# Phase 7: HRD Corp Guidance Layer — Detailed Development Plan

## 1. Objective

Provide employers with structured HRD Corp grant application guidance after matching with a training program or receiving a provider proposal. This includes eligibility indicators, required document checklists, program information formatted for grant applications, and step-by-step guidance.

---

## 2. Prerequisites

- Phase 2 completed (employer profiles with HRD Corp registration status)
- Phase 3 completed (programs with HRD Corp relevant fields)
- Phase 5 completed (enquiry system with document exchange)
- Phase 6 completed (broadcast proposals with attachments)

---

## 3. Detailed Tasks

### 3.1 Backend — HRD Corp Guidance Service

#### 3.1.1 HRD Corp Guidance Data Model

**Table: hrd_corp_guidance_rules (admin managed)**
```sql
CREATE TABLE hrd_corp_guidance_rules (
    rule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_name VARCHAR(255) NOT NULL,
    scheme_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    eligibility_criteria JSONB NOT NULL,
    required_documents JSONB NOT NULL,
    process_steps JSONB NOT NULL,
    useful_links JSONB DEFAULT '[]',
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

Example seed data for a guidance rule:
```json
{
  "scheme_name": "SBL-Khas Scheme",
  "scheme_code": "SBL_KHAS",
  "eligibility_criteria": [
    { "item": "Employer must be registered with HRD Corp", "type": "employer" },
    { "item": "Employer levy account must be active", "type": "employer" },
    { "item": "Training provider should be registered with HRD Corp", "type": "provider" },
    { "item": "Training program should be relevant to employer industry", "type": "program" }
  ],
  "required_documents": [
    { "item": "Training provider quotation or invoice", "source": "provider", "mandatory": true },
    { "item": "Training program details and objectives", "source": "provider", "mandatory": true },
    { "item": "Trainer profile and qualifications", "source": "provider", "mandatory": true },
    { "item": "Training schedule with dates and duration", "source": "provider", "mandatory": true },
    { "item": "Fee breakdown", "source": "provider", "mandatory": true },
    { "item": "List of participants", "source": "employer", "mandatory": true },
    { "item": "Company registration documents", "source": "employer", "mandatory": false }
  ],
  "process_steps": [
    { "step": 1, "title": "Identify training need", "description": "Determine what training your team needs" },
    { "step": 2, "title": "Find suitable training program", "description": "Search and compare programs on Training Market" },
    { "step": 3, "title": "Obtain quotation from provider", "description": "Request and receive quotation with program details" },
    { "step": 4, "title": "Prepare application documents", "description": "Collect all required documents from the checklist" },
    { "step": 5, "title": "Submit application to HRD Corp", "description": "Log in to HRD Corp e-TRIS system and submit" },
    { "step": 6, "title": "Await approval", "description": "HRD Corp reviews and approves the application" },
    { "step": 7, "title": "Attend training", "description": "Employees attend the approved training program" },
    { "step": 8, "title": "Submit claim", "description": "After training, submit claim with attendance proof" }
  ]
}
```

#### 3.1.2 Employer HRD Corp Checklist Tracking

**Table: hrd_corp_checklists**
```sql
CREATE TABLE hrd_corp_checklists (
    checklist_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID NOT NULL REFERENCES employer_profiles(employer_id),
    program_id UUID REFERENCES training_programs(program_id),
    proposal_id UUID REFERENCES tp_proposals(proposal_id),
    enquiry_id UUID REFERENCES enquiries(enquiry_id),
    scheme_code VARCHAR(50) REFERENCES hrd_corp_guidance_rules(scheme_code),
    checklist_items JSONB NOT NULL DEFAULT '[]',
    overall_readiness_pct DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'ready', 'submitted', 'archived')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_checklists_employer ON hrd_corp_checklists(employer_id);
```

Checklist items JSONB structure:
```json
[
  {
    "item": "Training provider quotation",
    "source": "provider",
    "mandatory": true,
    "status": "received",
    "document_url": "https://...",
    "received_at": "2027-01-15",
    "notes": "Received from ABC Training via enquiry"
  },
  {
    "item": "Training program details and objectives",
    "source": "provider",
    "mandatory": true,
    "status": "pending",
    "document_url": null,
    "received_at": null,
    "notes": ""
  }
]
```

#### 3.1.3 API Endpoints

**GET /api/hrd-corp/guidance/:program_id**
```
Role: employer

Response 200:
{
  data: {
    program_info: {
      title, provider_name, delivery_mode, duration, fee, fee_breakdown,
      learning_outcomes, target_audience, trainer_info,
      hrd_corp_claimable, hrd_corp_scheme, hrd_corp_program_id,
      provider_hrd_corp_registered, provider_hrd_corp_id
    },
    employer_readiness: {
      is_hrd_corp_registered: boolean,
      has_active_levy: boolean,
      readiness_issues: string[] (e.g., "Your HRD Corp registration status is not confirmed")
    },
    scheme_guidance: {
      scheme_name, scheme_code, description,
      eligibility_criteria: [...],
      required_documents: [...],
      process_steps: [...],
      useful_links: [...]
    },
    document_availability: {
      from_provider: [
        { item: "Quotation", available: true, source: "enquiry reply", document_url: "..." },
        { item: "Program details", available: true, source: "program listing", document_url: null },
        { item: "Trainer profile", available: false, source: null }
      ],
      from_employer: [
        { item: "Participant list", available: false },
        { item: "Company registration", available: false }
      ]
    }
  }
}
```

**POST /api/hrd-corp/checklists**
```
Role: employer

Request Body:
{
  program_id: UUID (optional),
  proposal_id: UUID (optional),
  enquiry_id: UUID (optional),
  scheme_code: string (required)
}

Process:
1. Get scheme guidance rules
2. Create checklist with items from scheme required_documents
3. Auto-populate status for items already available:
   - if provider sent quotation via enquiry/proposal → mark as "received"
   - if program details exist in listing → mark as "available"
4. Calculate overall_readiness_pct
5. Return created checklist
```

**GET /api/hrd-corp/checklists**
```
Role: employer
Returns all checklists for the employer

Response:
{
  data: [
    {
      checklist_id, program_title, provider_name, scheme_name,
      overall_readiness_pct, status, created_at
    }
  ]
}
```

**GET /api/hrd-corp/checklists/:checklist_id**
```
Role: employer (owner)
Returns full checklist with all items and their status
```

**PUT /api/hrd-corp/checklists/:checklist_id/items**
```
Role: employer (owner)

Request Body:
{
  items: [
    {
      item: "Participant list",
      status: "completed",
      notes: "Prepared and uploaded",
      document_url: "https://..."
    }
  ]
}

Process:
1. Update matching checklist items
2. Recalculate overall_readiness_pct
3. If all mandatory items are completed, set status to "ready"
```

**POST /api/hrd-corp/checklists/:checklist_id/export**
```
Role: employer (owner)

Process:
1. Generate PDF document containing:
   - employer company info
   - program details
   - provider details
   - all checklist items with status
   - collected documents list
   - scheme process steps
2. Return PDF download URL
```

**GET /api/hrd-corp/schemes**
```
Public endpoint
Returns list of all active HRD Corp schemes with basic info.
Used for scheme selection dropdowns.
```

#### 3.1.4 Admin Endpoints

**GET /api/admin/hrd-corp/rules**
```
Role: admin
Returns all guidance rules
```

**POST /api/admin/hrd-corp/rules**
```
Role: admin
Create new guidance rule
```

**PUT /api/admin/hrd-corp/rules/:rule_id**
```
Role: admin
Update guidance rule (eligibility, documents, steps)
```

---

### 3.2 Web Frontend — Employer HRD Corp Guidance

#### 3.2.1 HRD Corp Guidance Page (from Program Detail)
Accessed via "HRD Corp Guidance" button on program detail page or proposal detail page.

```
┌─────────────────────────────────────────────┐
│  HRD Corp Grant Application Guidance         │
│  ─────────────────────────────────────────  │
│  Program: Advanced Leadership Skills         │
│  Provider: ABC Training Sdn Bhd              │
│  ─────────────────────────────────────────  │
│                                              │
│  ── Your Readiness ──                        │
│  ✅ You are registered with HRD Corp         │
│  ✅ Levy account status: Active              │
│  ✅ Provider is HRD Corp registered          │
│  ✅ Program marked as HRD Corp claimable     │
│  ⚠️  Scheme: SBL-Khas (auto-detected)       │
│                                              │
│  ── Eligibility Checklist ──                 │
│  ✅ Employer registered with HRD Corp        │
│  ✅ Levy account active                      │
│  ✅ Training provider registered             │
│  ✅ Program relevant to industry             │
│                                              │
│  ── Required Documents ──                    │
│  ✅ Quotation from provider                  │
│     📎 Quotation_ABC.pdf [Download]          │
│  ✅ Program details and objectives           │
│     (Available from program listing)         │
│  ⬜ Trainer profile and qualifications       │
│     → Request from provider                  │
│  ✅ Training schedule                        │
│     15-17 Feb 2027                           │
│  ✅ Fee breakdown                            │
│     RM 1,500 per pax                         │
│  ⬜ List of participants                     │
│     → You need to prepare this               │
│  ⬜ Company registration documents           │
│     → You need to prepare this (optional)    │
│                                              │
│  Overall Readiness: ████████░░ 65%           │
│                                              │
│  ── Application Process Steps ──             │
│  Step 1: ✅ Identify training need           │
│  Step 2: ✅ Find suitable training program   │
│  Step 3: ✅ Obtain quotation from provider   │
│  Step 4: 🔄 Prepare application documents    │
│  Step 5: ⬜ Submit application to HRD Corp   │
│  Step 6: ⬜ Await approval                   │
│  Step 7: ⬜ Attend training                  │
│  Step 8: ⬜ Submit claim                     │
│                                              │
│  ── Useful Links ──                          │
│  🔗 HRD Corp e-TRIS Portal                  │
│  🔗 SBL-Khas Scheme Guidelines              │
│                                              │
│  [Start Checklist Tracking]                  │
│  [Export as PDF]                              │
└─────────────────────────────────────────────┘
```

#### 3.2.2 My HRD Corp Checklists Page (/employer/hrd-corp)
- list of all active checklists
- readiness percentage bar per checklist
- status indicators
- click to open checklist detail
- "New Checklist" button (create for a specific program)

#### 3.2.3 Checklist Detail and Tracking Page (/employer/hrd-corp/:checklist_id)
- interactive checklist with checkboxes
- upload documents for employer-side items
- auto-linked documents from provider replies
- notes field per item
- readiness progress bar
- export to PDF button
- reminder: "3 items remaining before you can apply"

#### 3.2.4 HRD Corp Badge on Program Cards
- small badge on program cards: "HRD Corp Claimable"
- visible on storefront, search results, and compare view
- clicking badge opens brief tooltip explaining what it means

---

### 3.3 Web Frontend — Admin HRD Corp Rules Management

#### 3.3.1 HRD Corp Rules Page (/admin/hrd-corp/rules)
- list of all guidance rules (schemes)
- add new rule button
- edit rule
- activate/deactivate rule

#### 3.3.2 Rule Editor
- scheme name and code
- description
- eligibility criteria editor (add/remove items with type tags)
- required documents editor (add/remove with source, mandatory toggle)
- process steps editor (ordered list, add/remove/reorder)
- useful links editor
- preview of how guidance will appear to employers

---

### 3.4 Mobile App — HRD Corp Guidance

#### 3.4.1 HRD Corp Guidance Screen
- simplified version of web guidance page
- readiness indicators
- document checklist with status
- process steps
- link to full web version for detailed management

#### 3.4.2 Checklist Tracking
- view checklist items with status
- mark items as complete
- basic document viewing

---

## 4. Acceptance Criteria

- [ ] HRD Corp guidance page displays correctly for programs with HRD Corp fields
- [ ] Employer readiness assessment shows based on employer profile
- [ ] Eligibility criteria display with status indicators
- [ ] Required documents list shows with availability status
- [ ] Documents from provider enquiry replies auto-link to checklist
- [ ] Documents from provider proposals auto-link to checklist
- [ ] Employer can create and track a checklist for a specific program
- [ ] Employer can update checklist item status and upload documents
- [ ] Readiness percentage calculates correctly
- [ ] Process steps display in correct order
- [ ] Export to PDF generates correctly formatted document
- [ ] Admin can create and manage HRD Corp guidance rules
- [ ] HRD Corp claimable badge shows on program cards
- [ ] Scheme auto-detection works based on program HRD Corp fields
- [ ] Mobile guidance view works

---

## 5. Estimated Effort

| Task | Effort |
|------|--------|
| HRD Corp data model and seed data | 1-2 days |
| Guidance API endpoints | 2-3 days |
| Checklist CRUD and tracking endpoints | 2-3 days |
| Document auto-linking logic | 1-2 days |
| PDF export generation | 1-2 days |
| Admin rules management endpoints | 1-2 days |
| Web: HRD Corp guidance page | 3-4 days |
| Web: Checklist tracking page | 2-3 days |
| Web: Admin rules management | 2 days |
| Web: HRD Corp badges on program cards | 0.5 days |
| Mobile: Guidance and checklist screens | 2 days |
| Testing | 2 days |
| **Total** | **18-25 days** |

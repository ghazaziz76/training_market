# Training Market App Architecture

## 1. Overview

**Training Market** is a two sided training marketplace platform that connects:

- **Employers**
- **Individuals**
- **Training Providers**
- **AI Matching Engine**
- **HRD Corp Grant Guidance Layer**

The platform allows employers and individuals to search for suitable training programs, while training providers publish and manage their training offerings. An AI layer matches demand with supply and, where relevant, provides employers with the information required to proceed with **HRD Corp training grant** applications.

The platform operates as an **interactive training storefront and intelligent marketplace** where employers can both discover training through browsing and search, and broadcast training requests that training providers can respond to competitively.

## 2. Business Model

### Free Users
- Employers register for free
- Individuals register for free

### Paid Users
- Training Providers pay a **nominal annual subscription fee**
- Optional future upsell:
  - premium visibility for training programs
  - featured provider listing
  - analytics dashboard
  - lead management tools
  - API integration packages
  - featured banner placement on storefront
  - promoted program cards
  - priority ranking in broadcast request notifications

## 3. Core User Groups

### A. Employers
Employers use the platform to:
- browse the interactive training storefront with featured, trending, and recommended programs
- search for training by topic, industry, skill area, job role, delivery mode, location, price, and date
- identify suitable programs for workforce development
- receive AI based training recommendations
- interact with the AI Training Advisor for conversational training guidance
- broadcast training requests to all registered training providers
- receive and compare competitive proposals from training providers
- receive HRD Corp related application guidance
- use the HRD Corp Levy Optimizer to plan levy utilization
- shortlist, compare, and contact training providers
- manage team training requests and enrolment intentions
- build and track annual training plans
- participate in group training pools with other employers
- track training effectiveness post completion

### B. Individuals
Individuals use the platform to:
- browse the interactive training storefront personalized to career goals
- search for personal or career development training
- compare programs across providers
- view program details, schedules, fees, and delivery options
- receive AI based recommendations based on career goals, skill gaps, and interests
- interact with the AI Training Advisor for personalized guidance
- save favorites and track applications or enquiries

### C. Training Providers
Training providers use the platform to:
- create and manage provider profiles
- upload and maintain training programs
- define program metadata such as category, duration, fees, target audience, learning outcomes, schedules, delivery mode, and accreditation
- manage program promotion and featured listings on the storefront
- receive and respond to employer broadcast training requests
- submit competitive proposals with quotation, program details, and supporting documents
- receive leads or applications from employers and individuals
- monitor client engagement and enquiry status
- view analytics on views, clicks, enquiries, and match rates
- track quality tier status and work toward higher tiers
- maintain HRD Corp relevant program fields where applicable

### D. AI Matching Engine
The AI layer is responsible for:
- matching employer or individual needs to available training supply
- ranking training relevance
- recommending alternatives
- identifying training gaps where no suitable program exists
- generating summaries and rationale for why a specific program is recommended
- supporting employer readiness for HRD Corp grant related action
- powering the conversational AI Training Advisor
- driving the HRD Corp Levy Optimizer recommendations
- generating training market intelligence insights
- matching employers for group training pool opportunities
- auto suggesting relevant training providers for broadcast requests
- incorporating training effectiveness data into recommendation ranking

## 4. Platform Objectives

The system should achieve the following:

1. Centralise searchable training supply from multiple providers
2. Make training discovery easier for employers and individuals through an interactive storefront
3. Improve matching quality between demand and available programs
4. Reduce decision friction using AI recommendations and conversational AI guidance
5. Support employers with HRD Corp related information after matching
6. Create a scalable subscription based marketplace for training providers
7. Enable two way marketplace dynamics where employers can broadcast needs and providers compete
8. Help employers maximize HRD Corp levy utilization
9. Build a data driven training intelligence ecosystem for the Malaysian market
10. Differentiate through features that competitors cannot easily replicate

## 5. High Level Functional Architecture

## 5.1 Front End Layers

### Employer Portal

#### Employer Home — Training Storefront
The employer lands on an interactive training storefront upon login, not a blank dashboard.

Components:
- hero banner carousel with featured training programs, seasonal promotions, and new arrivals
- recommended for you section with AI powered personalized recommendations based on employer profile, industry, and past searches
- trending programs section showing most searched and most enquired programs this week and month
- browse by category with visual category cards such as Leadership, IT, Safety, Finance, and others
- browse by industry showing training relevant to the employer industry
- new programs section with recently added programs from training providers
- search bar with auto suggest always visible in prominent placement
- quick filters for delivery mode, location, price range, and duration
- provider spotlight section featuring verified and top tier training providers
- upcoming sessions section showing programs with sessions starting soon
- social proof feed showing anonymized activity such as number of companies in same industry that enrolled in a program
- industry benchmark indicators such as average training spend in employer sector

#### Employer Core Functions
- registration and login
- company profile
- workforce training needs input
- search and filter training
- AI recommendation dashboard
- AI Training Advisor chatbot for conversational training guidance
- shortlist and compare programs
- request quotation or enquire
- broadcast training request to all registered providers
- view and compare provider proposals from broadcast requests
- HRD Corp guidance view
- HRD Corp Levy Optimizer dashboard
- annual training plan builder
- group training pool participation
- training effectiveness tracking and follow up surveys
- application tracking
- smart training calendar with conflict detection
- training ROI and spend dashboard

### Individual Portal

#### Individual Home — Training Storefront
Similar interactive storefront personalized for individuals.

Components:
- recommended based on career goals and skill interests
- popular programs among similar learners
- browse by category and skill area
- free vs paid program filters
- learning path suggestions
- search bar with auto suggest

#### Individual Core Functions
- registration and login
- personal profile
- career interest and skill goals input
- search and filter training
- AI recommendation dashboard
- AI Training Advisor chatbot
- save programs
- direct enquiry or enrolment request
- learning history

### Training Provider Portal
Functions:
- registration and subscription payment
- provider company profile
- training catalog management with add and edit
- schedule management
- trainer and accreditation details
- pricing management
- program promotion tools including featured listing, promotional banners, special offers, and highlight tags
- preview of how program card appears on employer and individual storefront
- promotion scheduling with start and end dates
- training request feed showing all open employer broadcast requests
- request filter by industry, topic, location, and budget
- proposal submission with quotation, program details, trainer info, and supporting documents
- proposal status tracking per request
- enquiries and lead tracking
- client engagement tracker showing status per employer enquiry
- quality tier dashboard showing current tier and progress toward next tier
- analytics dashboard
- subscription renewal

### Admin Portal
Functions:
- user management
- provider approval and verification
- provider quality tier management and override
- program moderation
- taxonomy and category management
- AI rule oversight
- storefront content management including banners, featured programs, and spotlights
- subscription and billing management
- broadcast request moderation
- reporting and audit logs
- grant guidance rules management
- market intelligence configuration
- group training pool oversight
- support ticket handling

### Portal Theme Design

Each portal uses a distinct color theme so users immediately recognise which portal they are in. All three themes share the same Tailwind Slate scale for text and backgrounds to keep typography consistent.

#### User Portal Theme (Employers and Individuals)
Primary color: Blue. Conveys trust, professionalism, and discovery.

| Role | Color | Hex |
|------|-------|-----|
| Primary | Blue | #2563EB |
| Primary Dark | Deep Blue | #1D4ED8 |
| Primary Light | Soft Blue | #DBEAFE |
| Accent | Teal | #0D9488 |
| Background | White and Light Grey | #F8FAFC |
| Text | Slate | #1E293B |

#### Vendor Portal Theme (Training Providers)
Primary color: Violet. Feels like a business dashboard, distinct from the user portal. Amber accent for CTAs, analytics highlights, and subscription badges.

| Role | Color | Hex |
|------|-------|-----|
| Primary | Violet | #7C3AED |
| Primary Dark | Deep Violet | #6D28D9 |
| Primary Light | Soft Violet | #EDE9FE |
| Accent | Amber | #F59E0B |
| Background | White and Slate | #F8FAFC |
| Text | Slate | #1E293B |

#### SuperAdmin Portal Theme
Primary color: Dark Slate. Dark sidebar layout following industry standard for admin dashboards. Emerald accent for healthy status and approved actions. Red for alerts and moderation actions.

| Role | Color | Hex |
|------|-------|-----|
| Primary | Dark Slate | #0F172A |
| Sidebar | Charcoal | #1E293B |
| Accent | Emerald | #10B981 |
| Danger | Red | #EF4444 |
| Warning | Amber | #F59E0B |
| Background | Grey | #F1F5F9 |
| Text on Dark | White | #F8FAFC |
| Text on Light | Slate | #334155 |

## 5.2 Back End Service Layers

### Authentication and Access Control Service
Responsibilities:
- sign up and login
- role based access control
- employer, individual, provider, admin roles
- password reset
- session and token management

### User Profile Service
Responsibilities:
- employer company profiles
- individual learner profiles
- provider profiles
- preferences and settings

### Training Catalog Service
Responsibilities:
- program creation, update, archive
- category taxonomy
- search indexing
- schedule and session records
- trainer and provider linkage
- metadata validation

### Search and Discovery Service
Responsibilities:
- keyword search
- filtering
- ranking
- geolocation and delivery mode filtering
- relevance scoring
- auto suggest for search bar
- employer search history logging
- recent search and saved search recall

### AI Matching Service
Responsibilities:
- demand capture from employers and individuals
- program to need matching
- ranking and recommendation
- explanation engine
- suggested alternatives
- skill gap analysis
- lead routing
- effectiveness weighted ranking using post training outcome data

### AI Training Advisor Service
Responsibilities:
- conversational AI interface for employers and individuals
- context aware follow up questions to understand training needs
- real time program recommendations within conversation
- multi turn dialogue support for refining requirements
- integration with training catalog and AI matching for live results

### HRD Corp Guidance Service
Responsibilities:
- determine whether the matched training appears relevant for HRD Corp related application flow
- display required information fields for employer action
- show guidance notes, eligibility related indicators, and supporting program information
- generate an employer side checklist for next steps
- guide employers to grant related process pages or internal workflow

### HRD Corp Levy Optimizer Service
Responsibilities:
- employer levy balance input or integration
- levy utilization tracking and remaining balance display
- AI driven suggestions on how to maximize levy before year end
- recommended programs that fit within remaining levy budget
- levy utilization planner showing which programs for which teams and when
- alerts when levy is approaching expiry with low utilization

### Subscription and Billing Service
Responsibilities:
- provider annual subscription plans
- invoicing
- payment status
- renewal alerts
- suspension for expired subscription

### Enquiry and Lead Management Service
Responsibilities:
- employer to provider enquiries
- individual to provider enquiries
- lead capture
- lead status tracking
- notifications

### Training Request Broadcast Service
Responsibilities:
- employer training request creation and management
- broadcast notification to all registered training providers
- AI auto suggestion of relevant providers for each request
- training provider proposal submission and tracking
- employer view of all proposals per request
- proposal comparison tools
- request status lifecycle including open, reviewing, closed, and awarded
- request expiry and deadline management
- filtering and relevance matching for training providers

### Competitive Bidding Service
Responsibilities:
- proposal count visibility for training providers without revealing details
- AI powered value scoring of proposals for employer view
- value add offer support such as free coaching, extra materials, or extended support
- award tracking and selected provider badge assignment
- bid analytics for training providers

### Content and Promotion Service
Responsibilities:
- featured program management
- banner and carousel content scheduling
- promotional offer management including early bird, group discount, and limited time offers
- trending and popular program calculation
- new program feed generation
- category and industry browsing content
- provider spotlight rotation

### Personalization Service
Responsibilities:
- employer homepage personalization based on profile and behavior
- individual homepage personalization based on goals and interests
- recently viewed programs tracking
- saved searches
- because you searched for X recommendation blocks
- returning user context to pick up where the user left off

### Group Training Pool Service
Responsibilities:
- detect overlapping training needs across multiple employers
- suggest group session opportunities to participating employers
- coordinate group enrollment across employers
- enable training provider group rate offers
- manage participant allocation per employer within pooled sessions
- notification to employers when pool opportunities arise

### Smart Training Calendar Service
Responsibilities:
- unified calendar view showing all available sessions across all training providers
- employee scheduling conflict detection
- optimal timing suggestions based on existing training schedule
- over training alerts when employees have too many programs scheduled
- peak and off peak training period indicators
- calendar sync with Google Calendar and Outlook

### Training Effectiveness Service
Responsibilities:
- post training KPI checkpoint configuration by employer
- automated follow up surveys at 30, 60, and 90 days after training
- employer impact rating versus expected outcomes
- effectiveness data feed back into AI matching service
- aggregate effectiveness scores per program and provider
- effectiveness reporting for employer ROI dashboard

### Market Intelligence Service
Responsibilities:
- training market trend analysis for employers showing trending skills and topics by industry
- employer benchmarking showing average spend per employee in sector and training coverage rates
- training provider opportunity gap analysis showing high demand topics with low supply
- provider pricing benchmarking against market average
- seasonal and regional training demand patterns
- anonymized aggregated insights generation

### Provider Quality Tier Service
Responsibilities:
- quality tier calculation based on verification status, completed programs, ratings, response time, and accreditation
- tier assignment including Verified, Trusted, and Premium levels
- tier badge display management on storefront and search results
- tier progression tracking and notification to providers
- tier based visibility and ranking boost in search and recommendations

### Annual Training Plan Service
Responsibilities:
- employer input of departments, team sizes, skill gaps, and annual budget
- AI generated suggested annual training plan with programs, quarters, and estimated costs
- employer adjustment and approval workflow
- execution tracking against plan throughout the year
- year end completion reporting
- exportable plan and progress report in PDF format

### Notification Service
Responsibilities:
- email alerts
- in app notifications
- subscription reminders
- enquiry notifications
- saved search alerts
- recommendation alerts
- broadcast request notifications to all training providers
- proposal status notifications to training providers
- training date reminders for enrolled participants
- HRD Corp application deadline reminders
- HRD Corp claim submission deadline reminders
- stale listing alerts for training providers who have not updated programs
- re engagement nudges for inactive employers
- group training pool opportunity notifications
- levy utilization warnings

### Analytics and Reporting Service
Responsibilities:
- platform usage analytics
- search trends
- conversion metrics
- provider performance metrics
- AI recommendation performance
- admin reporting
- training effectiveness analytics
- market intelligence reporting
- broadcast request and proposal analytics

## 6. Core Data Architecture

## 6.1 Main Entities

### User
Fields:
- user_id
- role
- full_name
- email
- phone
- password_hash
- status
- created_at

### Employer Profile
Fields:
- employer_id
- company_name
- registration_no
- industry
- company_size
- contact_person
- location
- HRD_Corp_registered_status
- HRD_Corp_levy_balance
- training_interests

### Individual Profile
Fields:
- individual_id
- occupation
- education_level
- location
- skill_interests
- career_goals
- preferred_training_mode

### Training Provider
Fields:
- provider_id
- provider_name
- registration_no
- business_description
- contact_person
- website
- accreditation_details
- quality_tier
- quality_tier_updated_at
- HRD_Corp_registered_provider
- response_rate
- average_response_time
- subscription_plan
- subscription_start
- subscription_end
- status

### Training Program
Fields:
- program_id
- provider_id
- title
- category
- subcategory
- description
- learning_outcomes
- target_audience
- industry_focus
- skill_tags
- delivery_mode
- location
- duration
- fee
- schedule
- certification
- HRD_Corp_relevant_fields
- effectiveness_score
- status

### Training Need Request
Fields:
- request_id
- requester_type
- requester_id
- title
- need_description
- target_skills
- budget_range
- preferred_mode
- preferred_location
- timeframe
- industry_context
- created_at

### AI Match Record
Fields:
- match_id
- request_id
- program_id
- match_score
- match_reason
- ranking_position
- created_at

### Enquiry
Fields:
- enquiry_id
- requester_id
- provider_id
- program_id
- enquiry_type
- message
- status
- created_at

### Subscription
Fields:
- subscription_id
- provider_id
- plan_name
- billing_cycle
- amount
- payment_status
- start_date
- end_date

### Training Request Broadcast
Fields:
- request_id
- employer_id
- title
- description
- target_audience
- participant_count
- preferred_mode
- preferred_location
- preferred_dates
- budget_range
- industry_context
- target_skills
- response_deadline
- status (open, reviewing, closed, awarded)
- created_at

### TP Proposal
Fields:
- proposal_id
- request_id
- provider_id
- program_id (nullable if custom proposal)
- proposal_message
- proposed_fee
- proposed_schedule
- trainer_details
- value_add_offers
- attachments
- status (submitted, shortlisted, selected, rejected)
- created_at

### Featured Listing
Fields:
- listing_id
- program_id
- provider_id
- listing_type (featured, spotlight, banner)
- start_date
- end_date
- priority_rank
- status

### Promotion
Fields:
- promotion_id
- program_id
- provider_id
- promotion_type (early_bird, group_discount, limited_time)
- discount_value
- start_date
- end_date
- status

### User Activity
Fields:
- activity_id
- user_id
- activity_type (view, search, save, compare, enquire, click)
- target_id
- target_type (program, provider, category)
- created_at

### Group Training Pool
Fields:
- pool_id
- program_id
- skill_topic
- delivery_mode
- location
- target_date_range
- participating_employers
- total_participants
- status (forming, confirmed, completed)
- created_at

### Effectiveness Record
Fields:
- record_id
- program_id
- provider_id
- employer_id
- kpi_description
- baseline_value
- target_value
- actual_value
- survey_30_day
- survey_60_day
- survey_90_day
- impact_rating
- created_at

### Annual Training Plan
Fields:
- plan_id
- employer_id
- year
- total_budget
- planned_programs
- planned_participants
- completion_percentage
- status (draft, active, completed)
- created_at

### Levy Utilization Record
Fields:
- record_id
- employer_id
- year
- total_levy
- utilized_amount
- remaining_amount
- utilization_percentage
- last_updated

## 7. AI Matching Architecture

## 7.1 Inputs to the AI Engine
The AI engine should ingest:
- employer training need descriptions
- individual skill goals and interests
- program descriptions from training providers
- structured metadata such as category, duration, fee, delivery mode, industry, and learning outcomes
- historical search and click behavior
- optional feedback loop from accepted and rejected recommendations
- training effectiveness outcome data from post training surveys
- employer levy balance and utilization data
- broadcast request descriptions and employer requirements
- group training pool demand signals

## 7.2 AI Core Functions

### Semantic Matching
Matches user needs to program content using meaning, not only keywords.

### Ranking Engine
Ranks programs based on:
- relevance to stated need
- target audience fit
- budget compatibility
- delivery mode preference
- location preference
- schedule suitability
- provider credibility indicators
- provider quality tier
- historical success or engagement data
- training effectiveness scores from past participants

### Recommendation Explanation
Generates a short explanation such as:
- why the training is relevant
- what need it addresses
- whether it suits the employer or individual profile

### Gap Detection
Identifies when current supply does not sufficiently meet demand.

### Continuous Learning Loop
Improves recommendation quality from:
- clicks
- shortlisted programs
- enquiries sent
- enrollments
- employer or individual feedback
- post training effectiveness ratings
- proposal acceptance patterns from broadcast requests

## 7.3 AI Training Advisor

The AI Training Advisor is a conversational interface that acts as a personal training consultant for employers and individuals.

Functions:
- accepts natural language input describing training needs or challenges
- asks follow up questions to clarify requirements such as team size, experience level, budget, and timeline
- recommends specific programs from the catalog with reasoning
- supports multi turn conversation for refining results
- suggests alternatives when employer adjusts criteria
- integrates with live catalog data for real time availability and pricing
- can initiate a broadcast request on behalf of the employer if no suitable program is found

Example interaction:
- Employer says: my sales team is underperforming in closing deals
- AI asks: how many people, what experience level, what budget, when do you need this
- AI recommends: here are 3 programs that address sales closing skills, here is why each one fits

## 7.4 HRD Corp Levy Optimization AI

Functions:
- analyzes employer remaining levy balance against time remaining in the year
- cross references employer industry and team profile with available programs
- generates a recommended levy utilization plan
- prioritizes recommendations by impact and levy fit
- alerts when approaching year end with underutilized levy

## 7.5 Market Intelligence AI

Functions:
- aggregates anonymized search, enquiry, and enrollment data across the platform
- identifies trending skills and training topics by industry and region
- detects supply gaps where employer demand exceeds available programs
- generates periodic market intelligence reports
- provides training providers with demand signals for program development

## 7.6 Group Training Pool Matching

Functions:
- detects overlapping training needs across employers based on topic, location, delivery mode, and timeframe
- calculates minimum viable pool size for group session feasibility
- notifies eligible employers of pool opportunity
- suggests optimal scheduling for pooled sessions

## 8. HRD Corp Guidance Layer

This layer is not the training provider marketplace itself. It is a support layer for employers after a suitable training match is found.

Possible functions:
- indicate whether the program has the fields usually required for employer follow up
- display provider information needed for the next step
- display structured program information useful for HRD Corp related submission preparation
- show a checklist of information the employer should confirm before applying
- guide employers to grant related process pages or internal workflow

Suggested data points:
- provider details
- program title
- program objectives
- training mode
- training duration
- trainer category
- fee breakdown
- supporting documentation availability
- relevant notes for employer action

## 9. User Journey Architecture

## 9.1 Employer Journey

### Path A: Search and Discover via Storefront
1. Employer registers for free
2. Employer completes company and training need profile
3. Employer lands on interactive training storefront with featured, trending, and recommended programs
4. Employer browses storefront or searches and filters training
5. AI returns ranked matching programs
6. Employer reviews program details on full interactive program page
7. Employer shortlists, compares, or enquires with provider
8. System displays HRD Corp guidance information where relevant
9. Employer proceeds with provider engagement and internal grant application action

### Path B: Broadcast Training Request
1. Employer registers for free
2. Employer completes company and training need profile
3. Employer creates a training request broadcast with requirements
4. All registered training providers receive notification
5. Interested training providers submit proposals with quotation, program details, and supporting documents
6. Employer receives proposals in dashboard
7. AI ranks proposals by value score
8. Employer compares proposals side by side
9. Employer shortlists and selects preferred provider
10. System displays HRD Corp guidance information where relevant
11. Employer proceeds with engagement and internal grant application action

### Path C: AI Training Advisor Guided
1. Employer registers for free
2. Employer opens AI Training Advisor chatbot
3. Employer describes training need in natural language
4. AI asks follow up questions and refines understanding
5. AI recommends specific programs with reasoning
6. Employer reviews recommendations and selects
7. If no suitable program found, AI can initiate a broadcast request
8. Employer proceeds with engagement

## 9.2 Individual Journey
1. Individual registers for free
2. Individual sets interests and career goals
3. Individual lands on personalized training storefront
4. Individual browses or searches training
5. AI recommends suitable programs
6. Individual compares and saves programs
7. Individual enquires or registers with provider

## 9.3 Training Provider Journey

### Path A: Publish Programs and Receive Enquiries
1. Provider registers
2. Provider purchases annual subscription
3. Provider completes profile and verification
4. Provider uploads training programs
5. Provider configures promotions and featured listings
6. Programs are indexed by search and AI services and appear on storefront
7. Provider receives enquiries and leads
8. Provider monitors dashboard analytics
9. Provider tracks quality tier progress
10. Provider renews annual subscription

### Path B: Respond to Employer Broadcast Requests
1. Provider receives notification of new employer training request
2. Provider reviews request details in training request feed
3. Provider filters requests relevant to their offerings
4. Provider submits proposal with quotation, program details, trainer info, and supporting documents
5. Provider tracks proposal status (submitted, shortlisted, selected, rejected)
6. If selected, provider proceeds with employer engagement
7. Provider earns award badge for selected proposals

## 10. Suggested System Architecture

## 10.1 Application Layer
- Web application for employers, individuals, providers, and admin
- Interactive storefront experience with dynamic content
- Mobile responsive interface
- AI Training Advisor chatbot interface
- Future mobile app optional

## 10.2 API Layer
- REST API or GraphQL API
- secure role based endpoints
- external integration endpoints where needed
- AI advisor conversation API
- broadcast request and proposal API

## 10.3 Service Layer
- auth service
- user profile service
- training catalog service
- search and discovery service
- AI matching service
- AI training advisor service
- HRD Corp guidance service
- HRD Corp levy optimizer service
- subscription service
- notification service
- analytics service
- training request broadcast service
- competitive bidding service
- content and promotion service
- personalization service
- group training pool service
- smart training calendar service
- training effectiveness service
- market intelligence service
- provider quality tier service
- annual training plan service

## 10.4 Data Layer
- relational database for core transactional records
- search index for training discovery
- object storage for provider documents and program files
- analytics store for reporting
- vector or embedding store for semantic AI matching if needed
- conversation store for AI training advisor dialogue history
- time series store for market intelligence trend data

## 10.5 Infrastructure Layer
- cloud hosted deployment
- scalable container based services
- secure payment gateway integration
- monitoring and logging
- backup and disaster recovery

## 11. Non Functional Requirements

### Security
- encrypted passwords
- role based access
- secure payment handling
- audit logs
- provider verification controls
- data privacy compliance
- anonymization of market intelligence data

### Performance
- fast search response
- scalable catalog indexing
- AI response within practical time limits
- AI training advisor conversational response within 2 to 3 seconds
- storefront content loading within acceptable thresholds
- support growth in providers and programs

### Reliability
- backup and recovery
- service monitoring
- error tracking
- uptime targets

### Maintainability
- modular service design
- clear API contracts
- admin control for taxonomy and rules
- easy integration for future extensions

### Explainability
The AI should not behave like a black box only. Users need:
- match reason
- recommendation rationale
- confidence indicators where appropriate
- AI training advisor must explain why it recommends specific programs
- levy optimizer must show reasoning behind utilization suggestions

## 12. Revenue Architecture

Primary revenue stream:
- annual subscription fee from training providers

Possible secondary revenue streams:
- featured listing fees
- sponsored placement and banner advertising on storefront
- promoted program cards on storefront
- premium analytics for providers
- employer enterprise dashboard
- API integration with corporate LMS or HR systems
- commission on completed enrolment in future, if strategically appropriate
- premium AI Training Advisor features for employers
- market intelligence report access for training providers

## 13. MVP Scope

For version 1, focus on:

### Must Have
- employer registration
- individual registration
- provider registration and subscription
- provider training program upload
- interactive training storefront for employers and individuals
- searchable training catalog with filters and compare
- training program cards with key details and quick actions
- AI recommendation engine basic version
- employer broadcast training request
- training provider proposal submission
- employer HRD Corp guidance page
- enquiry form
- admin moderation
- basic provider quality tier (Verified level)

### Should Come Later
- AI Training Advisor conversational chatbot
- HRD Corp Levy Optimizer
- group training pool
- competitive bidding with value scoring
- training effectiveness tracking
- market intelligence dashboard
- annual training plan builder
- smart training calendar with conflict detection
- advanced personalization
- employer to employer social proof
- provider analytics depth
- advanced quality tiers (Trusted and Premium)
- mobile app
- direct booking and payment for individuals
- review and rating system
- enterprise dashboards
- external integrations

## 14. Critical Design Decisions

### Decision 1
The platform's primary value is **demand side search and matching**, not just listing programs.

### Decision 2
HRD Corp guidance should be treated as a **post match support layer**, not as the whole platform.

### Decision 3
Training provider subscription should remain simple in early phase:
- one nominal annual plan first
- avoid overcomplicated pricing at launch

### Decision 4
AI must explain recommendations clearly. If it only produces opaque results, trust will be weak.

### Decision 5
Program metadata quality is critical. Weak provider data will damage match quality.

### Decision 6
The storefront must feel like an **interactive marketplace**, not a static directory. Employers should see featured, trending, and personalized content immediately on login.

### Decision 7
The platform supports **two discovery modes**: employer searches for programs (pull) and employer broadcasts a request for providers to respond (push). Both modes are core to the marketplace.

### Decision 8
Differentiating features such as Levy Optimizer, AI Training Advisor, Group Training Pool, and Market Intelligence create a **data flywheel** that becomes harder for competitors to replicate over time. These should be prioritized after MVP.

### Decision 9
The provider quality tier system must be **transparent and meritocratic**. Providers earn higher tiers through verified quality, not just payment.

## 15. Key Risks

### Risk 1: Poor Quality Listings
If providers upload incomplete or vague program information, search and AI matching will perform badly.

### Risk 2: Weak Early Marketplace Supply
If there are too few quality providers, employers and individuals will not find enough options.

### Risk 3: AI Overclaim
If the AI appears to promise certainty without clear rationale, trust will drop.

### Risk 4: Grant Guidance Complexity
If HRD Corp related guidance is inaccurate or oversimplified, employer confidence will be affected.

### Risk 5: Provider Churn
If providers do not see enough leads, even a nominal annual fee may feel unjustified.

### Risk 6: Low Broadcast Request Engagement
If training providers do not actively respond to broadcast requests, employers will lose confidence in the feature.

### Risk 7: Storefront Content Staleness
If featured content, trending programs, and promotions are not refreshed regularly, the storefront will feel static and engagement will drop.

### Risk 8: AI Training Advisor Hallucination
If the conversational AI recommends programs that do not exist or provides inaccurate information, trust will be damaged. The advisor must only reference actual catalog data.

### Risk 9: Market Intelligence Data Privacy
If market intelligence exposes identifiable employer or provider data, trust and compliance will be compromised. All intelligence data must be anonymized and aggregated.

## 16. Differentiating Features Architecture

The following features are designed to differentiate Training Market from competitors and create a defensible market position.

### 16.1 AI Training Advisor
A conversational AI chatbot that acts as a personal training consultant. Instead of requiring employers to know what to search for, the advisor guides them through a dialogue to understand their needs and recommends specific programs with clear reasoning. No training marketplace currently offers this.

### 16.2 HRD Corp Levy Optimizer
Most Malaysian employers do not fully utilize their HRD Corp levy. The optimizer shows remaining balance, suggests how to maximize utilization before year end, and recommends programs that fit within the remaining budget. This feature alone gives employers a reason to return regularly.

### 16.3 Group Training Pool
Small employers often cannot fill a private training session alone. The platform detects overlapping needs across employers and suggests pooled sessions where multiple companies share a training class at group rates. This reduces cost for employers and fills seats for providers.

### 16.4 Training Market Intelligence
The platform generates anonymized, aggregated insights from search, enquiry, and enrollment data. Employers see what skills their industry is training for and how they compare. Providers see demand gaps and pricing benchmarks. This makes the platform the source of truth for the Malaysian training market.

### 16.5 Competitive Bidding on Broadcast Requests
When employers broadcast training requests, providers compete with proposals. Employers see AI ranked proposals by value, not just price. Providers can offer value adds to win business. This creates genuine marketplace competition that drives quality up and prices down.

### 16.6 Training Effectiveness Tracking
After training, employers set KPI checkpoints and the platform sends automated follow up surveys at 30, 60, and 90 days. Effectiveness data feeds back into the AI ranking engine. Over time, the platform recommends programs that deliver real results, not just popular ones. No competitor tracks whether training actually worked.

### 16.7 Smart Training Calendar
A unified calendar view across all providers with employee conflict detection, optimal timing suggestions, and over training alerts. Turns scheduling from manual coordination into intelligent planning.

### 16.8 Employer Social Proof
Anonymized indicators showing what other employers in the same industry are doing. Examples include how many companies enrolled in a program, which skills are trending in the sector, and aggregate ratings from verified completions. Social proof drives decisions.

### 16.9 Provider Quality Tier System
A transparent tier system with Verified, Trusted, and Premium levels based on objective criteria including verification status, completed programs, ratings, response time, and accreditation. Higher tiers earn better visibility. Providers are motivated to improve quality. Employers trust the marketplace.

### 16.10 Annual Training Plan Builder
Helps employers plan their entire year of training. AI generates a suggested plan based on departments, team sizes, skill gaps, and budget. The platform tracks execution throughout the year and generates completion reports. This embeds the platform into the employer annual planning cycle.

### 16.11 Data Flywheel Effect
These features create a compounding advantage: more employers generate more data, which makes AI smarter, which improves recommendations, which attracts more employers. Combined with market intelligence, levy optimization, and effectiveness tracking, this data moat becomes very difficult for competitors to replicate.

## 17. Recommended Next Step Architecture Documents

After this high level architecture, the next documents should be:

1. Product Requirements Document
2. Detailed User Flow Document
3. Database Schema
4. AI Matching Logic Specification
5. AI Training Advisor Specification
6. Provider Subscription and Billing Specification
7. HRD Corp Guidance Rules Document
8. HRD Corp Levy Optimizer Specification
9. Training Request Broadcast and Bidding Specification
10. Storefront Content and Personalization Specification
11. Provider Quality Tier Rules Document
12. Market Intelligence Data Specification
13. Admin Moderation Workflow
14. MVP Development Roadmap

## 18. Simple Architecture Summary

At a high level, **Training Market** operates as follows:

- **Employers and individuals** create demand by browsing the interactive storefront, searching for training, using the AI Training Advisor, or broadcasting training requests
- **Training providers** create supply by publishing training programs, managing promotions, and responding to broadcast requests with competitive proposals
- **AI** matches demand with the most relevant supply, powers conversational guidance, optimizes levy utilization, and generates market intelligence
- **HRD Corp guidance** helps employers act on matched training opportunities and maximize levy usage
- **Training providers** fund the marketplace through annual subscription fees
- **Quality tiers, effectiveness tracking, and market intelligence** create trust, accountability, and a data driven ecosystem
- **Group training pools** enable cost effective training for smaller employers
- **The data flywheel** of usage, effectiveness, and intelligence makes the platform smarter and harder to replicate over time

This makes the platform a **training discovery, matching, intelligence, and employer action support ecosystem** that goes far beyond a training listing directory.

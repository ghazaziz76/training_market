# Phase 4: Training Storefront and Search — Detailed Development Plan

## 1. Objective

Build the interactive training storefront that employers and individuals see upon login, with dynamic content (featured, trending, recommended, new programs), full search and filter capabilities, program cards, and detailed program pages. The storefront should feel like a live marketplace, not a static directory.

---

## 2. Prerequisites

- Phase 1 completed (database with all tables)
- Phase 2 completed (auth and user profiles)
- Phase 3 completed (programs exist in database, published programs available)
- Seed data loaded with sample programs across categories

---

## 3. Detailed Tasks

### 3.1 Backend — Search and Discovery Service

#### 3.1.1 Full Text Search Endpoint

**GET /api/search/programs**
```
Public endpoint (results may vary for authenticated users)

Query Params:
- q: string (search query)
- category_id: UUID
- subcategory_id: UUID
- delivery_mode: "online" | "physical" | "hybrid"
- state: string
- city: string
- min_fee: number
- max_fee: number
- min_duration_days: number
- max_duration_days: number
- hrd_corp_claimable: boolean
- provider_tier: "verified" | "trusted" | "premium"
- skill_tags: UUID[] (comma separated)
- industry: string
- has_upcoming_schedule: boolean
- sort_by: "relevance" | "fee_asc" | "fee_desc" | "newest" | "popular" | "rating"
- page: number (default 1)
- limit: number (default 20, max 50)

Process:
1. Build PostgreSQL query using pg_trgm for fuzzy text matching on title and description
2. Apply all filters as WHERE clauses
3. Calculate relevance score:
   - text match similarity score (pg_trgm similarity)
   - provider quality tier weight (premium > trusted > verified)
   - recency boost (newer programs score higher)
   - engagement boost (more views/enquiries score higher)
   - effectiveness score weight
4. Apply sort order
5. Join with provider (for name, tier, logo), category, active promotions
6. Check for upcoming schedules if filter applied
7. Log search query to search_history (if authenticated)
8. Log as user_activity (search event)
9. Return paginated results

Response 200:
{
  data: [
    {
      program_id,
      title,
      short_description,
      category: { name, slug },
      provider: { provider_name, logo_url, quality_tier, average_rating },
      delivery_mode,
      city,
      state,
      duration_days,
      fee,
      early_bird_fee,
      hrd_corp_claimable,
      thumbnail_url,
      certification,
      skill_tags: [{ name }],
      next_schedule: { start_date, available_seats },
      active_promotions: [{ label, promotion_type, discount_value }],
      view_count,
      enquiry_count,
      effectiveness_score,
      relevance_score
    }
  ],
  pagination: { total, page, limit, total_pages },
  filters_applied: { ... },
  search_id: UUID (for analytics tracking)
}
```

#### 3.1.2 Auto-Suggest Endpoint

**GET /api/search/suggest**
```
Query Params:
- q: string (min 2 chars)
- limit: number (default 8)

Process:
1. Search program titles using pg_trgm similarity
2. Search category names
3. Search skill tag names
4. Return grouped suggestions

Response 200:
{
  programs: [{ program_id, title, provider_name }],
  categories: [{ category_id, name, slug }],
  skills: [{ tag_id, name }]
}

Cache: Redis with 5 minute TTL per query prefix
```

#### 3.1.3 Search History Endpoints

**GET /api/search/history**
```
Role: authenticated user
Returns last 20 searches for the user

Response:
{
  data: [
    { history_id, search_query, filters_applied, results_count, created_at }
  ]
}
```

**DELETE /api/search/history/:history_id**
```
Role: authenticated user
Deletes a specific search history entry
```

**DELETE /api/search/history**
```
Role: authenticated user
Clears all search history
```

---

### 3.2 Backend — Storefront Content Service

#### 3.2.1 Featured Content Endpoints

**GET /api/storefront/hero-banners**
```
Public endpoint
Returns active hero banners sorted by priority

Process:
1. Query featured_listings where listing_type = 'hero_banner'
2. Filter by status = 'active' and current date within start/end
3. Sort by priority_rank
4. Limit to 5

Response:
{
  data: [
    { listing_id, title, description, image_url, link_url, program_id, provider_id }
  ]
}

Cache: Redis with 15 minute TTL
```

**GET /api/storefront/featured-programs**
```
Public endpoint
Returns featured programs

Process:
1. Query featured_listings where listing_type = 'featured_program'
2. Join with training_programs and providers
3. Filter active and within date range
4. Sort by priority_rank
5. Limit to 12

Cache: Redis with 15 minute TTL
```

**GET /api/storefront/provider-spotlights**
```
Public endpoint
Returns spotlight providers

Process:
1. Query featured_listings where listing_type = 'provider_spotlight'
2. Join with training_providers
3. Filter active and within date range
4. Limit to 6

Cache: Redis with 15 minute TTL
```

#### 3.2.2 Dynamic Content Endpoints

**GET /api/storefront/trending**
```
Public endpoint
Query Params: limit (default 12)

Process:
1. Calculate trending score based on last 7 days:
   - view_count weight
   - enquiry_count weight (higher)
   - save_count weight
2. Only published programs with active schedules
3. Sort by trending score descending
4. Return top programs

Cache: Redis with 1 hour TTL (recalculated hourly by background job)
```

**GET /api/storefront/new-programs**
```
Public endpoint
Query Params: limit (default 12)

Process:
1. Query published programs ordered by published_at DESC
2. Only programs published within last 30 days
3. Limit to requested count
```

**GET /api/storefront/upcoming-sessions**
```
Public endpoint
Query Params: limit (default 12), days_ahead (default 30)

Process:
1. Query program_schedules with start_date within next X days
2. Filter status = 'open' and available_seats > 0
3. Join with programs and providers
4. Sort by start_date ASC
5. Return with urgency indicator (days until start)
```

**GET /api/storefront/categories-browse**
```
Public endpoint

Process:
1. Query top-level categories with program counts
2. Include icon and sort_order
3. Only categories with at least 1 published program

Response:
{
  data: [
    { category_id, name, slug, icon, program_count }
  ]
}

Cache: Redis with 1 hour TTL
```

**GET /api/storefront/industry-browse**
```
Public endpoint

Process:
1. Aggregate industry_focus values from published programs
2. Count programs per industry
3. Sort by count descending

Response:
{
  data: [
    { industry: "Manufacturing", program_count: 45 },
    { industry: "IT", program_count: 38 }
  ]
}

Cache: Redis with 1 hour TTL
```

#### 3.2.3 Personalized Content Endpoints

**GET /api/storefront/recommended**
```
Role: authenticated user
Query Params: limit (default 12)

Process:
1. Get user profile (industry, training_interests, skill_interests)
2. Get user recent activity (viewed programs, searches, saved)
3. Find programs matching user profile:
   - matching industry_focus
   - matching skill_tags to user interests
   - matching category to user interests
   - similar to recently viewed programs
4. Exclude already viewed programs (optional, or deprioritize)
5. Rank by relevance to user profile
6. Return top programs

Fallback (new user with no activity): return popular programs in user's industry
```

**GET /api/storefront/because-you-searched**
```
Role: authenticated user

Process:
1. Get user's last 5 search queries
2. For each query, find top 3 programs not yet viewed
3. Group by search query
4. Return grouped recommendations

Response:
{
  data: [
    {
      search_query: "leadership training",
      programs: [{ program card data }]
    }
  ]
}
```

**GET /api/storefront/recently-viewed**
```
Role: authenticated user
Query Params: limit (default 10)

Process:
1. Query user_activities where activity_type = 'view_program'
2. Order by created_at DESC
3. Join with programs
4. Return unique programs (deduplicated)
```

#### 3.2.4 Program Interaction Endpoints

**POST /api/programs/:program_id/view**
```
Role: authenticated user (or anonymous with session tracking)

Process:
1. Increment program view_count
2. Log user_activity (view_program)
3. Debounce: same user viewing same program within 30 min counts as 1 view
```

**POST /api/programs/:program_id/save**
```
Role: authenticated user

Process:
1. Insert into saved_programs (user_id, program_id)
2. Log user_activity (save_program)
3. If already saved, return 200 (idempotent)
```

**DELETE /api/programs/:program_id/save**
```
Role: authenticated user
Process: Remove from saved_programs
```

**GET /api/users/saved-programs**
```
Role: authenticated user
Query Params: page, limit

Returns saved programs with full card data, sorted by save date DESC
```

**POST /api/programs/compare**
```
Role: authenticated user

Request Body:
{
  program_ids: UUID[] (min 2, max 4)
}

Response:
{
  data: [
    {
      program_id, title, provider, category, fee, delivery_mode,
      duration, certification, hrd_corp_claimable, learning_outcomes,
      next_schedule, quality_tier, effectiveness_score
    }
  ]
}
```

---

### 3.3 Backend — Background Jobs

#### 3.3.1 Trending Score Calculator
- runs every hour via BullMQ scheduled job
- calculates trending score for all published programs based on last 7 days activity
- stores result in Redis cache
- used by GET /api/storefront/trending

#### 3.3.2 Storefront Cache Refresher
- runs every 15 minutes
- refreshes Redis cache for featured content, categories, industry browse
- ensures storefront always has fresh data even if no direct API calls

#### 3.3.3 View Count Aggregator
- batches view events and updates program view_count in bulk
- runs every 5 minutes
- prevents database write on every single view

---

### 3.4 Web Frontend — Employer Storefront Homepage

#### 3.4.1 Page Layout (/employer/home)
```
┌─────────────────────────────────────────────────┐
│  Header: Logo | Search Bar | Notifications | Profile │
├─────────────────────────────────────────────────┤
│  Hero Banner Carousel (auto-rotate every 5s)     │
│  [Banner 1] [Banner 2] [Banner 3] dots/arrows   │
├─────────────────────────────────────────────────┤
│  Quick Filters Bar:                              │
│  [All] [Online] [Physical] [Hybrid] [HRD Corp]  │
│  [Location ▼] [Category ▼] [Budget ▼]           │
├─────────────────────────────────────────────────┤
│  Recommended For You (if logged in)       [See All →] │
│  [Card] [Card] [Card] [Card] →scroll              │
├─────────────────────────────────────────────────┤
│  Trending Programs                        [See All →] │
│  [Card] [Card] [Card] [Card] →scroll              │
├─────────────────────────────────────────────────┤
│  Browse by Category                               │
│  [IT] [Leadership] [Safety] [Finance] [HR] [More] │
├─────────────────────────────────────────────────┤
│  New Programs                             [See All →] │
│  [Card] [Card] [Card] [Card] →scroll              │
├─────────────────────────────────────────────────┤
│  Browse by Industry                               │
│  [Manufacturing] [Healthcare] [Retail] [F&B] ...  │
├─────────────────────────────────────────────────┤
│  Upcoming Sessions (Starting Soon)        [See All →] │
│  [Card] [Card] [Card] [Card] →scroll              │
├─────────────────────────────────────────────────┤
│  Provider Spotlight                               │
│  [Provider Card] [Provider Card] [Provider Card]  │
├─────────────────────────────────────────────────┤
│  Recently Viewed (if logged in)           [See All →] │
│  [Card] [Card] [Card] [Card] →scroll              │
├─────────────────────────────────────────────────┤
│  Footer                                          │
└─────────────────────────────────────────────────┘
```

#### 3.4.2 Hero Banner Carousel Component
- auto-rotating carousel with 5 second interval
- navigation dots and arrows
- responsive image display
- click navigates to program detail or custom URL
- pause on hover
- touch swipe support

#### 3.4.3 Program Card Component (Reusable)
```
┌──────────────────────────────┐
│  [Thumbnail Image]            │
│  ┌─ HRD Corp ─┐ ┌─ Online ─┐│
│  └─────────────┘ └──────────┘│
│  Program Title (2 lines max)  │
│  Provider Name ✓ Premium      │
│  ★ 4.5 (23 reviews)          │
│  ────────────────────────────│
│  RM 1,500  │ 3 days │ KL     │
│  ┌─────────────────────────┐ │
│  │ 🏷 Early Bird: RM 1,200 │ │
│  └─────────────────────────┘ │
│  Next: 15 Jan 2027 (12 seats)│
│  ────────────────────────────│
│  [♡ Save] [Compare] [Enquire]│
└──────────────────────────────┘
```

Component props:
- program data object
- onSave callback
- onCompare callback
- onEnquire callback
- onClick (navigate to detail)
- compact mode (for smaller displays)
- show_match_score (for recommendation sections)

#### 3.4.4 Horizontal Scroll Section Component (Reusable)
- section title with "See All" link
- horizontal scrollable container
- left/right scroll arrows (hidden on mobile, show on desktop)
- snap scrolling
- touch swipe support
- show 4 cards on desktop, 2 on tablet, 1.5 on mobile (peek next card)
- loading skeleton while fetching

#### 3.4.5 Category Browse Component
- grid of category cards (icons + names + program counts)
- 6 visible, "More" button to expand
- click navigates to search results filtered by category
- responsive grid (3 columns desktop, 2 tablet, 2 mobile)

#### 3.4.6 Quick Filter Bar Component
- horizontal chip/pill filters
- delivery mode chips (toggle)
- location dropdown
- category dropdown
- budget range dropdown
- applying any filter navigates to search results page with filters pre-applied

#### 3.4.7 Search Bar Component (Global)
- always visible in header
- search icon + text input
- auto-suggest dropdown appears after 2 characters
- auto-suggest shows: programs (with provider), categories, skills
- keyboard navigation (arrow keys, enter to select)
- recent searches shown on focus (if no query typed)
- clear button
- submit navigates to search results page

---

### 3.5 Web Frontend — Search Results Page

#### 3.5.1 Page Layout (/search?q=xxx&filters...)
```
┌─────────────────────────────────────────────────┐
│  Search Bar (pre-filled with query)              │
├──────────────┬──────────────────────────────────┤
│  Filters     │  Results Header:                  │
│  Sidebar     │  "45 programs found for 'leadership'"│
│              │  Sort: [Relevance ▼]              │
│  Category    │  View: [Grid] [List]              │
│  ☐ IT        │                                   │
│  ☐ Leadership│  [Program Card] [Program Card]    │
│  ☐ Safety    │  [Program Card] [Program Card]    │
│              │  [Program Card] [Program Card]    │
│  Delivery    │                                   │
│  ☐ Online    │  ... more cards ...               │
│  ☐ Physical  │                                   │
│  ☐ Hybrid    │  [Load More] or Pagination        │
│              │                                   │
│  Price Range │                                   │
│  [___]-[___] │                                   │
│              │                                   │
│  Duration    │                                   │
│  [___]-[___] │                                   │
│              │                                   │
│  Location    │                                   │
│  [State ▼]   │                                   │
│              │                                   │
│  Provider    │                                   │
│  ☐ Premium   │                                   │
│  ☐ Trusted   │                                   │
│  ☐ Verified  │                                   │
│              │                                   │
│  HRD Corp    │                                   │
│  ☐ Claimable │                                   │
│              │                                   │
│  [Clear All] │                                   │
├──────────────┴──────────────────────────────────┤
│  No Results State:                               │
│  "No programs found. Try adjusting your filters" │
│  [Broadcast a Training Request] button           │
└─────────────────────────────────────────────────┘
```

#### 3.5.2 Filter Sidebar Component
- collapsible filter groups
- checkbox filters for categories, delivery mode, provider tier
- range inputs for price and duration
- dropdown for location (state)
- toggle for HRD Corp claimable
- active filter count badges
- "Clear All" button
- URL sync: filters reflected in URL query params (shareable links)
- mobile: filters open as bottom sheet or full-screen modal

#### 3.5.3 Search Results Grid/List Toggle
- grid view: 3 columns desktop, 2 tablet, 1 mobile
- list view: horizontal card layout with more text visible
- view preference saved in localStorage

#### 3.5.4 Sort Options
- Relevance (default for search queries)
- Price: Low to High
- Price: High to Low
- Newest First
- Most Popular (views + enquiries)
- Highest Rated

#### 3.5.5 Pagination
- option A: "Load More" button (infinite scroll feel)
- option B: numbered pagination (1, 2, 3... 10)
- show total results count
- 20 results per page

#### 3.5.6 No Results State
- friendly message
- suggestion to adjust filters
- suggestion to try different keywords
- CTA: "Can't find what you need? Broadcast a Training Request" → links to broadcast form

#### 3.5.7 Save Search Feature
- "Save this search" button on search results page
- saves query + filters combination
- user can view saved searches in their dashboard
- optional: alert when new programs match saved search

---

### 3.6 Web Frontend — Program Detail Page

#### 3.6.1 Page Layout (/programs/:slug)
```
┌─────────────────────────────────────────────────┐
│  Breadcrumb: Home > Category > Program Title     │
├─────────────────────────────────────────────────┤
│  ┌───────────────────┐  Program Title            │
│  │                   │  Provider Name ✓ Premium   │
│  │   Thumbnail       │  ★ 4.5 (23 reviews)       │
│  │                   │  Category > Subcategory    │
│  │                   │  Online | 3 days | KL      │
│  └───────────────────┘                           │
│                         RM 1,500                  │
│  [♡ Save] [Compare] [Enquire] [Request Quote]    │
│  ┌─ 🏷 Early Bird: RM 1,200 until 15 Dec ─┐     │
│  └─────────────────────────────────────────┘     │
├─────────────────────────────────────────────────┤
│  Tab Navigation:                                 │
│  [Overview] [Schedule] [Trainers] [Provider]     │
├─────────────────────────────────────────────────┤
│  Overview Tab:                                   │
│  ── Description ──                               │
│  (rich text content)                             │
│  ── Learning Outcomes ──                         │
│  (rich text content)                             │
│  ── Target Audience ──                           │
│  (text)                                          │
│  ── Prerequisites ──                             │
│  (text)                                          │
│  ── What You Get ──                              │
│  Duration: 3 days | Certification: Yes           │
│  Materials: Provided | Language: English         │
│  ── Skills Covered ──                            │
│  [Tag] [Tag] [Tag] [Tag]                        │
│  ── HRD Corp ──                                  │
│  ✅ HRD Corp Claimable | Scheme: SBL             │
├─────────────────────────────────────────────────┤
│  Schedule Tab:                                   │
│  ┌──────────────────────────────────────────┐   │
│  │ 15 Jan - 17 Jan 2027 | KL | 12 seats    │   │
│  │ 20 Feb - 22 Feb 2027 | Online | 20 seats │   │
│  └──────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  Trainers Tab:                                   │
│  [Photo] Trainer Name                            │
│  Qualification | Specialization                  │
│  Bio text...                                     │
├─────────────────────────────────────────────────┤
│  Provider Tab:                                   │
│  Provider Name | ✓ Premium                       │
│  Description... | Website | Location             │
│  [View Provider Profile]                         │
├─────────────────────────────────────────────────┤
│  Related Programs (Same Provider)         [See All →]│
│  [Card] [Card] [Card]                            │
├─────────────────────────────────────────────────┤
│  Similar Programs (Other Providers)       [See All →]│
│  [Card] [Card] [Card]                            │
└─────────────────────────────────────────────────┘
```

#### 3.6.2 Program Detail Data Fetching
- fetch program detail with all relations on page load
- track view (POST /api/programs/:id/view)
- related programs: same provider, same category, limit 6
- similar programs: same category or skill tags, different provider, limit 6

#### 3.6.3 Action Buttons
- Save/Unsave toggle (heart icon, filled when saved)
- Compare (adds to comparison tray, max 4)
- Enquire (opens enquiry modal — Phase 5)
- Request Quote (opens quotation request modal — Phase 5)
- Share (copy link, native share on mobile)
- Download Brochure (if available)

#### 3.6.4 Comparison Tray
- floating bar at bottom of screen
- shows programs added to compare (thumbnails + names)
- "Compare Now" button when 2+ programs added
- remove individual programs
- clear all
- persists across page navigation (stored in state/localStorage)
- max 4 programs

#### 3.6.5 Compare Page (/compare?ids=xxx,yyy,zzz)
- side by side table comparison
- rows: title, provider, category, fee, delivery mode, duration, certification, HRD Corp, location, next schedule, rating, effectiveness score
- highlight differences
- action buttons per program: Enquire, Save
- "Add another program" if fewer than 4

---

### 3.7 Web Frontend — Individual Storefront

#### 3.7.1 Individual Homepage (/individual/home)
Same structure as employer storefront with these differences:
- "Recommended For You" based on career goals and skill interests
- "Popular Among Similar Learners" section
- free vs paid filter more prominent
- no HRD Corp specific sections
- "Learning Path Suggestions" section (grouped related programs)

---

### 3.8 Mobile App — Storefront and Search

#### 3.8.1 Home Screen
- vertical scroll layout
- hero banner carousel (swipeable)
- search bar with auto-suggest (fixed at top)
- horizontal scroll sections for: recommended, trending, new, upcoming
- category grid (2 columns)
- pull to refresh

#### 3.8.2 Search Screen
- full screen search with filter chips at top
- filter button opens full screen filter modal
- results as vertical card list
- sort dropdown
- infinite scroll pagination

#### 3.8.3 Program Detail Screen
- scrollable detail view
- sticky action bar at bottom: Save, Enquire
- collapsible sections for description, outcomes, schedule, trainers
- share via native share sheet
- swipe gallery for images (if multiple)

#### 3.8.4 Compare Screen (Mobile)
- swipeable card comparison (swipe to switch programs)
- or stacked comparison table (scrollable)
- simplified fields compared to desktop

---

## 4. Acceptance Criteria

- [ ] Search returns relevant results using fuzzy text matching
- [ ] All filters work correctly (category, delivery, price, location, duration, HRD Corp, tier)
- [ ] Auto-suggest shows programs, categories, and skills after 2 characters
- [ ] Storefront homepage loads with all sections (featured, trending, new, categories, etc.)
- [ ] Featured content managed by admin displays correctly
- [ ] Trending programs calculated from recent activity
- [ ] Personalized recommendations show for logged in users
- [ ] Recently viewed programs show for logged in users
- [ ] Program cards display all key information
- [ ] Program detail page shows full information with tabs
- [ ] Save/unsave programs works
- [ ] Compare tray works (add, remove, navigate to compare page)
- [ ] Compare page shows side by side comparison
- [ ] Search results URL is shareable with filters preserved
- [ ] Mobile storefront renders correctly
- [ ] Mobile search with filters works
- [ ] Page loads are fast (storefront < 2 seconds with caching)
- [ ] Empty states handled gracefully

---

## 5. Estimated Effort

| Task | Effort |
|------|--------|
| Search API with filters and ranking | 3-4 days |
| Auto-suggest API | 1 day |
| Storefront content APIs (featured, trending, new, etc.) | 3-4 days |
| Personalization APIs (recommended, recently viewed) | 2-3 days |
| Background jobs (trending calculator, cache refresh) | 1-2 days |
| Web: Storefront homepage with all sections | 4-5 days |
| Web: Program card component | 1-2 days |
| Web: Search results page with filters | 3-4 days |
| Web: Program detail page | 3-4 days |
| Web: Compare tray and compare page | 2 days |
| Web: Individual storefront variant | 1 day |
| Mobile: Home screen | 2-3 days |
| Mobile: Search screen | 2-3 days |
| Mobile: Program detail screen | 2 days |
| Testing | 2-3 days |
| **Total** | **27-36 days** |

# Phase 8: Subscription and Billing for Training Providers — Detailed Development Plan

## 1. Objective

Implement subscription management and payment processing for training providers. Providers must have an active subscription to publish programs, appear on the storefront, and receive enquiries and broadcast notifications.

---

## 2. Prerequisites

- Phase 2 completed (provider registration and profile)
- Payment gateway account set up (Stripe or Billplz)
- Business decision on subscription pricing finalized

---

## 3. Detailed Tasks

### 3.1 Backend — Subscription and Billing Service

#### 3.1.1 Subscription Plans Configuration

**Table: subscription_plans (admin managed)**
```sql
CREATE TABLE subscription_plans (
    plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_name VARCHAR(255) NOT NULL,
    plan_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
    price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'MYR',
    features JSONB DEFAULT '[]',
    max_programs INTEGER,
    max_featured_listings INTEGER DEFAULT 0,
    analytics_level VARCHAR(20) DEFAULT 'basic',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

Initial seed plans:
```
Plan 1: Basic Annual
- plan_code: "basic_annual"
- billing_cycle: annual
- price: RM 500 per year (example nominal fee)
- max_programs: 20
- max_featured_listings: 0
- analytics_level: basic
- features: ["Publish up to 20 programs", "Appear in search results", "Receive enquiries", "Receive broadcast notifications", "Basic analytics"]

Plan 2: Premium Annual (future)
- plan_code: "premium_annual"
- billing_cycle: annual
- price: RM 1,500 per year
- max_programs: unlimited
- max_featured_listings: 5
- analytics_level: advanced
- features: ["Unlimited programs", "5 featured listings per month", "Priority in search results", "Advanced analytics", "Dedicated support"]
```

#### 3.1.2 API Endpoints

**GET /api/subscriptions/plans**
```
Public endpoint
Returns all active subscription plans

Response 200:
{
  data: [
    {
      plan_id, plan_name, plan_code, description, billing_cycle,
      price, currency, features, max_programs, is_active
    }
  ]
}
```

**POST /api/subscriptions/checkout**
```
Role: provider

Request Body:
{
  plan_code: string (required)
}

Process:
1. Verify provider doesn't have active subscription
2. Get plan details
3. Create Stripe Checkout Session or Billplz Bill:
   - amount: plan price
   - currency: MYR
   - description: "Training Market - {plan_name}"
   - success_url: /provider/subscription/success?session_id={id}
   - cancel_url: /provider/subscription/cancelled
   - customer_email: provider email
   - metadata: provider_id, plan_code
4. Create subscription record with status "pending"
5. Create payment_transaction record with status "pending"
6. Return checkout URL

Response 200:
{
  success: true,
  data: {
    checkout_url: string,
    subscription_id: string
  }
}
```

**POST /api/subscriptions/webhook**
```
No auth (verified by webhook signature)

For Stripe:
- Handle checkout.session.completed:
  1. Verify webhook signature
  2. Find subscription by metadata
  3. Set subscription payment_status to "active"
  4. Set start_date and end_date
  5. Store gateway_subscription_id
  6. Update payment_transaction: status "completed", paid_at
  7. Generate invoice number
  8. Update provider status to "active"
  9. Send confirmation email with invoice
  10. Create notification for provider

- Handle invoice.payment_failed:
  1. Set subscription to "past_due"
  2. Notify provider

- Handle customer.subscription.deleted:
  1. Set subscription to "cancelled"
  2. Notify provider

For Billplz:
- Handle callback with bill paid status
- Similar logic as Stripe handlers
```

**GET /api/subscriptions/my-subscription**
```
Role: provider

Response 200:
{
  data: {
    subscription_id,
    plan: { plan_name, plan_code, price, features },
    payment_status,
    start_date,
    end_date,
    days_remaining: number,
    auto_renew,
    next_billing_date: date,
    usage: {
      programs_published: number,
      max_programs: number,
      featured_listings_used: number,
      max_featured_listings: number
    }
  }
}
```

**POST /api/subscriptions/renew**
```
Role: provider
Process: create new checkout session for renewal
```

**PUT /api/subscriptions/auto-renew**
```
Role: provider
Request Body: { auto_renew: boolean }
Process: update auto_renew flag, update gateway if applicable
```

**GET /api/subscriptions/payment-history**
```
Role: provider

Response:
{
  data: [
    {
      transaction_id, amount, currency, payment_method,
      status, invoice_number, invoice_url, paid_at
    }
  ]
}
```

**GET /api/subscriptions/invoice/:transaction_id**
```
Role: provider (owner)
Returns invoice PDF or invoice detail
```

#### 3.1.3 Subscription Enforcement Middleware

```typescript
// Middleware: requireActiveSubscription
// Applied to provider endpoints that require subscription:
// - program creation and publishing
// - enquiry responses
// - proposal submissions
// Checks: provider has subscription with payment_status "active"
// Returns 403 with message if subscription inactive/expired
```

#### 3.1.4 Background Jobs

**Subscription Expiry Check Job**
- runs daily at midnight
- finds subscriptions where end_date is today and auto_renew is false
- sets payment_status to "expired"
- updates provider status to "pending_subscription"
- unpublishes all provider programs (set to "archived")
- sends expiry notification to provider

**Renewal Reminder Job**
- runs daily
- 30 days before expiry: send first reminder
- 14 days before expiry: send second reminder
- 7 days before expiry: send urgent reminder
- 3 days before expiry: send final reminder
- create in-app notifications and email

**Auto-Renewal Job**
- runs daily
- finds subscriptions expiring within 3 days with auto_renew = true
- attempts to charge via payment gateway
- if successful: extend subscription, create transaction
- if failed: notify provider, retry next day (max 3 retries)

**Invoice Generation Job**
- triggered after successful payment
- generates invoice PDF with:
  - Training Market company details
  - provider details
  - subscription plan details
  - amount and payment date
  - invoice number (sequential: TM-INV-2027-0001)
- stores PDF in object storage
- updates payment_transaction with invoice_url

---

### 3.2 Web Frontend — Provider Subscription Flow

#### 3.2.1 Subscription Plans Page (/provider/subscription/plans)
Shown to providers without active subscription (after registration or expiry).

```
┌─────────────────────────────────────────────┐
│  Choose Your Subscription Plan               │
│  "Start reaching employers across Malaysia"  │
│  ─────────────────────────────────────────  │
│                                              │
│  ┌──────────────────┐  ┌──────────────────┐ │
│  │  Basic Annual     │  │  Premium Annual   │ │
│  │                   │  │  RECOMMENDED      │ │
│  │  RM 500/year      │  │  RM 1,500/year    │ │
│  │                   │  │                   │ │
│  │  ✅ 20 programs    │  │  ✅ Unlimited      │ │
│  │  ✅ Search results │  │  ✅ Priority search│ │
│  │  ✅ Enquiries      │  │  ✅ 5 featured/mo  │ │
│  │  ✅ Broadcasts     │  │  ✅ Adv analytics  │ │
│  │  ✅ Basic stats    │  │  ✅ Dedicated      │ │
│  │                   │  │    support        │ │
│  │  [Subscribe]      │  │  [Subscribe]      │ │
│  └──────────────────┘  └──────────────────┘ │
│                                              │
│  All plans include:                          │
│  • Provider profile on platform              │
│  • Program publishing and management         │
│  • Employer enquiry inbox                    │
│  • Broadcast request notifications           │
│  • Quality tier system                       │
└─────────────────────────────────────────────┘
```

#### 3.2.2 Payment Checkout Flow
1. Provider clicks "Subscribe"
2. Redirected to Stripe Checkout or Billplz payment page
3. Provider completes payment (FPX, card, e-wallet)
4. Redirected back to success page

#### 3.2.3 Subscription Success Page (/provider/subscription/success)
- confirmation message
- subscription details
- invoice download link
- "Start Publishing Programs" CTA button
- confetti animation (optional nice touch)

#### 3.2.4 Subscription Management Page (/provider/subscription)
```
┌─────────────────────────────────────────────┐
│  Your Subscription                           │
│  ─────────────────────────────────────────  │
│  Plan: Basic Annual                          │
│  Status: ● Active                            │
│  Start: 15 Jan 2027                          │
│  Expires: 15 Jan 2028                        │
│  Days Remaining: 342                         │
│  ─────────────────────────────────────────  │
│  Auto-Renew: [Toggle ON/OFF]                 │
│  ─────────────────────────────────────────  │
│  Usage:                                      │
│  Programs: 8 / 20                            │
│  Featured Listings: 0 / 0                    │
│  ─────────────────────────────────────────  │
│  [Upgrade to Premium]                        │
│  ─────────────────────────────────────────  │
│  Payment History:                            │
│  ┌────────────┬─────────┬────────┬────────┐ │
│  │ Date       │ Amount  │ Status │ Invoice│ │
│  ├────────────┼─────────┼────────┼────────┤ │
│  │ 15 Jan 27  │ RM 500  │ Paid   │ 📄 PDF │ │
│  └────────────┴─────────┴────────┴────────┘ │
└─────────────────────────────────────────────┘
```

#### 3.2.5 Subscription Expiry Warning Banner
- shown across all provider pages when subscription is expiring within 30 days
- "Your subscription expires in X days. Renew now to keep your programs published."
- dismiss button (shows again next day)
- renew button

#### 3.2.6 Expired Subscription Block Screen
- when subscription expires, provider sees block screen instead of dashboard
- "Your subscription has expired. Your programs are no longer visible to employers."
- renew button
- contact support link

---

### 3.3 Admin — Billing Management

#### 3.3.1 Admin Subscription Overview (/admin/subscriptions)
- total active subscriptions
- total revenue this month/year
- expiring soon (next 30 days) list
- recently expired list
- subscription list with filters (status, plan, search by provider)

#### 3.3.2 Admin Subscription Detail
- provider info
- subscription details
- payment history
- manual actions: extend, cancel, refund (with confirmation)

#### 3.3.3 Admin Plan Management (/admin/plans)
- list of subscription plans
- create new plan
- edit plan (price, features, limits)
- activate/deactivate plan
- note: changing price only affects new subscriptions

#### 3.3.4 Admin Revenue Dashboard
- monthly recurring revenue chart
- subscriptions by plan breakdown
- churn rate
- new subscriptions vs renewals
- payment failure rate

---

## 4. Acceptance Criteria

- [ ] Provider can view subscription plans
- [ ] Provider can initiate checkout and pay via payment gateway
- [ ] Payment webhook processes correctly and activates subscription
- [ ] Provider can view active subscription details
- [ ] Provider can view payment history and download invoices
- [ ] Provider can toggle auto-renewal
- [ ] Subscription enforcement blocks publishing when inactive
- [ ] Expiry reminders sent at 30, 14, 7, 3 days before expiry
- [ ] Expired subscriptions auto-deactivate and unpublish programs
- [ ] Auto-renewal charges provider and extends subscription
- [ ] Admin can view all subscriptions and revenue
- [ ] Admin can manage subscription plans
- [ ] Admin can manually extend or cancel subscriptions
- [ ] Invoice PDF generated correctly with all details
- [ ] Expiry warning banner shows on provider pages

---

## 5. Estimated Effort

| Task | Effort |
|------|--------|
| Subscription plans and data model | 1 day |
| Payment gateway integration (Stripe or Billplz) | 3-4 days |
| Subscription CRUD endpoints | 2-3 days |
| Webhook handler | 2 days |
| Subscription enforcement middleware | 1 day |
| Background jobs (expiry, reminders, auto-renewal) | 2-3 days |
| Invoice generation | 1-2 days |
| Web: Plan selection and checkout flow | 2 days |
| Web: Subscription management page | 2 days |
| Web: Expiry warning and block screen | 1 day |
| Web: Admin billing pages | 2-3 days |
| Testing (including payment gateway sandbox) | 2-3 days |
| **Total** | **19-25 days** |

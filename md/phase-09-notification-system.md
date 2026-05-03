# Phase 9: Notification System — Detailed Development Plan

## 1. Objective

Implement a comprehensive notification system delivering real-time in-app notifications, email alerts, and mobile push notifications for all platform events across all user roles.

---

## 2. Prerequisites

- Phase 2 completed (auth and user profiles)
- Redis running (for real-time pub/sub)
- BullMQ configured (for email and push queues)
- Firebase project set up (for mobile push)
- Email service configured (SendGrid, AWS SES, or SMTP)

---

## 3. Detailed Tasks

### 3.1 Backend — Notification Service

#### 3.1.1 Notification Architecture

```
Event occurs (e.g., new enquiry)
    → Notification Service creates notification record
    → Dispatches to channels:
        → In-App: saved to DB + pushed via WebSocket/SSE
        → Email: queued via BullMQ → email service
        → Push: queued via BullMQ → Firebase Cloud Messaging
```

#### 3.1.2 Notification Types Registry

| Event | Recipients | In-App | Email | Push |
|-------|-----------|--------|-------|------|
| New enquiry received | Provider | Yes | Yes | Yes |
| Enquiry reply received | Requester | Yes | Yes | Yes |
| New broadcast request | All providers | Yes | Yes | Yes |
| New proposal received | Employer | Yes | Yes | Yes |
| Proposal shortlisted | Provider | Yes | Yes | Yes |
| Proposal selected (won) | Provider | Yes | Yes | Yes |
| Proposal rejected | Provider | Yes | Yes | No |
| Program approved | Provider | Yes | Yes | No |
| Program rejected | Provider | Yes | Yes | No |
| Subscription renewal reminder (30/14/7/3d) | Provider | Yes | Yes | No |
| Subscription expired | Provider | Yes | Yes | Yes |
| Subscription payment received | Provider | Yes | Yes | No |
| Account suspended | User | Yes | Yes | No |
| Provider verified | Provider | Yes | Yes | No |
| Saved search new results | User | Yes | Email only | No |
| Training date reminder (7d/1d) | Employer | Yes | Yes | Yes |
| HRD Corp deadline reminder | Employer | Yes | Yes | Yes |
| Group pool opportunity | Employer | Yes | Yes | No |
| Levy utilization warning | Employer | Yes | Yes | No |
| Effectiveness survey due | Employer | Yes | Yes | No |

#### 3.1.3 Notification Creation Utility

```typescript
// services/notification.service.ts

interface CreateNotificationParams {
  user_id: UUID;
  type: NotificationType;
  title: string;
  message: string;
  reference_id?: UUID;
  reference_type?: string;
  action_url?: string;
  channels: ('in_app' | 'email' | 'push')[];
  email_template?: string;
  email_data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  schedule_at?: Date;
}

async function createNotification(params: CreateNotificationParams) {
  // 1. Save in-app notification to DB
  const notification = await db.notifications.create({ ... });

  // 2. Push to WebSocket/SSE for real-time delivery
  if (params.channels.includes('in_app')) {
    await realtimeService.pushToUser(params.user_id, notification);
  }

  // 3. Queue email
  if (params.channels.includes('email')) {
    await emailQueue.add('send-email', {
      user_id: params.user_id,
      template: params.email_template,
      data: params.email_data
    }, { priority: params.priority });
  }

  // 4. Queue push notification
  if (params.channels.includes('push')) {
    await pushQueue.add('send-push', {
      user_id: params.user_id,
      title: params.title,
      body: params.message,
      data: { action_url: params.action_url }
    });
  }
}

// Batch notification helper (for broadcast to all providers)
async function createBatchNotifications(
  user_ids: UUID[],
  params: Omit<CreateNotificationParams, 'user_id'>
) {
  // Batch insert in-app notifications
  // Queue emails in batch (rate limited)
  // Queue push notifications in batch
}
```

#### 3.1.4 Real-Time Delivery (WebSocket or SSE)

Option A: Server-Sent Events (simpler)
```
GET /api/notifications/stream
Headers: Authorization: Bearer <token>

Process:
1. Authenticate user from token
2. Open SSE connection
3. Subscribe to Redis pub/sub channel: notifications:{user_id}
4. Stream new notifications as they arrive
5. Send heartbeat every 30 seconds
6. Client auto-reconnects on disconnect
```

Option B: WebSocket (more flexible)
```
WS /api/notifications/ws
Process:
1. Authenticate via token in connection query
2. Subscribe to user notification channel
3. Send notifications as JSON messages
4. Handle connection lifecycle
```

Recommendation: SSE for simplicity (one-way server to client is sufficient).

#### 3.1.5 API Endpoints

**GET /api/notifications**
```
Role: authenticated user
Query Params: is_read (boolean), type, page, limit

Response 200:
{
  data: [
    {
      notification_id,
      type,
      title,
      message,
      is_read,
      reference_id,
      reference_type,
      action_url,
      created_at
    }
  ],
  unread_count: number,
  pagination: { total, page, limit, total_pages }
}
```

**GET /api/notifications/unread-count**
```
Role: authenticated user
Response: { unread_count: number }
Cached in Redis, invalidated on new notification
```

**PUT /api/notifications/:notification_id/read**
```
Role: authenticated user (owner)
Process: set is_read = true, update Redis unread count
```

**PUT /api/notifications/read-all**
```
Role: authenticated user
Process: set all unread to is_read = true
```

**DELETE /api/notifications/:notification_id**
```
Role: authenticated user (owner)
Process: delete notification record
```

**GET /api/notifications/preferences**
```
Role: authenticated user

Response:
{
  data: {
    email_enquiry_received: true,
    email_enquiry_reply: true,
    email_broadcast_request: true,
    email_proposal_update: true,
    email_subscription_reminder: true,
    email_marketing: false,
    push_enquiry_received: true,
    push_enquiry_reply: true,
    push_broadcast_request: true,
    push_proposal_update: true
  }
}
```

**PUT /api/notifications/preferences**
```
Role: authenticated user
Request Body: partial update of preferences
```

#### 3.1.6 Email Queue Worker

```typescript
// workers/email.worker.ts

// Process email jobs from BullMQ queue
// Rate limited: max 50 per second (adjust per email provider limits)
// Retry: 3 attempts with exponential backoff
// Dead letter queue for permanent failures

// Email templates:
// - enquiry_received.html
// - enquiry_reply.html
// - broadcast_new.html
// - proposal_received.html
// - proposal_status.html
// - subscription_reminder.html
// - subscription_expired.html
// - subscription_receipt.html
// - program_approved.html
// - program_rejected.html
// - account_welcome.html
// - password_reset.html
// - training_reminder.html
// - hrd_deadline_reminder.html
```

#### 3.1.7 Push Notification Worker

```typescript
// workers/push.worker.ts

// Process push jobs from BullMQ queue
// Uses Firebase Admin SDK
// Requires device tokens stored per user

// Table: user_device_tokens
// user_id, device_token, platform (android/ios/web), created_at, last_used_at
```

**Table: user_device_tokens**
```sql
CREATE TABLE user_device_tokens (
    token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    device_token VARCHAR(500) NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_device_tokens_user ON user_device_tokens(user_id);
CREATE UNIQUE INDEX idx_device_tokens_token ON user_device_tokens(device_token);
```

**POST /api/notifications/register-device**
```
Role: authenticated user
Request Body: { device_token: string, platform: "android" | "ios" | "web" }
Process: upsert device token for user
```

**DELETE /api/notifications/unregister-device**
```
Role: authenticated user
Request Body: { device_token: string }
Process: set is_active = false
```

#### 3.1.8 Scheduled Notification Jobs

**Subscription Reminder Job** (daily)
- query subscriptions expiring in 30, 14, 7, 3 days
- create reminder notifications if not already sent for this interval

**Saved Search Alert Job** (daily)
- for each saved search, run the search query
- compare with previous results
- if new programs match, notify user

**Training Date Reminder Job** (daily)
- find enrollments with training starting in 7 days and 1 day
- send reminders to employer

**HRD Corp Deadline Reminder Job** (daily)
- find active checklists with upcoming deadlines
- send reminders at appropriate intervals

---

### 3.2 Web Frontend — Notification Center

#### 3.2.1 Notification Bell (Header Component)
```
┌──────┐
│ 🔔 3 │  ← Bell icon with unread count badge
└──────┘
```
- always visible in header navigation
- red badge with unread count (hidden if 0)
- click opens notification dropdown

#### 3.2.2 Notification Dropdown
```
┌─────────────────────────────────────┐
│  Notifications              [Mark All Read] │
│  ─────────────────────────────────  │
│  ● New enquiry from Acme Corp       │  ← unread (bold, dot)
│    About: Advanced Leadership       │
│    2 minutes ago                    │
│  ─────────────────────────────────  │
│  ● Proposal received for your       │
│    broadcast request                │
│    1 hour ago                       │
│  ─────────────────────────────────  │
│    Program "Excel Advanced"         │  ← read (normal)
│    has been approved                │
│    Yesterday                        │
│  ─────────────────────────────────  │
│  [View All Notifications]           │
└─────────────────────────────────────┘
```
- shows 5 most recent notifications
- unread highlighted (bold text, blue dot)
- click notification → navigate to action_url
- mark all as read button
- "View All" link to full notifications page

#### 3.2.3 Notifications Page (/notifications)
- full list of all notifications
- filter: All / Unread
- group by date: Today, Yesterday, This Week, Earlier
- click to navigate
- individual delete button
- mark as read/unread toggle
- pagination or infinite scroll

#### 3.2.4 Notification Preferences Page (/settings/notifications)
- toggles for each notification type
- grouped by category: Enquiries, Broadcasts, Subscriptions, Programs, Reminders
- separate toggles for email and push per category
- save button

#### 3.2.5 Real-Time Updates
- SSE connection established on login
- new notifications appear in bell count instantly
- optional toast/popup for high-priority notifications
- reconnect on connection drop

---

### 3.3 Mobile App — Push Notifications

#### 3.3.1 Firebase Cloud Messaging Setup
- configure Firebase project
- add google-services.json to Android app
- register device token on app launch and login
- handle token refresh

#### 3.3.2 Push Notification Handling
- foreground: show in-app banner at top of screen
- background: show system notification
- tap notification: navigate to relevant screen based on action_url
- notification data includes reference type and ID for navigation

#### 3.3.3 Notification Inbox Screen
- same layout as web notifications page (mobile optimized)
- pull to refresh
- swipe to delete
- tap to navigate

#### 3.3.4 Notification Preferences Screen
- same toggles as web, mobile layout

---

### 3.4 Email Templates

All email templates should:
- be responsive HTML (work on desktop and mobile email clients)
- include Training Market branding (logo, colors)
- have plain text fallback
- include unsubscribe link (for marketing emails)
- use consistent template layout

#### 3.4.1 Template Structure
```html
<!-- Base template -->
<header>Training Market Logo</header>
<body>
  <h1>{{ title }}</h1>
  <p>Hi {{ user_name }},</p>
  {{ content }}
  <a href="{{ action_url }}">{{ action_text }}</a>
</body>
<footer>
  © Training Market | Unsubscribe | Privacy Policy
</footer>
```

#### 3.4.2 Key Templates
- **Welcome**: "Welcome to Training Market! Complete your profile to get started."
- **Enquiry Received**: "You have a new enquiry from {company} about {program}."
- **Enquiry Reply**: "{provider} has replied to your enquiry about {program}."
- **Broadcast Published**: "A new training request matching your expertise: {title}."
- **Proposal Received**: "You received a proposal from {provider} for {request_title}."
- **Proposal Shortlisted**: "Congratulations! Your proposal has been shortlisted."
- **Proposal Selected**: "You won! {employer} selected your proposal."
- **Subscription Reminder**: "Your subscription expires in {days} days. Renew now."
- **Subscription Receipt**: "Payment received. Invoice #{number} attached."

---

## 4. Acceptance Criteria

- [ ] In-app notifications created for all defined events
- [ ] Notification bell shows correct unread count
- [ ] Notification dropdown shows recent notifications
- [ ] Full notifications page works with filters
- [ ] Clicking notification navigates to correct page
- [ ] Mark as read works (individual and all)
- [ ] Real-time delivery works (new notification appears without refresh)
- [ ] Email notifications sent for configured events
- [ ] Email templates render correctly on desktop and mobile email clients
- [ ] Push notifications received on Android app
- [ ] Tapping push notification opens correct screen
- [ ] Notification preferences work (toggle off stops delivery)
- [ ] Batch notifications work for broadcast events (all providers)
- [ ] Rate limiting prevents email spam
- [ ] Scheduled jobs run correctly (reminders, saved search alerts)
- [ ] Device token registration and refresh works

---

## 5. Estimated Effort

| Task | Effort |
|------|--------|
| Notification service core (create, batch, channels) | 2-3 days |
| Real-time delivery (SSE or WebSocket) | 2 days |
| Notification API endpoints | 1-2 days |
| Email queue worker and templates | 3-4 days |
| Push notification worker and Firebase setup | 2-3 days |
| Device token management | 1 day |
| Scheduled notification jobs | 2-3 days |
| Notification preferences | 1 day |
| Web: Bell, dropdown, notifications page | 2-3 days |
| Web: Preferences page | 1 day |
| Mobile: Push notification handling | 2 days |
| Mobile: Notification inbox screen | 1-2 days |
| Testing | 2-3 days |
| **Total** | **20-28 days** |

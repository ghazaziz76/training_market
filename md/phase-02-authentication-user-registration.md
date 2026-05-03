# Phase 2: Authentication and User Registration — Detailed Development Plan

## 1. Objective

Implement complete authentication system and user registration for all roles (employer, individual, training provider, admin) across web and mobile platforms with JWT-based security and role-based access control.

---

## 2. Prerequisites

- Phase 1 completed (database, project structure, all tables created)
- PostgreSQL running with users, profiles, and refresh_tokens tables
- Redis running for session caching
- API server initialized

---

## 3. Detailed Tasks

### 3.1 Backend — Auth Module

#### 3.1.1 Auth Utilities
- password hashing utility using bcryptjs (salt rounds: 12)
- JWT token generation (access token: 15 min expiry, refresh token: 7 days)
- JWT token verification middleware
- email verification token generator (crypto random, 64 char hex)
- password reset token generator (crypto random, 64 char hex, 1 hour expiry)

#### 3.1.2 API Endpoints — Registration

**POST /api/auth/register**
```
Request Body:
{
  role: "employer" | "individual" | "provider",
  full_name: string,
  email: string,
  phone: string (optional),
  password: string (min 8 chars, 1 uppercase, 1 number)
}

Process:
1. Validate input with Zod schema
2. Check email uniqueness
3. Hash password with bcrypt
4. Create user record with status "pending_verification"
5. Generate email verification token
6. Send verification email
7. Return success with message "Check your email to verify"

Response 201:
{
  success: true,
  message: "Registration successful. Please verify your email."
}

Errors:
- 400: Validation errors
- 409: Email already registered
```

**POST /api/auth/verify-email**
```
Request Body:
{
  token: string
}

Process:
1. Find user by verification token
2. Mark email_verified = true
3. Set status = "active"
4. Clear verification token
5. If role is "provider", set status = "pending_subscription"

Response 200:
{
  success: true,
  message: "Email verified successfully"
}
```

**POST /api/auth/resend-verification**
```
Request Body:
{
  email: string
}

Process:
1. Find user by email
2. Generate new verification token
3. Send verification email
4. Rate limit: max 3 per hour per email
```

#### 3.1.3 API Endpoints — Login

**POST /api/auth/login**
```
Request Body:
{
  email: string,
  password: string,
  device_info: string (optional, for mobile)
}

Process:
1. Find user by email
2. Verify password with bcrypt
3. Check user status is "active"
4. Generate access token (JWT, 15 min)
5. Generate refresh token (JWT, 7 days)
6. Store refresh token hash in refresh_tokens table
7. Update last_login_at
8. Cache user session in Redis

Response 200:
{
  success: true,
  data: {
    access_token: string,
    refresh_token: string,
    expires_in: 900,
    user: {
      user_id: string,
      role: string,
      full_name: string,
      email: string,
      profile_image_url: string,
      profile_completion_pct: number
    }
  }
}

Errors:
- 401: Invalid credentials
- 403: Account suspended
- 403: Email not verified
```

**POST /api/auth/refresh-token**
```
Request Body:
{
  refresh_token: string
}

Process:
1. Verify refresh token JWT
2. Find token hash in refresh_tokens table
3. Check not expired
4. Generate new access token
5. Optionally rotate refresh token

Response 200:
{
  access_token: string,
  expires_in: 900
}
```

**POST /api/auth/logout**
```
Headers: Authorization: Bearer <access_token>

Process:
1. Invalidate refresh token (delete from refresh_tokens)
2. Clear Redis session cache
3. Optionally blacklist access token in Redis until expiry
```

#### 3.1.4 API Endpoints — Password Management

**POST /api/auth/forgot-password**
```
Request Body:
{
  email: string
}

Process:
1. Find user by email
2. Generate password reset token (1 hour expiry)
3. Store token hash and expiry in users table
4. Send password reset email with link
5. Rate limit: max 3 per hour per email
6. Always return success (don't reveal if email exists)
```

**POST /api/auth/reset-password**
```
Request Body:
{
  token: string,
  new_password: string
}

Process:
1. Find user by reset token
2. Check token not expired
3. Hash new password
4. Update password_hash
5. Clear reset token and expiry
6. Invalidate all existing refresh tokens for this user
```

**PUT /api/auth/change-password**
```
Headers: Authorization: Bearer <access_token>

Request Body:
{
  current_password: string,
  new_password: string
}

Process:
1. Verify current password
2. Hash new password
3. Update password_hash
4. Invalidate all refresh tokens except current
```

#### 3.1.5 Auth Middleware

**JWT Verification Middleware**
```typescript
// Applied to all protected routes
// Extracts token from Authorization header
// Verifies JWT signature and expiry
// Attaches user object to request
// Checks Redis cache first, falls back to DB
```

**Role-Based Access Control Middleware**
```typescript
// Factory function: requireRole('employer', 'admin')
// Checks user.role against allowed roles
// Returns 403 if role not permitted
// Special handling for admin (access all)
```

**Rate Limiting**
```
- Login: 5 attempts per 15 minutes per IP
- Registration: 3 per hour per IP
- Forgot password: 3 per hour per email
- API general: 100 requests per minute per user
```

#### 3.1.6 Email Service Setup
- configure Nodemailer with SMTP (SendGrid, AWS SES, or similar)
- email templates:
  - welcome and verification email
  - password reset email
  - account suspension notification
- HTML email templates with responsive design
- plain text fallback

---

### 3.2 Backend — User Profile Module

#### 3.2.1 Employer Profile Endpoints

**GET /api/employer/profile**
```
Headers: Authorization: Bearer <access_token>
Role: employer

Response 200:
{
  employer_id: string,
  company_name: string,
  registration_no: string,
  industry: string,
  company_size: string,
  contact_person: string,
  address: string,
  city: string,
  state: string,
  postcode: string,
  hrd_corp_registered: boolean,
  hrd_corp_levy_balance: number,
  training_interests: string[],
  profile_completion_pct: number
}
```

**PUT /api/employer/profile**
```
Headers: Authorization: Bearer <access_token>
Role: employer

Request Body: (partial update allowed)
{
  company_name: string,
  registration_no: string,
  industry: string,
  company_size: string,
  contact_person: string,
  address: string,
  city: string,
  state: string,
  postcode: string,
  hrd_corp_registered: boolean,
  hrd_corp_levy_balance: number,
  training_interests: string[]
}

Process:
1. Validate input
2. Update employer_profiles record
3. Recalculate profile_completion_pct
4. Return updated profile
```

#### 3.2.2 Individual Profile Endpoints

**GET /api/individual/profile**
```
Headers: Authorization: Bearer <access_token>
Role: individual

Response: full individual profile fields
```

**PUT /api/individual/profile**
```
Headers: Authorization: Bearer <access_token>
Role: individual

Request Body: (partial update allowed)
{
  occupation: string,
  education_level: string,
  city: string,
  state: string,
  skill_interests: string[],
  career_goals: string,
  preferred_training_mode: string
}
```

#### 3.2.3 Training Provider Profile Endpoints

**GET /api/provider/profile**
```
Headers: Authorization: Bearer <access_token>
Role: provider

Response: full provider profile fields including quality_tier, response_rate, verification_status
```

**PUT /api/provider/profile**
```
Headers: Authorization: Bearer <access_token>
Role: provider

Request Body: (partial update allowed)
{
  provider_name: string,
  registration_no: string,
  business_description: string,
  contact_person: string,
  contact_email: string,
  contact_phone: string,
  address: string,
  city: string,
  state: string,
  postcode: string,
  website: string,
  accreditation_details: string,
  hrd_corp_registered_provider: boolean,
  hrd_corp_provider_id: string
}
```

#### 3.2.4 Profile Image Upload

**POST /api/users/profile-image**
```
Headers: Authorization: Bearer <access_token>
Content-Type: multipart/form-data

File: image (max 5MB, jpg/png/webp)

Process:
1. Validate file type and size
2. Resize image (max 500x500)
3. Upload to object storage (S3, GCS, or local for dev)
4. Update user profile_image_url
5. Delete old image if exists
```

#### 3.2.5 Profile Completion Calculator
```typescript
// Employer: company_name (10%), registration_no (10%), industry (10%),
//   company_size (10%), contact_person (10%), address+city+state (15%),
//   hrd_corp_registered (10%), training_interests (15%), profile_image (10%)

// Individual: occupation (15%), education_level (15%), city+state (15%),
//   skill_interests (20%), career_goals (15%), preferred_training_mode (10%),
//   profile_image (10%)

// Provider: provider_name (10%), registration_no (10%), business_description (10%),
//   contact details (15%), address (10%), website (5%), accreditation (10%),
//   hrd_corp info (10%), logo (10%), at least 1 program uploaded (10%)
```

---

### 3.3 Backend — Admin User Management

#### 3.3.1 Admin Endpoints

**GET /api/admin/users**
```
Role: admin
Query Params: role, status, search, page, limit, sort_by, sort_order

Response 200:
{
  data: User[],
  pagination: {
    total: number,
    page: number,
    limit: number,
    total_pages: number
  }
}
```

**GET /api/admin/users/:user_id**
```
Role: admin
Response: full user details including profile for their role
```

**PUT /api/admin/users/:user_id/status**
```
Role: admin
Request Body:
{
  status: "active" | "suspended" | "deactivated",
  reason: string (required for suspension)
}

Process:
1. Update user status
2. If suspended, invalidate all sessions
3. Send notification email to user
4. Log admin action in audit log
```

**PUT /api/admin/providers/:provider_id/verify**
```
Role: admin
Request Body:
{
  verification_status: "verified" | "rejected",
  verification_notes: string
}

Process:
1. Update provider verification_status
2. If verified, set verified_at timestamp
3. Send notification to provider
4. Log admin action
```

---

### 3.4 Web Frontend — Auth Pages

#### 3.4.1 Registration Page (/register)
Components:
- role selection step (3 cards: Employer, Individual, Training Provider)
- registration form step:
  - full name input
  - email input
  - phone input (optional)
  - password input with strength indicator
  - confirm password input
  - terms and conditions checkbox with link
  - register button
- success step with "check your email" message
- link to login page
- form validation (client side + server errors)
- loading state during submission

#### 3.4.2 Login Page (/login)
Components:
- email input
- password input with show/hide toggle
- remember me checkbox
- login button
- forgot password link
- register link
- social login buttons (future: Google, optional)
- error display for invalid credentials
- redirect to appropriate dashboard after login based on role

#### 3.4.3 Email Verification Page (/verify-email?token=xxx)
Components:
- auto-verify on page load using token from URL
- success message with login link
- error message if token invalid or expired
- resend verification link option

#### 3.4.4 Forgot Password Page (/forgot-password)
Components:
- email input
- submit button
- success message (always shown, don't reveal if email exists)
- back to login link

#### 3.4.5 Reset Password Page (/reset-password?token=xxx)
Components:
- new password input with strength indicator
- confirm password input
- submit button
- success message with login link
- error if token expired

#### 3.4.6 Auth Layout
- clean, centered card layout
- Training Market logo and branding
- responsive for mobile browsers
- consistent styling across all auth pages

---

### 3.5 Web Frontend — Profile Setup

#### 3.5.1 Profile Setup Wizard
After first login, redirect to profile setup if profile_completion_pct < 50%.

**Employer Profile Setup (3 steps):**
- Step 1: Company Information (company name, registration no, industry dropdown, company size)
- Step 2: Location and Contact (address, city, state dropdown, postcode, contact person)
- Step 3: Training Preferences (HRD Corp registered toggle, levy balance input, training interests multi-select from categories)
- Progress bar showing completion
- Skip option (can complete later)
- Save and continue buttons per step

**Individual Profile Setup (2 steps):**
- Step 1: About You (occupation, education level dropdown, city, state)
- Step 2: Training Interests (skill interests multi-select, career goals text area, preferred training mode)

**Provider Profile Setup (3 steps):**
- Step 1: Company Information (provider name, registration no, business description, website)
- Step 2: Contact and Location (contact person, email, phone, address, city, state)
- Step 3: Accreditation (accreditation details, HRD Corp registered toggle, HRD Corp provider ID, logo upload)
- After completion, redirect to subscription page (Phase 8)

#### 3.5.2 Profile Edit Page (/settings/profile)
- same fields as setup but editable anytime
- profile image upload with preview
- profile completion percentage display
- save button with success notification

---

### 3.6 Web Frontend — Auth State Management

#### 3.6.1 Auth Store (Zustand)
```typescript
interface AuthState {
  user: User | null;
  access_token: string | null;
  is_authenticated: boolean;
  is_loading: boolean;
  login: (email, password) => Promise<void>;
  register: (data) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (data) => Promise<void>;
}
```

#### 3.6.2 Auth Utilities
- axios/fetch interceptor to attach access token to all API requests
- automatic token refresh on 401 response
- redirect to login on refresh failure
- persist auth state in secure storage (httpOnly cookies or encrypted localStorage)

#### 3.6.3 Protected Route Wrapper
```typescript
// ProtectedRoute component
// Checks authentication
// Checks role authorization
// Redirects to login if not authenticated
// Redirects to unauthorized page if wrong role
// Shows loading spinner during auth check
```

#### 3.6.4 Role-Based Navigation
- employer: redirect to /employer/home (storefront)
- individual: redirect to /individual/home (storefront)
- provider: redirect to /provider/dashboard
- admin: redirect to /admin/dashboard

---

### 3.7 Mobile App — Auth Screens

#### 3.7.1 Splash Screen
- Training Market logo and loading animation
- Check for stored auth token
- If valid token, navigate to home
- If no token, navigate to onboarding/login

#### 3.7.2 Onboarding Screens (first launch only)
- 3 swipeable screens:
  - Screen 1: "Find the perfect training for your team" (employer focus)
  - Screen 2: "Advance your career with the right skills" (individual focus)
  - Screen 3: "AI-powered recommendations just for you"
- Get Started button → Register
- Already have an account → Login

#### 3.7.3 Registration Screen
- role selection (Employer / Individual only on mobile — TPs use web)
- registration form with same fields as web
- form validation
- keyboard aware scroll view
- terms and conditions link (opens in-app browser)

#### 3.7.4 Login Screen
- email and password inputs
- login button
- forgot password link (opens in-app browser or in-app flow)
- register link
- biometric login option (fingerprint/face, future enhancement)

#### 3.7.5 Profile Setup Screens
- same wizard flow as web, adapted for mobile layout
- one field group per screen for mobile friendliness
- progress indicator
- skip option

#### 3.7.6 Mobile Auth Storage
- use React Native secure storage (react-native-keychain or expo-secure-store)
- store refresh token securely
- access token in memory only
- auto refresh on app launch and background resume

---

### 3.8 Admin Portal — User Management Page

#### 3.8.1 User List Page (/admin/users)
- data table with columns: Name, Email, Role, Status, Joined Date, Last Login
- filters: role dropdown, status dropdown, search by name/email
- pagination (20 per page)
- sort by any column
- click row to view detail

#### 3.8.2 User Detail Page (/admin/users/:id)
- user info section (name, email, phone, role, status, dates)
- profile section (role-specific profile data)
- action buttons:
  - activate / suspend / deactivate
  - verify provider (if role is provider)
  - reset password (sends reset email)
- activity log (recent logins, actions)
- confirmation dialog for status changes with reason input

#### 3.8.3 Provider Verification Queue (/admin/providers/pending)
- list of providers with verification_status = "pending"
- provider details preview
- approve / reject buttons with notes
- bulk approve option

---

## 4. Security Considerations

- passwords hashed with bcrypt (12 salt rounds)
- JWT access tokens are short-lived (15 minutes)
- refresh tokens stored as hashes in database, not plain text
- rate limiting on login, register, password reset endpoints
- account lockout after 10 failed login attempts (30 minute lockout)
- email verification required before account activation
- HTTPS only in production
- CORS restricted to known origins
- CSRF protection for web (if using cookies)
- input sanitization on all endpoints
- SQL injection prevention via Prisma parameterized queries

---

## 5. Acceptance Criteria

- [ ] User can register as employer, individual, or provider
- [ ] Verification email is sent on registration
- [ ] User can verify email via link
- [ ] User can log in with email and password
- [ ] JWT access token and refresh token are issued on login
- [ ] Token refresh works when access token expires
- [ ] User can log out (tokens invalidated)
- [ ] User can request password reset
- [ ] User can reset password via email link
- [ ] User can change password when logged in
- [ ] Employer can complete and edit profile
- [ ] Individual can complete and edit profile
- [ ] Provider can complete and edit profile
- [ ] Profile image upload works
- [ ] Profile completion percentage calculates correctly
- [ ] Protected routes reject unauthenticated requests
- [ ] Role-based access rejects unauthorized roles
- [ ] Admin can view user list with filters
- [ ] Admin can suspend and activate users
- [ ] Admin can verify providers
- [ ] Rate limiting prevents brute force attacks
- [ ] Mobile registration and login work
- [ ] Mobile stores tokens securely

---

## 6. Estimated Effort

| Task | Effort |
|------|--------|
| Auth backend (register, login, tokens, password) | 3-4 days |
| Email service and templates | 1-2 days |
| Auth middleware (JWT, RBAC, rate limiting) | 2 days |
| Profile endpoints (employer, individual, provider) | 2-3 days |
| Admin user management endpoints | 2 days |
| Web auth pages (register, login, verify, reset) | 2-3 days |
| Web profile setup wizard | 2-3 days |
| Web auth state management | 1-2 days |
| Web admin user management pages | 2 days |
| Mobile auth screens | 2-3 days |
| Mobile profile setup | 1-2 days |
| Testing | 2-3 days |
| **Total** | **20-27 days** |

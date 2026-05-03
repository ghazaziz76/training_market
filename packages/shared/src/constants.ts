// User roles
export const USER_ROLES = {
  EMPLOYER: 'employer',
  INDIVIDUAL: 'individual',
  PROVIDER: 'provider',
  ADMIN: 'admin',
} as const;

// User statuses
export const USER_STATUSES = {
  PENDING_VERIFICATION: 'pending_verification',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DEACTIVATED: 'deactivated',
  PENDING_SUBSCRIPTION: 'pending_subscription',
} as const;

// Program statuses
export const PROGRAM_STATUSES = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
} as const;

// Program types
export const PROGRAM_TYPES = {
  PUBLIC: 'public',
  IN_HOUSE: 'in_house',
  BOTH: 'both',
} as const;

// Skill types
export const SKILL_TYPES = {
  SOFT_SKILLS: 'soft_skills',
  TECHNICAL: 'technical',
  BOTH: 'both',
} as const;

// Delivery modes
export const DELIVERY_MODES = {
  ONLINE: 'online',
  PHYSICAL: 'physical',
  HYBRID: 'hybrid',
} as const;

// Enquiry types
export const ENQUIRY_TYPES = {
  GENERAL: 'general',
  QUOTATION_REQUEST: 'quotation_request',
  ENROLMENT_REQUEST: 'enrolment_request',
  CUSTOM_TRAINING: 'custom_training',
} as const;

// Enquiry statuses
export const ENQUIRY_STATUSES = {
  SENT: 'sent',
  READ: 'read',
  REPLIED: 'replied',
  CLOSED: 'closed',
} as const;

// Broadcast request statuses
export const BROADCAST_STATUSES = {
  OPEN: 'open',
  REVIEWING: 'reviewing',
  AWARDED: 'awarded',
  CLOSED: 'closed',
  EXPIRED: 'expired',
} as const;

// Proposal statuses
export const PROPOSAL_STATUSES = {
  SUBMITTED: 'submitted',
  SHORTLISTED: 'shortlisted',
  SELECTED: 'selected',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const;

// Subscription statuses
export const SUBSCRIPTION_STATUSES = {
  PENDING: 'pending',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

// Quality tiers
export const QUALITY_TIERS = {
  UNVERIFIED: 'unverified',
  VERIFIED: 'verified',
  TRUSTED: 'trusted',
  PREMIUM: 'premium',
} as const;

// Notification types
export const NOTIFICATION_TYPES = {
  ENQUIRY_RECEIVED: 'enquiry_received',
  ENQUIRY_REPLY: 'enquiry_reply',
  BROADCAST_NEW: 'broadcast_new',
  PROPOSAL_RECEIVED: 'proposal_received',
  PROPOSAL_SHORTLISTED: 'proposal_shortlisted',
  PROPOSAL_SELECTED: 'proposal_selected',
  PROPOSAL_REJECTED: 'proposal_rejected',
  PROGRAM_APPROVED: 'program_approved',
  PROGRAM_REJECTED: 'program_rejected',
  SUBSCRIPTION_REMINDER: 'subscription_reminder',
  SUBSCRIPTION_EXPIRED: 'subscription_expired',
  SUBSCRIPTION_RECEIPT: 'subscription_receipt',
  PROVIDER_VERIFIED: 'provider_verified',
  ACCOUNT_SUSPENDED: 'account_suspended',
  TRAINING_REMINDER: 'training_reminder',
  HRD_DEADLINE_REMINDER: 'hrd_deadline_reminder',
  LEVY_WARNING: 'levy_warning',
  POOL_OPPORTUNITY: 'pool_opportunity',
  EFFECTIVENESS_SURVEY: 'effectiveness_survey',
} as const;

// Malaysian states
export const MALAYSIAN_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Kuala Lumpur',
  'Labuan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Penang',
  'Perak',
  'Perlis',
  'Putrajaya',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
] as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
} as const;

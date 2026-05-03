import type {
  USER_ROLES,
  USER_STATUSES,
  PROGRAM_STATUSES,
  DELIVERY_MODES,
  ENQUIRY_TYPES,
  ENQUIRY_STATUSES,
  BROADCAST_STATUSES,
  PROPOSAL_STATUSES,
  SUBSCRIPTION_STATUSES,
  QUALITY_TIERS,
  NOTIFICATION_TYPES,
} from './constants';

// Utility types
export type ValueOf<T> = T[keyof T];

// Enums from constants
export type UserRole = ValueOf<typeof USER_ROLES>;
export type UserStatus = ValueOf<typeof USER_STATUSES>;
export type ProgramStatus = ValueOf<typeof PROGRAM_STATUSES>;
export type DeliveryMode = ValueOf<typeof DELIVERY_MODES>;
export type EnquiryType = ValueOf<typeof ENQUIRY_TYPES>;
export type EnquiryStatus = ValueOf<typeof ENQUIRY_STATUSES>;
export type BroadcastStatus = ValueOf<typeof BROADCAST_STATUSES>;
export type ProposalStatus = ValueOf<typeof PROPOSAL_STATUSES>;
export type SubscriptionStatus = ValueOf<typeof SUBSCRIPTION_STATUSES>;
export type QualityTier = ValueOf<typeof QUALITY_TIERS>;
export type NotificationType = ValueOf<typeof NOTIFICATION_TYPES>;

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ApiError[];
}

export interface ApiError {
  field?: string;
  message: string;
  code?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// Auth types
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthUser {
  user_id: string;
  role: UserRole;
  full_name: string;
  email: string;
  profile_image_url: string | null;
  profile_completion_pct: number;
}

export interface LoginResponse {
  tokens: AuthTokens;
  user: AuthUser;
}

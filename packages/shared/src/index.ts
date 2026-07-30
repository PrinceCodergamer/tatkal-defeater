// ─── Resource Types ──────────────────────────────────────────
export enum ResourceType {
  TRAIN = 'TRAIN',
  FLIGHT = 'FLIGHT',
  HOTEL = 'HOTEL',
  CONCERT = 'CONCERT',
  VISA = 'VISA',
  APPOINTMENT = 'APPOINTMENT',
  FLASH_SALE = 'FLASH_SALE',
}

// ─── Reservation Status ──────────────────────────────────────
export enum ReservationStatus {
  PENDING = 'PENDING',   // Seat held, awaiting payment
  CONFIRMED = 'CONFIRMED', // Payment successful
  CANCELLED = 'CANCELLED', // User/system cancelled
  EXPIRED = 'EXPIRED',   // Hold timed out
  FAILED = 'FAILED',     // Payment failed
}

// ─── Queue / Token Status ────────────────────────────────────
export enum TokenStatus {
  WAITING = 'WAITING',
  ADMITTED = 'ADMITTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

// ─── Trust Levels (anti fake-demand) ─────────────────────────
export enum TrustLevel {
  TRUSTED = 'TRUSTED',
  NORMAL = 'NORMAL',
  FLAGGED = 'FLAGGED',
  RESTRICTED = 'RESTRICTED',
  BANNED = 'BANNED',
}

// ─── Payment ─────────────────────────────────────────────────
export enum PaymentStatus {
  INITIATED = 'INITIATED',
  PROCESSING = 'PROCESSING',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum DepositType {
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  FORFEIT = 'FORFEIT',
  BONUS = 'BONUS',
}

// ─── DTOs ────────────────────────────────────────────────────

export interface EnterQueueRequest {
  deviceFingerprint: string;
  identityToken?: string;
}

export interface EnterQueueResponse {
  tokenId: string;
  signedToken: string;
  queuePosition: number;
  totalWaiting: number;
  estimatedWaitSeconds: number;
}

export interface QueueStatusResponse {
  position: number;
  totalWaiting: number;
  status: TokenStatus;
  estimatedWaitSeconds: number;
}

export interface AdmitResponse {
  admitted: boolean;
  slotId?: string;
  holdExpiresAt?: string;
  message?: string;
}

export interface ReserveRequest {
  slotId: string;
  quantity: number;
  idempotencyKey: string;
}

export interface ReserveResponse {
  reservationId: string;
  status: ReservationStatus;
  holdExpiresAt: string;
}

export interface PaymentRequest {
  reservationId: string;
  idempotencyKey: string;
  paymentMethodId: string;
}

export interface PaymentResponse {
  paymentId: string;
  status: PaymentStatus;
  clientSecret?: string;
}

// ─── Constants ───────────────────────────────────────────────

export const HOLD_TTL_MINUTES = 5;
export const ADMISSION_RATE_PER_SEC = 500;
export const LOTTERY_DRAWS_PER_SEC = 10;
export const MAX_HOLDS_PER_IDENTITY = 5;
export const QUEUE_SCRAMBLE_INTERVAL_MS = 30000;
export const DEPOSIT_AMOUNT = 10; // ₹10 refundable deposit
export const MAX_HOLD_TO_BOOKING_ABANDON_RATIO = 0.5;

// ─── Error Codes ─────────────────────────────────────────────

export class SeatNotAvailableException extends Error {
  constructor() {
    super('Seat not available');
    this.name = 'SeatNotAvailableException';
  }
}

export class RateLimitExceededException extends Error {
  constructor() {
    super('Rate limit exceeded');
    this.name = 'RateLimitExceededException';
  }
}

export class IdentityRestrictedException extends Error {
  constructor(reason: string) {
    super(`Identity restricted: ${reason}`);
    this.name = 'IdentityRestrictedException';
  }
}

export class DoubleBookingAttemptException extends Error {
  constructor() {
    super('Double booking detected and prevented');
    this.name = 'DoubleBookingAttemptException';
  }
}

// ─── Feature Flags ──────────────────────────────────────────────

export enum FeatureFlag {
  LOTTERY_ANIMATION = 'lottery_animation',
  PAYMENT_FIRST_FLOW = 'payment_first_flow',
  AADHAAR_VERIFICATION = 'aadhaar_verification',
  DEPOSIT_SYSTEM = 'deposit_system',
  QUEUE_SCRAMBLE = 'queue_scramble',
  IDENTITY_VERIFICATION = 'identity_verification',
  DEVICE_FINGERPRINTING = 'device_fingerprinting',
  BEHAVIORAL_ANALYSIS = 'behavioral_analysis',
  ANOMALY_DETECTION = 'anomaly_detection',
  ADMIN_PANEL = 'admin_panel',
}

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlag, boolean> = {
  [FeatureFlag.LOTTERY_ANIMATION]: false,
  [FeatureFlag.PAYMENT_FIRST_FLOW]: false,
  [FeatureFlag.AADHAAR_VERIFICATION]: false,
  [FeatureFlag.DEPOSIT_SYSTEM]: false,
  [FeatureFlag.QUEUE_SCRAMBLE]: false,
  [FeatureFlag.IDENTITY_VERIFICATION]: false,
  [FeatureFlag.DEVICE_FINGERPRINTING]: true,
  [FeatureFlag.BEHAVIORAL_ANALYSIS]: false,
  [FeatureFlag.ANOMALY_DETECTION]: false,
  [FeatureFlag.ADMIN_PANEL]: false,
};

export interface UserIdentity {
  identityNumber: string;
  identityType: 'AADHAAR' | 'PAN' | 'PASSPORT' | 'PHONE' | 'EMAIL';
  consentGranted: boolean;
  consentTimestamp: string;
  deviceFingerprint?: string;
  ipAddress?: string;
}

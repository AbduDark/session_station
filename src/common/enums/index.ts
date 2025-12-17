export enum UserRole {
  PASSENGER = 'PASSENGER',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  FULL = 'FULL',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum PaymentStatus {
  INITIATED = 'INITIATED',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  WALLET = 'WALLET',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
}

export enum ComplaintStatus {
  OPEN = 'OPEN',
  IN_REVIEW = 'IN_REVIEW',
  CLOSED = 'CLOSED',
}

export enum NotificationType {
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  SESSION_FULL = 'SESSION_FULL',
  PAYOUT_APPROVED = 'PAYOUT_APPROVED',
  GENERAL = 'GENERAL',
}

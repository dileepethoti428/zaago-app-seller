// Subscription order timing configuration (IST-based)

export const SUBSCRIPTION_CONFIG = {
  // IST times
  ORDER_CREATION_TIME_IST: '23:30', // 11:30 PM IST
  ACCEPTANCE_DEADLINE_IST: '23:00', // 11:00 PM IST
  
  // UTC times (for cron jobs)
  ORDER_CREATION_TIME_UTC: '18:00', // 11:30 PM IST = 6:00 PM UTC
  ACCEPTANCE_DEADLINE_UTC: '17:30', // 11:00 PM IST = 5:30 PM UTC
  
  // Order statuses
  STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    NOT_ACCEPTED: 'not_accepted',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
  }
} as const;

export type OrderStatus = typeof SUBSCRIPTION_CONFIG.STATUS[keyof typeof SUBSCRIPTION_CONFIG.STATUS];

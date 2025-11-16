// Subscription order timing configuration (IST-based)

export const SUBSCRIPTION_CONFIG = {
  // IST times
  ORDER_CREATION_TIME_IST: '23:30', // 11:30 PM IST
  ACCEPTANCE_DEADLINE_IST: '11:00', // 11:00 AM IST (next day)
  
  // UTC times (for cron jobs)
  ORDER_CREATION_TIME_UTC: '18:00', // 11:30 PM IST = 6:00 PM UTC
  ACCEPTANCE_DEADLINE_UTC: '05:30', // 11:00 AM IST = 5:30 AM UTC
  DATE_UPDATE_TIME_UTC: '18:30', // Midnight IST = 6:30 PM UTC
  
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

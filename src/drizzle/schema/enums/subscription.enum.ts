export const SUBSCRIPTION_STATUS_CHOICES = {
  SUCCEEDED: 'succeeded',
  REQUIRES_ACTION: 'requires_action',
  REQUIRES_PAYMENT_METHOD: 'requires_payment_method',
  PROCESSING: 'processing',
  CANCELED: 'canceled',
  FAILED: 'failed',
} as const;

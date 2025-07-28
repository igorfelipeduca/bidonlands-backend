import { z } from 'zod';

export const StripePaymentCompletedDto = z.object(
  {
    id: z
      .string({ error: 'Stripe event id is required' })
      .optional()
      .nullable(),
    object: z.literal('event', {
      error: "Stripe event object must be 'event'",
    }),
    api_version: z.string({ error: 'Stripe api_version is required' }),
    created: z.number({ error: 'Stripe event created must be a number' }),
    data: z.object(
      {
        object: z.object(
          {
            id: z.string({ error: 'Payment intent id is required' }),
            object: z.literal('payment_intent', {
              error: "Payment intent object must be 'payment_intent'",
            }),
            amount: z.number({ error: 'Amount is required' }),
            amount_capturable: z.number({
              error: 'Amount capturable is required',
            }),
            amount_details: z.object(
              {
                tip: z.record(
                  z.string({ error: 'Tip key must be a string' }),
                  z.any(),
                  { error: 'Tip must be a record with string keys' },
                ),
              },
              { error: 'Amount details must be an object' },
            ),
            amount_received: z.number({ error: 'Amount received is required' }),
            application: z
              .string({ error: 'Application must be a string' })
              .nullable(),
            application_fee_amount: z
              .number({ error: 'Application fee amount must be a number' })
              .nullable(),
            automatic_payment_methods: z.any().nullable(),
            canceled_at: z
              .number({ error: 'Canceled at must be a number' })
              .nullable(),
            cancellation_reason: z
              .string({ error: 'Cancellation reason must be a string' })
              .nullable(),
            capture_method: z.string({ error: 'Capture method is required' }),
            client_secret: z.string({ error: 'Client secret is required' }),
            confirmation_method: z.string({
              error: 'Confirmation method is required',
            }),
            created: z.number({
              error: 'Payment intent created must be a number',
            }),
            currency: z.string({ error: 'Currency is required' }),
            customer: z
              .string({ error: 'Customer must be a string' })
              .nullable(),
            description: z
              .string({ error: 'Description is required' })
              .nullable()
              .optional(),
            invoice: z.string({ error: 'Invoice must be a string' }).nullable(),
            last_payment_error: z.any().nullable(),
            latest_charge: z
              .string({ error: 'Latest charge must be a string' })
              .nullable(),
            livemode: z.boolean({ error: 'Livemode must be a boolean' }),
            metadata: z.object(
              {
                advertId: z
                  .string({ error: 'Advert ID must be a string' })
                  .optional()
                  .nullable(),
                userId: z
                  .string({ error: 'User ID must be a string' })
                  .optional()
                  .nullable(),
                paymentId: z
                  .string({ error: 'Payment ID must be a string' })
                  .optional()
                  .nullable(),
                transactionType: z
                  .string({ error: 'Transaction type must be a string' })
                  .optional()
                  .nullable(),
              },
              { error: 'Metadata must be an object' },
            ),
            next_action: z.any().nullable(),
            on_behalf_of: z
              .string({ error: 'On behalf of must be a string' })
              .nullable(),
            payment_method: z
              .string({ error: 'Payment method must be a string' })
              .nullable(),
            payment_method_configuration_details: z.any().nullable(),
            payment_method_options: z.object(
              {
                card: z.object(
                  {
                    installments: z.any().nullable(),
                    mandate_options: z.any().nullable(),
                    network: z.any().nullable(),
                    request_three_d_secure: z.string({
                      error: 'Request three d secure is required',
                    }),
                  },
                  { error: 'Card must be an object' },
                ),
              },
              { error: 'Payment method options must be an object' },
            ),
            payment_method_types: z.array(
              z.string({ error: 'Payment method type must be a string' }),
              { error: 'Payment method types must be an array' },
            ),
            processing: z.any().nullable(),
            receipt_email: z
              .string({ error: 'Receipt email must be a string' })
              .nullable(),
            review: z.any().nullable(),
            setup_future_usage: z.any().nullable(),
            shipping: z
              .object(
                {
                  address: z.object(
                    {
                      city: z.string({ error: 'Shipping city is required' }),
                      country: z.string({
                        error: 'Shipping country is required',
                      }),
                      line1: z.string({ error: 'Shipping line1 is required' }),
                      line2: z
                        .string({ error: 'Shipping line2 must be a string' })
                        .nullable(),
                      postal_code: z.string({
                        error: 'Shipping postal code is required',
                      }),
                      state: z.string({ error: 'Shipping state is required' }),
                    },
                    { error: 'Shipping address must be an object' },
                  ),
                  carrier: z
                    .string({ error: 'Shipping carrier must be a string' })
                    .nullable(),
                  name: z.string({ error: 'Shipping name is required' }),
                  phone: z
                    .string({ error: 'Shipping phone must be a string' })
                    .nullable(),
                  tracking_number: z
                    .string({
                      error: 'Shipping tracking number must be a string',
                    })
                    .nullable(),
                },
                { error: 'Shipping must be an object' },
              )
              .optional()
              .nullable(),
            source: z.any().nullable(),
            statement_descriptor: z
              .string({ error: 'Statement descriptor must be a string' })
              .nullable(),
            statement_descriptor_suffix: z
              .string({ error: 'Statement descriptor suffix must be a string' })
              .nullable(),
            status: z.string({ error: 'Status is required' }),
            transfer_data: z.any().nullable(),
            transfer_group: z
              .string({ error: 'Transfer group must be a string' })
              .nullable(),
          },
          { error: 'Payment intent object is required' },
        ),
      },
      { error: 'Data is required' },
    ),
    livemode: z.boolean({ error: 'Livemode must be a boolean' }),
    pending_webhooks: z.number({ error: 'Pending webhooks must be a number' }),
    request: z
      .object(
        {
          id: z
            .string({ error: 'Request id is required' })
            .optional()
            .nullable(),
          idempotency_key: z
            .string({ error: 'Idempotency key is required' })
            .nullable()
            .optional(),
        },
        { error: 'Request must be an object' },
      )
      .nullable()
      .optional(),
    type: z.string({ error: 'Type is required' }),
  },
  { error: 'StripePaymentCompletedDto must be an object' },
);

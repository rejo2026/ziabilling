# Payment gateway plumbing

`gateway.cjs` defines the interface every payment provider must implement:

```js
class SomeGateway {
  get name() { return 'somegateway'; }
  createPaymentLink(invoice) { /* return { url } */ }
  verifyWebhookSignature(req) { /* return boolean */ }
}
```

Only `ManualGateway` ships today — it never touches real money. It just
points customers at the portal's own pay page
(`portal/server.cjs`'s `/pay/:invoiceId`), which marks an invoice paid
directly, simulating a successful payment.

## Adding a real gateway (e.g. Razorpay, Stripe)

1. Sign up for the provider and get **test-mode** API keys first.
2. Add them to `.env` (never commit real keys):
   ```
   PAYMENT_GATEWAY=razorpay
   RAZORPAY_KEY_ID=...
   RAZORPAY_KEY_SECRET=...
   ```
3. Create `razorpay-gateway.cjs` in this folder implementing the same
   interface — `createPaymentLink` calls the provider's API to create a
   real payment link/order, `verifyWebhookSignature` checks their webhook
   signature using your secret.
4. Switch `getGateway()` in `gateway.cjs` to return your new class when
   `process.env.PAYMENT_GATEWAY === 'razorpay'`.
5. Test thoroughly against the provider's sandbox before ever pointing
   `PAYMENT_GATEWAY` at production keys.

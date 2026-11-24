const crypto = require('crypto');

// Generic payment-gateway interface. Every real provider (Razorpay, Stripe,
// PayPal, ...) should implement this same shape; see README.md in this
// folder for how to add one. No real provider is wired up here — only the
// safe default below, which never touches real money.
//
// interface Gateway {
//   name: string;
//   createPaymentLink(invoice): { url: string };
//   verifyWebhookSignature(req): boolean;
// }

const PORTAL_SECRET = process.env.PORTAL_SECRET || 'zia-billing-dev-secret-change-me';
const PORTAL_PUBLIC_URL = process.env.PORTAL_PUBLIC_URL || 'http://localhost:4300';

function signInvoiceId(invoiceId) {
  return crypto.createHmac('sha256', PORTAL_SECRET).update(invoiceId).digest('hex').slice(0, 32);
}

// The honest default: no external processor. It just points at the portal's
// own pay page, which (today) marks an invoice paid without moving real
// money. This is what ships until a real gateway is configured.
class ManualGateway {
  get name() { return 'manual'; }

  createPaymentLink(invoice) {
    const token = signInvoiceId(invoice.id);
    return { url: `${PORTAL_PUBLIC_URL}/pay/${invoice.id}?token=${token}` };
  }

  // No real webhook exists for the manual gateway; nothing to verify.
  verifyWebhookSignature() {
    return true;
  }
}

function getGateway() {
  // Switch on PAYMENT_GATEWAY once a real provider is implemented, e.g.:
  //   if (process.env.PAYMENT_GATEWAY === 'razorpay') return new RazorpayGateway();
  return new ManualGateway();
}

module.exports = { getGateway, signInvoiceId, PORTAL_PUBLIC_URL };

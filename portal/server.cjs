// Standalone "hosted payment page" server — separate from the Zia-Billing
// desktop app on purpose. It reads/writes the SAME SQLite database the main
// app uses, so it must run somewhere that can reach that database file
// (same machine/network share today; a real public deployment needs that
// file reachable from wherever this runs, or a future move to a networked
// DB — see README.md).
require('dotenv').config();

const express = require('express');
const path = require('path');
const { openDb, loadState, makePersist, SINGLETON_KEYS, COLLECTION_KEYS } = require('../server/db.cjs');
const { signInvoiceId } = require('../server/payments/gateway.cjs');

const PORT = process.env.PORTAL_PORT || 4300;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'server', 'data.db');

// Minimal fallback shape so loadState() never crashes if a collection/
// singleton happens to be entirely empty — this server never seeds data,
// it only reads what the main app has already written.
const emptyDefaults = {};
SINGLETON_KEYS.forEach(k => { emptyDefaults[k] = {}; });
COLLECTION_KEYS.forEach(k => { emptyDefaults[k] = []; });

let db, persistState;

function getState() {
  return loadState(db, emptyDefaults);
}

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function findInvoiceOrReject(req, res) {
  const { invoiceId } = req.params;
  const { token } = req.method === 'GET' ? req.query : req.body;
  if (!token || token !== signInvoiceId(invoiceId)) {
    res.status(403).send('Invalid or missing payment link token.');
    return null;
  }
  const state = getState();
  const invoice = state.invoices.find(i => i.id === invoiceId);
  if (!invoice) {
    res.status(404).send('Invoice not found.');
    return null;
  }
  return { state, invoice, token };
}

app.get('/pay/:invoiceId', (req, res) => {
  const found = findInvoiceOrReject(req, res);
  if (!found) return;
  const { invoice, token } = found;

  if (invoice.status === 'PAID') {
    return res.send(renderPage(`<h2>Already paid</h2><p>Invoice ${invoice.id} was already paid. Thank you!</p>`));
  }

  res.send(renderPage(`
    <h2>Invoice ${invoice.id}</h2>
    <p><strong>${invoice.customerName}</strong></p>
    <p>Due: ${invoice.dueDate}</p>
    <table style="width:100%;margin:16px 0;">
      <tr><td>Subtotal</td><td style="text-align:right">₹${invoice.subtotal.toFixed(2)}</td></tr>
      <tr><td>Tax</td><td style="text-align:right">₹${invoice.tax.toFixed(2)}</td></tr>
      <tr><td>Discount</td><td style="text-align:right">-₹${invoice.discount.toFixed(2)}</td></tr>
      <tr style="font-weight:bold;border-top:1px solid #ccc;"><td>Total</td><td style="text-align:right">₹${invoice.total.toFixed(2)}</td></tr>
    </table>
    <form method="POST" action="/pay/${invoice.id}/confirm">
      <input type="hidden" name="token" value="${token}" />
      <button type="submit" style="width:100%;padding:12px;background:#4f46e5;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer;">
        Pay ₹${invoice.total.toFixed(2)}
      </button>
    </form>
    <p style="color:#888;font-size:12px;margin-top:16px;">No real payment processor is connected yet — this confirms payment directly for demo/testing purposes. See server/payments/README.md to wire up a real gateway.</p>
  `));
});

app.post('/pay/:invoiceId/confirm', (req, res) => {
  const found = findInvoiceOrReject(req, res);
  if (!found) return;
  const { state, invoice } = found;

  if (invoice.status !== 'PAID') {
    invoice.status = 'PAID';
    const customer = state.customers.find(c => c.id === invoice.customerId);
    if (customer) {
      customer.outstandingBalance = Math.max(0, (customer.outstandingBalance || 0) - invoice.total);
    }
    state.auditLogs.unshift({
      timestamp: new Date().toISOString(),
      user: 'Customer Portal',
      action: 'PORTAL_PAYMENT_CONFIRMED',
      details: `Invoice ${invoice.id} marked paid via hosted payment page (₹${invoice.total})`
    });
    persistState(state);
  }

  res.send(renderPage(`<h2>Payment received</h2><p>Thank you — invoice ${invoice.id} is now marked paid.</p>`));
});

function renderPage(bodyHtml) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Zia-Billing Payment</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body{font-family:system-ui,sans-serif;max-width:480px;margin:40px auto;padding:0 16px;color:#1e293b;}</style>
    </head><body>${bodyHtml}</body></html>`;
}

async function main() {
  db = await openDb(DB_FILE);
  persistState = makePersist(db);

  app.listen(PORT, () => {
    console.log(`Zia-Billing hosted payment portal listening on http://localhost:${PORT}`);
    console.log(`Reading database: ${DB_FILE}`);
  });
}

main().catch(err => {
  console.error('Failed to start portal server:', err);
  process.exit(1);
});

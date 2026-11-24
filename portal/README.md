# Zia-Billing hosted payment portal

A small, standalone server that renders a pay page for one invoice at a
time — the "hosted payment page" concept from Zoho Billing. It is
intentionally **separate** from the main Zia-Billing Electron app so it can
be deployed independently (e.g. to a small cloud VM or container host),
rather than running on the shop's desktop PC.

## Running locally (for testing, alongside the desktop app)

```
cd portal
npm install
cp .env.example .env     # defaults work for local testing
npm start
```

It opens the **same** SQLite file the main app uses (`server/data.db` by
default) — run it on the same machine as the main app while testing, so
`DB_FILE` can actually find it.

When the main app creates an invoice, it generates a `paymentLink` pointing
here: `http://localhost:4300/pay/<invoiceId>?token=<signed-token>`. The
token is an HMAC of the invoice ID using `PORTAL_SECRET` — it stops someone
from guessing another invoice's ID and viewing/paying it; **the same
`PORTAL_SECRET` must be set in both this portal's `.env` and wherever the
main app resolves `process.env.PORTAL_SECRET`** (currently defaulted in
`server/payments/gateway.cjs`), or tokens won't match.

No real payment processor is wired up — clicking "Pay" marks the invoice
paid directly, for demonstration purposes. See `server/payments/README.md`
for how to connect a real gateway.

## Deploying this publicly (what's needed, not done here)

This portal being reachable by actual customers on the internet needs:

1. **Hosting somewhere public** with a domain and TLS — e.g. the included
   `Dockerfile` built and deployed to any container host (Render, Fly.io,
   a VPS, etc.). Set `PORTAL_PUBLIC_URL` to that real domain.
2. **Database reachability** — this is the real architectural gap. Today
   the portal reads the exact SQLite file the desktop app writes to. A
   container running on a public host can't reach a file on the shop's
   Windows PC. Two ways to close this gap, neither done in this change:
   - Sync `data.db` (or just the invoices/subscriptions/customers tables)
     from the desktop app to wherever the portal runs, on a schedule.
   - Migrate both the desktop app and this portal to a shared networked
     database (e.g. Postgres) instead of local SQLite — a bigger change
     affecting `server/db.cjs` on both sides.
3. **A real payment gateway** configured per `server/payments/README.md`,
   so "Pay" actually charges a card/UPI instead of just flipping a status
   flag.

Until those are done, this portal is proven to work for local/LAN testing
only — it is not yet something a real customer across the internet can use.

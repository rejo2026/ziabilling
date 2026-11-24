FROM node:20-slim

WORKDIR /app/portal

# sql.js is pure WebAssembly, no native compilation needed.
COPY portal/package.json ./
RUN npm install --omit=dev

COPY portal/server.cjs ./
COPY server/db.cjs ../server/db.cjs
COPY server/payments/gateway.cjs ../server/payments/gateway.cjs

EXPOSE 4300
CMD ["node", "server.cjs"]

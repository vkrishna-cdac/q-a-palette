# syntax=docker/dockerfile:1.7

# -- Builder stage: install deps and build TanStack Start (Nitro) app --
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy rest of the source
COPY . .

# Build for Node (Docker).
# "node-server" produces a plain Node.js server at .output/server/index.mjs
ENV NITRO_PRESET=node-server
RUN npm run build

# -- Runner stage: minimal production image --
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DATABASE_PATH=/app/data/app.db
# JWT_SECRET has no default on purpose — must be set at deploy time (e.g. `docker run -e JWT_SECRET=...`).

# Run as non-root for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Only runtime artifacts are needed.
# .output contains server/index.mjs + public assets (Nitro node-server layout);
# better-sqlite3's native binding is traced and copied into .output/server/node_modules automatically.
# package.json is copied for metadata (no node_modules needed - output is self-contained)
# drizzle/ holds the SQL migrations, applied automatically on boot by src/server/db.ts.
COPY --from=builder --chown=appuser:appgroup /app/.output ./.output
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=builder --chown=appuser:appgroup /app/drizzle ./drizzle

RUN mkdir -p /app/data && chown appuser:appgroup /app/data
VOLUME ["/app/data"]

USER appuser
EXPOSE 3000

# Nitro node-server reads HOST/PORT from env
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/ >/dev/null 2>&1 || exit 1

CMD ["node", ".output/server/index.mjs"]

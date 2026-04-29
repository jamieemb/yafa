# syntax=docker/dockerfile:1.7

# ───────────────────────── Stage 1: install deps ─────────────────────────
# Includes dev deps so the build stage has TypeScript, Prisma CLI, etc.
# Build tools (python3 + g++) are kept in case better-sqlite3's prebuilt
# binary doesn't match the runtime arch and node-gyp has to compile.
FROM node:24-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ───────────────────────── Stage 2: build ────────────────────────────────
FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate the Prisma client into src/generated/prisma (per schema.prisma)
# then produce the optimised .next build.
RUN npx prisma generate
RUN npm run build

# ───────────────────────── Stage 3: runtime ──────────────────────────────
FROM node:24-bookworm-slim AS runtime
WORKDIR /app

# openssl is required by Prisma's CLI engine for `prisma db push` at
# entrypoint; without it Prisma can't detect the libssl version and
# falls back to a non-existent "openssl-1.1.x" on Bookworm.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Default DB location inside the container; map a host directory or
# named volume to /data to make it persistent.
ENV DATABASE_URL=file:/data/yafa.db

# Run as a non-root user. /data is created and owned by the app user
# so prisma can create the SQLite file on first start.
RUN useradd --create-home --uid 1001 yafa \
 && mkdir -p /data \
 && chown -R yafa:yafa /data

# Copy the built artefacts and runtime deps from the build stage.
COPY --from=build --chown=yafa:yafa /app/.next ./.next
COPY --from=build --chown=yafa:yafa /app/public ./public
COPY --from=build --chown=yafa:yafa /app/node_modules ./node_modules
COPY --from=build --chown=yafa:yafa /app/prisma ./prisma
COPY --from=build --chown=yafa:yafa /app/prisma.config.ts ./prisma.config.ts
COPY --from=build --chown=yafa:yafa /app/package.json ./package.json
COPY --from=build --chown=yafa:yafa /app/src/generated ./src/generated

COPY --chown=yafa:yafa docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER yafa
EXPOSE 3000

# `start-period` gives `prisma db push` + `next start` time on first
# boot. Uses Node's built-in fetch so we don't need curl in the image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]

# Use Node.js 20 Alpine to match CI/CD pipeline
FROM node:26-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Copy Prisma schema before npm ci (needed for postinstall script)
COPY prisma ./prisma

# Install dependencies (postinstall will run prisma generate)
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# NEXT_PUBLIC_* values are baked into the browser JavaScript at BUILD time (and are
# visible to anyone who views the page), so they are build arguments, not runtime secrets.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_GA_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY \
    NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Migrator: a small, separate image used ONLY to create or upgrade the database tables
# (`prisma migrate deploy`). The production image below has the database library but not
# the Prisma command-line tool, so the migration needs its own image. Build it with
#   docker build --target migrator .
# It sits before `runner` so a plain `docker build .` still produces the app image.
FROM base AS migrator-deps
WORKDIR /app
# Only the two packages the migration needs, at the exact versions in package-lock.json. The
# full dependency tree (test and lint tools included) used to be copied here, which put about
# 200 unrelated findings into the vulnerability scan for a pod that lives a few seconds.
COPY package-lock.json ./
RUN set -e; \
    PRISMA_VERSION=$(node -p "require('./package-lock.json').packages['node_modules/prisma'].version"); \
    CLIENT_VERSION=$(node -p "require('./package-lock.json').packages['node_modules/@prisma/client'].version"); \
    npm init -y >/dev/null; \
    npm install --omit=dev --no-audit --no-fund "prisma@$PRISMA_VERSION" "@prisma/client@$CLIENT_VERSION"

FROM base AS migrator
WORKDIR /app
ENV NODE_ENV=production \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1
COPY --from=migrator-deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node prisma ./prisma
# npm is not needed to run the migration (node starts the Prisma CLI directly), and its own
# bundled packages were being reported by the scan, so it is removed.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
USER node
CMD ["node", "node_modules/prisma/build/index.js", "migrate", "deploy"]

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# npm is only needed to build; the site runs with `node`. Removing it drops about 35 scan findings
# in packages the running site never loads.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]


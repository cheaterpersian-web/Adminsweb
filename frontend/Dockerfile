# Install deps and build
FROM node:20-alpine AS deps
WORKDIR /app
# Needed for Next.js SWC binaries on Alpine
RUN apk add --no-cache libc6-compat
# Allow overriding the npm registry at build time (use --build-arg NPM_REGISTRY=...)
ARG NPM_REGISTRY=https://registry.npmjs.org/
# Make network installs more resilient
ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_FACTOR=2 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_NETWORK_TIMEOUT=600000 \
    CI=true
RUN npm config set registry $NPM_REGISTRY && npm set progress=false
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN set -e; \
    try_install() { \
      if [ -f package-lock.json ]; then \
        npm ci --no-audit --no-fund --network-timeout=$NPM_CONFIG_NETWORK_TIMEOUT; \
      elif [ -f yarn.lock ]; then \
        corepack enable && corepack prepare yarn@stable --activate && yarn install --frozen-lockfile; \
      elif [ -f pnpm-lock.yaml ]; then \
        corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile; \
      else \
        npm install --no-audit --no-fund --network-timeout=$NPM_CONFIG_NETWORK_TIMEOUT; \
      fi; \
    }; \
    for attempt in 1 2 3; do \
      if try_install; then \
        break; \
      fi; \
      if [ "$attempt" -eq 3 ]; then \
        echo "Dependency installation failed after $attempt attempts."; \
        exit 1; \
      fi; \
      echo "Dependency installation failed (attempt $attempt). Retrying..."; \
      rm -rf node_modules /root/.npm/_cacache || true; \
      sleep $((attempt*10)); \
    done

FROM node:20-alpine AS builder
WORKDIR /app
# Ensure compatibility for Next.js SWC runtime during build
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/public
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Ensure compatibility for Next.js SWC runtime at runtime
RUN apk add --no-cache libc6-compat
COPY --from=builder /app/.next ./.next
# Ensure public directory exists even if project has none
RUN mkdir -p /app/public
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "start"]
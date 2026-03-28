FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/config/package.json ./packages/config/
COPY services/request-service/package.json ./services/request-service/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @sahayasetu/types build
RUN pnpm --filter @sahayasetu/utils build
RUN pnpm --filter @sahayasetu/config build
RUN pnpm --filter @sahayasetu/request-service build

FROM node:20-alpine AS runner
RUN npm install -g pnpm
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/services/request-service/dist ./dist
COPY --from=builder /app/services/request-service/package.json ./
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
  CMD wget -qO- http://localhost:3002/api/v1/health || exit 1
CMD ["node", "dist/main"]

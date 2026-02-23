FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/core/package.json ./packages/core/
COPY packages/llm-gateway/package.json ./packages/llm-gateway/
COPY packages/hypothesis-engine/package.json ./packages/hypothesis-engine/
COPY packages/signal-collector/package.json ./packages/signal-collector/
COPY packages/human-gates/package.json ./packages/human-gates/
COPY packages/learning-library/package.json ./packages/learning-library/
COPY packages/agent-sdk/package.json ./packages/agent-sdk/
COPY packages/auth/package.json ./packages/auth/
COPY packages/billing/package.json ./packages/billing/
RUN pnpm install --frozen-lockfile --prod

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm turbo build --filter=@outcome-runtime/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/server.js"]

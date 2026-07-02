FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY schemas ./schemas
RUN pnpm install --frozen-lockfile
RUN pnpm build --filter=@ellipse/orchestrator...

FROM base AS orchestrator
COPY --from=builder /app /app
WORKDIR /app/packages/orchestrator
ENV NODE_ENV=production
EXPOSE 4400
CMD ["node", "dist/server.js"]

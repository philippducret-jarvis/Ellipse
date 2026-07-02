FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
RUN pnpm install --frozen-lockfile
RUN pnpm build --filter=@ellipse/agents...

FROM base AS agent-worker
COPY --from=builder /app /app
WORKDIR /app/packages/agents
ENV NODE_ENV=production
ARG AGENT_ID=character
ENV AGENT_ID=${AGENT_ID}
CMD ["node", "dist/worker.js"]

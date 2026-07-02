FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
RUN pnpm install --frozen-lockfile
RUN pnpm build --filter=@ellipse/cortex...

FROM base AS cortex
COPY --from=builder /app /app
WORKDIR /app/packages/cortex
ENV NODE_ENV=production
ENV ORCHESTRATOR_PORT=4401
EXPOSE 4401
CMD ["node", "-e", "console.log('ellipse-cortex: embed @ellipse/cortex via orchestrator until ONNX service HTTP lands')"]

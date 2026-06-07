FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY libraries/core/package.json libraries/core/
COPY apps/waBot/package.json apps/waBot/

RUN corepack enable && pnpm install --frozen-lockfile --filter @aetherlink/wa-bot...

COPY libraries/core libraries/core
COPY apps/waBot apps/waBot

RUN cd /app && pnpm --filter @aetherlink/core build

WORKDIR /app/apps/waBot

ENV SESSION_PATH=/data/session

CMD ["pnpm", "start"]

FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache ffmpeg python3 make g++

FROM base AS deps
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

FROM base AS build
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN mkdir -p public/hls public/recordings public/snapshots public/cloud

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]

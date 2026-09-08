# syntax=docker/dockerfile:1

# --- Client build (Vite) ---
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- Server deps ---
FROM node:20-alpine AS server-deps
WORKDIR /app/server
RUN apk add --no-cache libc6-compat
COPY server/package.json server/package-lock.json* ./
RUN npm ci

# --- One-shot DB init (schema + seed PIN) ---
FROM node:20-alpine AS migrate
WORKDIR /app/server
RUN apk add --no-cache libc6-compat
COPY --from=server-deps /app/server/node_modules ./node_modules
COPY server/package.json ./
COPY server/tsconfig.json ./
COPY server/src ./src
CMD ["npx", "tsx", "src/db/init.ts"]

# --- Production runner (Express serves API + client dist) ---
FROM node:20-alpine AS runner
WORKDIR /app/server
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV CLIENT_DIST=/app/client-dist

RUN apk add --no-cache libc6-compat \
  && addgroup -S nodejs \
  && adduser -S mypocket -G nodejs

COPY --from=server-deps /app/server/node_modules ./node_modules
COPY server/package.json ./
COPY server/tsconfig.json ./
COPY server/src ./src
COPY --from=client-build /app/client/dist /app/client-dist

RUN mkdir -p /app/server/src/uploads \
  && chown -R mypocket:nodejs /app

USER mypocket
EXPOSE 3000
CMD ["npx", "tsx", "src/index.ts"]

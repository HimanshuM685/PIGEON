# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

# Install C compiler for Falcon CLI native build
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests first (better layer caching)
COPY package.json package-lock.json ./

# Install ALL deps (including devDependencies for tsc)
RUN npm ci

# Copy source + Falcon C sources
COPY tsconfig.json ./
COPY src/ ./src/
COPY falcon-main/ ./falcon-main/

# Build: compile Falcon CLI (C) + transpile TypeScript
RUN npm run build

# ── Stage 2: Production runtime ──────────────────────────────────────────────
FROM node:20-slim AS runtime

WORKDIR /app

# Copy dependency manifests and install production-only deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled JS output
COPY --from=builder /app/dist/ ./dist/

# Copy compiled Falcon CLI binary
COPY --from=builder /app/falcon-main/pigeon_falcon_cli ./falcon-main/pigeon_falcon_cli

EXPOSE 3000

CMD ["node", "dist/server.js"]

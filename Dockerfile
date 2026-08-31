# Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package specification and lockfile (project uses Bun, not npm)
COPY package.json bun.lock ./

# Install all dependencies (including devDependencies needed for build)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build frontend and bundled backend
RUN bun run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built artifacts and package manifest
COPY --from=builder /app/package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle

# Install production dependencies only (no lockfile needed for a plain npm install)
RUN npm install --omit=dev --no-package-lock

# Expose server port
EXPOSE 3000

# Start compiled server
CMD ["node", "dist/server.cjs"]

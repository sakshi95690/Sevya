# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package specifications and lockfile
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci || npm install

# Copy source code
COPY . .

# Build frontend and bundled backend
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built artifacts and package manifest
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle

# Install production dependencies only
RUN npm ci --omit=dev || npm install --omit=dev

# Expose server port
EXPOSE 3000

# Start compiled server
CMD ["node", "dist/server.cjs"]

# Multi-stage build for API Gateway (Aggregator)

# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files (aggregator uses root package.json)
COPY ../package*.json ./

# Install dependencies
RUN npm ci

# Copy aggregator source code
COPY . ./aggregator/

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy root package files
COPY ../package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy aggregator source code
COPY --chown=nodejs:nodejs . ./aggregator/

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npx", "tsx", "aggregator/app.ts"]

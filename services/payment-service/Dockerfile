# Multi-stage build for Payment Service

# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install dependencies
RUN npm install

# Copy prisma schema
COPY prisma ./prisma/



# Copy source code
COPY . .

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init openssl


# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install only production dependencies
RUN npm install --only=production && \
    npm cache clean --force

# Copy prisma schema and generated client from builder
COPY --from=builder /app/prisma ./prisma/


# Copy source code
# Copy source code
COPY . .

# Create non-root user and fix permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app



# Expose port
EXPOSE 3003

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && npx tsx src/server.ts"]

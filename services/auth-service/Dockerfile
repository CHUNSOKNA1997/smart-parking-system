FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init openssl && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY package*.json .npmrc ./
RUN npm ci --omit=dev && npm cache clean --force

COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src/

RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx src/server.ts"]

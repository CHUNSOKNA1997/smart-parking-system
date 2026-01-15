FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY aggregator ./aggregator/

RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "tsx", "aggregator/app.ts"]

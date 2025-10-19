# Logging Configuration Guide

## Overview

The Smart Parking System uses multiple logging levels to help with development and debugging. You can control what gets logged to keep your console clean.

## Current Logging Setup

### Prisma Query Logging

**Location:**
- `services/auth-service/src/config/prisma.ts`
- `services/parking-service/src/config/prisma.ts`

**Current Configuration (Clean):**
```typescript
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['error', 'warn']  // ✅ Clean logs
    : ['error'],
});
```

**Previous Configuration (Verbose):**
```typescript
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']  // ❌ Shows all SQL queries
    : ['error'],
});
```

### What You'll See Now

**Before (Noisy):**
```bash
npm run dev

✅ Prisma connected to database
prisma:query BEGIN
prisma:query DEALLOCATE ALL
prisma:query SELECT NOW()
prisma:query COMMIT
prisma:query BEGIN
prisma:query SELECT ... FROM users WHERE email = $1
prisma:query COMMIT
[2025-10-19T07:36:57.016Z] INFO: Database connected successfully
[2025-10-19T07:36:57.668Z] INFO: Default user already exists
🚀 Auth Service running on port 3001
```

**After (Clean):**
```bash
npm run dev

✅ Prisma connected to database
[2025-10-19T07:36:57.016Z] INFO: Database connected successfully
[2025-10-19T07:36:57.668Z] INFO: Default user already exists
🚀 Auth Service running on port 3001
Environment: development
Health check: http://localhost:3001/health
API: http://localhost:3001/api/v1/auth
```

## Logging Levels Explained

### Prisma Log Levels

| Level | Description | When to Use |
|-------|-------------|-------------|
| `query` | Shows all SQL queries | Debugging database issues |
| `info` | General information | Tracking Prisma operations |
| `warn` | Warning messages | Default for development |
| `error` | Error messages only | Production & development |

### Application Log Levels

The application uses a custom logger (`utils/logger.ts`):

```typescript
logger.info("Server started")     // General info
logger.warn("Deprecation notice") // Warnings
logger.error("Connection failed") // Errors
```

## Customizing Logs

### Option 1: Environment Variable (Recommended)

Add to `.env`:
```env
# Enable query logging for debugging
DEBUG_QUERIES=true
```

Then update `prisma.ts`:
```typescript
const prisma = new PrismaClient({
  log: process.env.DEBUG_QUERIES === 'true'
    ? ['query', 'error', 'warn']
    : ['error', 'warn'],
});
```

### Option 2: Edit Prisma Config Directly

**For debugging SQL queries:**
```typescript
// services/auth-service/src/config/prisma.ts
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],  // Shows all queries
});
```

**For production-like logs:**
```typescript
const prisma = new PrismaClient({
  log: ['error'],  // Errors only
});
```

### Option 3: Dynamic Logging

```typescript
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' }
  ],
});

// Only log slow queries
prisma.$on('query', (e) => {
  if (e.duration > 1000) {  // Queries over 1 second
    console.log(`Slow query (${e.duration}ms): ${e.query}`);
  }
});
```

## Request Logging

### Current Setup

Both services log incoming requests:

**auth-service/src/app.ts:**
```typescript
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

### Disable Request Logging

Comment out or remove:
```typescript
// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.path}`);
//   next();
// });
```

### Use Morgan for Better Request Logs

Install Morgan:
```bash
npm install morgan
npm install --save-dev @types/morgan
```

Update `app.ts`:
```typescript
import morgan from 'morgan';

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Production logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
}
```

## Production Logging Best Practices

### 1. Minimal Console Logs
```typescript
const prisma = new PrismaClient({
  log: ['error'],  // Errors only
});
```

### 2. Use Structured Logging
```typescript
// Instead of console.log
logger.info('Server started', { port: 3001, env: 'production' });
```

### 3. Log to Files
```bash
npm install winston winston-daily-rotate-file
```

```typescript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});
```

### 4. Use Log Aggregation
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana Loki**
- **Datadog**
- **New Relic**

## Debugging Tips

### Enable Query Logging Temporarily

```bash
# In one terminal, enable query logging
export DEBUG_QUERIES=true
cd services/auth-service
npm run dev

# In another terminal, run normally
cd services/parking-service
npm run dev
```

### Trace Specific Operations

```typescript
// Wrap code with timing
console.time('Database Query');
const user = await prisma.user.findUnique({ where: { id } });
console.timeEnd('Database Query');
```

### Use Prisma Studio

```bash
cd services/auth-service
npm run prisma:studio
```

This opens a GUI to view database queries in real-time.

## Log Output Examples

### Clean Development Logs (Current)
```
✅ Prisma connected to database
[2025-10-19T07:36:57.016Z] INFO: Database connected successfully
[2025-10-19T07:36:57.668Z] INFO: Default user already exists
🚀 Auth Service running on port 3001
Environment: development
```

### With Query Logging (Debugging)
```
✅ Prisma connected to database
prisma:query SELECT NOW()
[2025-10-19T07:36:57.016Z] INFO: Database connected successfully
prisma:query SELECT * FROM users WHERE email = 'admin@gmail.com'
[2025-10-19T07:36:57.668Z] INFO: Default user already exists
```

### Production Logs (Minimal)
```
[2025-10-19T07:36:57.016Z] INFO: Server started on port 3001
```

## Environment-Based Configuration

### .env.development
```env
NODE_ENV=development
DEBUG_QUERIES=false
LOG_LEVEL=info
```

### .env.production
```env
NODE_ENV=production
DEBUG_QUERIES=false
LOG_LEVEL=error
```

## Common Issues

### Too Many Logs?
**Solution:** Set `log: ['error']` in Prisma config

### Not Seeing Errors?
**Solution:** Check `log` includes `'error'`

### Want to Debug SQL?
**Solution:** Temporarily add `'query'` to Prisma log array

### Logs Not Formatted?
**Solution:** Use Winston or Pino for structured logging

## Summary

**Current Configuration (Recommended):**
- ✅ Clean console output
- ✅ Shows errors and warnings
- ✅ No SQL query spam
- ✅ Easy to debug when needed

**To Enable Verbose Logging:**
Change `['error', 'warn']` to `['query', 'error', 'warn']` in `config/prisma.ts`

**To Completely Silence Logs:**
Change to `['error']` only

---

**Your logs are now clean! 🎉**

If you need to see SQL queries for debugging, you can temporarily enable them by adding `'query'` back to the log array.

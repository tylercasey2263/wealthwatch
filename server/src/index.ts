import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import session from 'express-session';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.ts';
import accountRoutes from './routes/accounts.ts';
import transactionRoutes from './routes/transactions.ts';
import debtRoutes from './routes/debts.ts';
import investmentRoutes from './routes/investments.ts';
import budgetRoutes from './routes/budgets.ts';
import dashboardRoutes from './routes/dashboard.ts';
import projectionRoutes from './routes/projections.ts';
import importRoutes from './routes/import.ts';
import apiKeyRoutes from './routes/apiKeys.ts';
import adminRoutes from './routes/admin.ts';
import plaidRoutes from './routes/plaid.ts';
import goalsRoutes from './routes/goals.ts';
import { rateLimit } from './middleware/rateLimiter.ts';
import { csrfProtection, sanitizeInput, additionalSecurityHeaders, requestId } from './middleware/security.ts';
import { auditLog } from './middleware/audit.ts';
import { apiKeyAuth } from './middleware/apiKeyAuth.ts';

dotenv.config();

const app = express();

// Configure trust proxy so req.ip reflects the real client IP when behind a reverse proxy.
// Set TRUST_PROXY=1 in production (single proxy), or the proxy's IP address.
// Leave unset in development to use direct socket address (prevents IP spoofing in dev).
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY);
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
const PORT = parseInt(process.env.PORT || '3001');
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || '3443');
const USE_HTTPS = process.env.ENABLE_HTTPS === 'true';

// In dev: Vite runs HTTP on 5173, proxies to HTTPS backend on 3443
// In prod: serve built client directly from this HTTPS server
const clientOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

// === Security Middleware Stack ===

// Request ID for tracing
app.use(requestId);

// Security headers (Helmet with proper CSP)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Vite dev needs inline scripts
      styleSrc: ["'self'", "'unsafe-inline'"],    // Tailwind needs inline styles
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", clientOrigin, "https://localhost:3443", "https://cdn.plaid.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'", "https://cdn.plaid.com"],  // Plaid Link iframe
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for Plaid Link
}));
app.use(additionalSecurityHeaders);

// HSTS — enforce HTTPS for browsers (max-age 1 year, includeSubDomains)
if (USE_HTTPS) {
  app.use((_req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}

// Compression
app.use(compression());

// CORS
app.use(cors({
  origin: clientOrigin,
  credentials: true,
  exposedHeaders: ['X-CSRF-Token', 'X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-API-Key', 'Authorization'],
}));

// Body parsing with strict limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Input sanitization (XSS prevention)
app.use(sanitizeInput);

// Global rate limiter: 200 requests per minute per IP
app.use(rateLimit({ windowMs: 60 * 1000, maxRequests: 200, message: 'Too many requests from this IP' }));

// Require SESSION_SECRET to be explicitly set
if (!process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET environment variable is not set. Refusing to start without a strong secret.');
  process.exit(1);
}

// Session management
app.use(session({
  name: 'fincmd.sid',  // Custom cookie name (don't reveal framework)
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',  // Secure in production (served directly over HTTPS)
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours (reduced from 24)
    sameSite: 'strict',          // Upgraded from 'lax' to 'strict'
    path: '/',
  },
}));

// Inject Prisma client
app.use((req: any, _res: any, next: any) => {
  req.prisma = prisma;
  next();
});

// API key authentication (checks header, falls through to session auth if absent)
app.use('/api', apiKeyAuth);

// CSRF protection (skipped for API key auth and login/register)
app.use('/api', csrfProtection);

// Audit logging (records all state-changing operations)
app.use('/api', auditLog);

// === Routes ===
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/projections', projectionRoutes);
app.use('/api/import', importRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/plaid', plaidRoutes);
app.use('/api/goals', goalsRoutes);

// === Serve built client (production mode) ===
const clientDistPath = path.join(import.meta.dir, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// Health check (no auth required) — intentionally minimal to avoid info disclosure
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// SPA fallback — serve index.html for non-API routes (client-side routing)
if (fs.existsSync(clientDistPath)) {
  app.get('{*path}', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Error handler — log full stack in dev, never leak internals to client
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.stack || err.message || err);
  res.status(500).json({ error: 'Internal server error' });
});

// === Server Startup ===
if (USE_HTTPS) {
  const certsDir = path.join(import.meta.dir, '..', 'certs');
  const keyPath = path.join(certsDir, 'server.key');
  const certPath = path.join(certsDir, 'server.cert');

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.error('TLS certificates not found. Run: bun run scripts/generate-certs.ts');
    process.exit(1);
  }

  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  // HTTPS server
  https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
    console.log(`HTTPS server running on https://localhost:${HTTPS_PORT}`);
    console.log(`Security: encryption=${!!process.env.ENCRYPTION_KEY}, https=true, csrf=enabled, csp=enabled`);
  });

  // HTTP redirect server — redirects all HTTP to HTTPS
  const redirectApp = express();
  redirectApp.use((_req, res) => {
    const host = _req.headers.host?.replace(`:${PORT}`, `:${HTTPS_PORT}`) || `localhost:${HTTPS_PORT}`;
    res.redirect(301, `https://${host}${_req.url}`);
  });
  redirectApp.listen(PORT, () => {
    console.log(`HTTP redirect server on http://localhost:${PORT} → https://localhost:${HTTPS_PORT}`);
  });
} else {
  // HTTP-only mode (development without HTTPS)
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Security: encryption=${!!process.env.ENCRYPTION_KEY}, https=false, csrf=enabled, csp=enabled`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Tip: Set ENABLE_HTTPS=true in .env for HTTPS mode`);
    }
  });
}

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { prisma };
export default app;

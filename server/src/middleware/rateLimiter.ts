import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  message?: string;     // Error message
}

/**
 * In-memory rate limiter using a fixed window.
 * For production behind a load balancer, replace with Redis-backed implementation.
 */
class RateLimiterStore {
  private entries = new Map<string, RateLimitEntry>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Clean expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  check(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || now > entry.resetAt) {
      // New window
      this.entries.set(key, { count: 1, resetAt: now + config.windowMs });
      return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
    }

    entry.count++;
    const allowed = entry.count <= config.maxRequests;
    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetAt: entry.resetAt,
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now > entry.resetAt) this.entries.delete(key);
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

const store = new RateLimiterStore();

/**
 * Get client IP — uses req.ip which Express resolves correctly
 * when trust proxy is configured (set TRUST_PROXY env var).
 * Falls back to socket address when no proxy is in use.
 */
function getClientIP(req: Request): string {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * General-purpose rate limiter middleware.
 */
export function rateLimit(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `general:${getClientIP(req)}`;
    const result = store.check(key, config);

    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    if (!result.allowed) {
      res.status(429).json({
        error: config.message || 'Too many requests, please try again later',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      });
      return;
    }
    next();
  };
}

/**
 * Strict rate limiter for auth endpoints (login/register).
 * Uses IP + normalized email as key to prevent credential stuffing.
 * Email is normalized to lowercase to prevent case-variation bypasses.
 */
export function authRateLimit(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = getClientIP(req);
    // Normalize email for consistent keying — prevents bypass via case variation
    const rawEmail = req.body?.email;
    const email = typeof rawEmail === 'string'
      ? rawEmail.toLowerCase().trim()
      : 'unknown';
    const key = `auth:${ip}:${email}`;
    const result = store.check(key, config);

    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);

    if (!result.allowed) {
      res.status(429).json({
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      });
      return;
    }
    next();
  };
}

/**
 * API key rate limiter — higher limits for authenticated API access.
 */
export function apiKeyRateLimit(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.headers['x-api-key'] as string || getClientIP(req);
    const key = `api:${apiKey}`;
    const result = store.check(key, config);

    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);

    if (!result.allowed) {
      res.status(429).json({
        error: 'API rate limit exceeded',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      });
      return;
    }
    next();
  };
}

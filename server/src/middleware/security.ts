import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * CSRF Protection using the Synchronizer Token Pattern.
 * Generates a token per session and validates it on state-changing requests.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for API key-authenticated requests
  if (req.headers['x-api-key']) {
    next();
    return;
  }

  // Generate CSRF token if not present in session
  if (!(req.session as any).csrfToken) {
    (req.session as any).csrfToken = crypto.randomBytes(32).toString('hex');
  }

  // Always expose the token via a response header (client reads this)
  res.setHeader('X-CSRF-Token', (req.session as any).csrfToken);

  // Only validate on state-changing methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    next();
    return;
  }

  // Skip CSRF check for login/register (no session yet)
  // Use exact path match — not includes() which allows substring bypass
  if (req.path === '/auth/login' || req.path === '/auth/register') {
    next();
    return;
  }

  const token = req.headers['x-csrf-token'] as string;
  const sessionToken = (req.session as any).csrfToken;
  if (!token || token !== sessionToken) {
    console.error(`CSRF mismatch: header=${token?.substring(0,16)}... session=${sessionToken?.substring(0,16)}... path=${req.path}`);
    res.status(403).json({ error: 'Invalid or missing CSRF token' });
    return;
  }

  next();
}

/**
 * Safe script-tag removal using linear indexOf scan.
 * Avoids ReDoS-vulnerable nested quantifier regex patterns.
 */
function removeScriptTags(str: string): string {
  const parts: string[] = [];
  let pos = 0;

  while (pos < str.length) {
    // Case-insensitive search via lowercased copy indexed into original string
    const lower = str.toLowerCase();
    const start = lower.indexOf('<script', pos);
    if (start === -1) {
      parts.push(str.slice(pos));
      break;
    }
    parts.push(str.slice(pos, start));
    const end = lower.indexOf('</script>', start);
    if (end === -1) {
      // No closing tag — drop everything from <script onwards
      break;
    }
    pos = end + 9; // skip past </script>
  }

  return parts.join('');
}

/**
 * Sanitize a single string value.
 * Removes null bytes, control characters, script tags, and inline event handlers.
 */
function sanitizeString(str: string): string {
  // 1. Remove null bytes and dangerous control characters (preserve \t \n \r)
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 2. Remove <script>...</script> blocks — O(n) linear scan, no ReDoS
  str = removeScriptTags(str);

  // 3. Remove inline event handler attributes (onXxx="..." / onXxx='...' / onXxx=value)
  //    \bon\w+\s*= uses a word boundary so it won't match mid-word.
  //    Alternation branches are mutually exclusive and bounded — ReDoS safe.
  str = str.replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');

  return str;
}

/**
 * Recursively sanitize all string values in an array.
 */
function sanitizeArray(arr: any[], depth: number): void {
  if (depth > 10) return;
  for (let i = 0; i < arr.length; i++) {
    if (typeof arr[i] === 'string') {
      arr[i] = sanitizeString(arr[i]);
    } else if (Array.isArray(arr[i])) {
      sanitizeArray(arr[i], depth + 1);
    } else if (typeof arr[i] === 'object' && arr[i] !== null) {
      sanitizeObject(arr[i], depth + 1);
    }
  }
}

/**
 * Recursively sanitize all string values in an object.
 * Depth-limited to prevent stack overflow from deeply nested payloads.
 */
function sanitizeObject(obj: Record<string, any>, depth: number): void {
  if (depth > 10) return;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeString(obj[key]);
    } else if (Array.isArray(obj[key])) {
      sanitizeArray(obj[key], depth + 1);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key], depth + 1);
    }
  }
}

/**
 * Input sanitization middleware — strips dangerous characters from all string inputs.
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body, 0);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query as Record<string, any>, 0);
  }
  next();
}

/**
 * Password policy enforcement.
 */
export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const errors: string[] = [];

  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (password.length > 128) errors.push('Password must be less than 128 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Password must contain at least one special character');

  // Check for common patterns
  const commonPasswords = ['password', '12345678', 'qwerty', 'letmein', 'admin', 'welcome'];
  if (commonPasswords.some(cp => password.toLowerCase().includes(cp))) {
    errors.push('Password contains a commonly used pattern');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Account lockout tracker — locks accounts after too many failed login attempts.
 */
class AccountLockoutTracker {
  private attempts = new Map<string, { count: number; lockedUntil: number | null }>();
  private readonly maxAttempts: number;
  private readonly lockoutDurationMs: number;

  constructor(maxAttempts = 5, lockoutMinutes = 15) {
    this.maxAttempts = maxAttempts;
    this.lockoutDurationMs = lockoutMinutes * 60 * 1000;

    // Cleanup every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.attempts) {
        if (entry.lockedUntil && now > entry.lockedUntil) {
          this.attempts.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  recordFailedAttempt(email: string): { locked: boolean; remainingAttempts: number; lockoutMinutes?: number } {
    const entry = this.attempts.get(email) || { count: 0, lockedUntil: null };
    entry.count++;

    if (entry.count >= this.maxAttempts) {
      entry.lockedUntil = Date.now() + this.lockoutDurationMs;
      this.attempts.set(email, entry);
      return { locked: true, remainingAttempts: 0, lockoutMinutes: this.lockoutDurationMs / 60000 };
    }

    this.attempts.set(email, entry);
    return { locked: false, remainingAttempts: this.maxAttempts - entry.count };
  }

  isLocked(email: string): { locked: boolean; remainingMs?: number } {
    const entry = this.attempts.get(email);
    if (!entry || !entry.lockedUntil) return { locked: false };
    if (Date.now() > entry.lockedUntil) {
      this.attempts.delete(email);
      return { locked: false };
    }
    return { locked: true, remainingMs: entry.lockedUntil - Date.now() };
  }

  clearAttempts(email: string): void {
    this.attempts.delete(email);
  }
}

export const accountLockout = new AccountLockoutTracker(5, 15);

/**
 * Security headers middleware — supplements Helmet with additional headers.
 */
export function additionalSecurityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  next();
}

/**
 * Request ID middleware — assigns a unique ID to each request for tracing.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = crypto.randomUUID();
  (req as any).requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}

import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.ts';
import { validatePasswordPolicy, accountLockout } from '../middleware/security.ts';
import { authRateLimit } from '../middleware/rateLimiter.ts';
import { logLoginAttempt } from '../middleware/audit.ts';

const router = Router();

// Rate limit auth endpoints: 10 attempts per 15 minutes per IP+email
const loginLimiter = authRateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10 });

/**
 * Regenerate the session after auth state changes (login, register, password change).
 * Prevents session fixation attacks by issuing a new session ID.
 * Also generates a fresh CSRF token so the client can continue making requests.
 */
function rotateSession(
  req: Request,
  res: Response,
  userId: string,
  callback: (err?: Error) => void
): void {
  req.session.regenerate((regenErr) => {
    if (regenErr) return callback(regenErr);
    req.session.userId = userId;
    // Issue a fresh CSRF token for the new session
    (req.session as any).csrfToken = crypto.randomBytes(32).toString('hex');
    res.setHeader('X-CSRF-Token', (req.session as any).csrfToken);
    req.session.save((saveErr) => {
      if (saveErr) return callback(saveErr);
      callback();
    });
  });
}

router.post('/register', loginLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  const { email, password, firstName, lastName } = req.body;
  const prisma = (req as any).prisma;

  // Enforce password policy
  const policyResult = validatePasswordPolicy(password);
  if (!policyResult.valid) {
    res.status(400).json({ error: 'Password does not meet requirements', details: policyResult.errors });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) { res.status(409).json({ error: 'Email already registered' }); return; }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName },
    select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
  });

  await logLoginAttempt(prisma, email, req, true);

  // Rotate session to prevent session fixation
  rotateSession(req, res, user.id, (err) => {
    if (err) { res.status(500).json({ error: 'Session error' }); return; }
    res.status(201).json({ user });
  });
});

router.post('/login', loginLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  const { email, password } = req.body;
  const prisma = (req as any).prisma;

  // Check account lockout
  const lockStatus = accountLockout.isLocked(email);
  if (lockStatus.locked) {
    await logLoginAttempt(prisma, email, req, false, 'Account locked');
    res.status(423).json({
      error: 'Account temporarily locked due to too many failed attempts',
      retryAfterMs: lockStatus.remainingMs,
    });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    accountLockout.recordFailedAttempt(email);
    await logLoginAttempt(prisma, email, req, false, 'User not found');
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const lockResult = accountLockout.recordFailedAttempt(email);
    await logLoginAttempt(prisma, email, req, false, 'Invalid password');
    if (lockResult.locked) {
      res.status(423).json({
        error: `Account locked for ${lockResult.lockoutMinutes} minutes due to too many failed attempts`,
      });
      return;
    }
    res.status(401).json({
      error: 'Invalid email or password',
      remainingAttempts: lockResult.remainingAttempts,
    });
    return;
  }

  // Successful login — clear lockout and rotate session (prevents session fixation)
  accountLockout.clearAttempts(email);
  await logLoginAttempt(prisma, email, req, true);

  const userPayload = { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName };
  rotateSession(req, res, user.id, (err) => {
    if (err) { res.status(500).json({ error: 'Session error' }); return; }
    res.json({ user: userPayload });
  });
});

router.post('/logout', (req: Request, res: Response): void => {
  req.session.destroy((err) => {
    if (err) { res.status(500).json({ error: 'Logout failed' }); return; }
    res.clearCookie('fincmd.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
    select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
  });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json({ user });
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, [
  body('currentPassword').notEmpty(),
  body('newPassword').notEmpty(),
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  const { currentPassword, newPassword } = req.body;
  const prisma = (req as any).prisma;

  const policyResult = validatePasswordPolicy(newPassword);
  if (!policyResult.valid) {
    res.status(400).json({ error: 'New password does not meet requirements', details: policyResult.errors });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(401).json({ error: 'Current password is incorrect' }); return; }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  // Rotate session after password change — invalidates the previous session ID
  rotateSession(req, res, user.id, (err) => {
    if (err) { res.status(500).json({ error: 'Session error' }); return; }
    res.json({ message: 'Password changed successfully' });
  });
});

export default router;

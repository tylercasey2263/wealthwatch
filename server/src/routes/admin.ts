import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.ts';

const router = Router();
router.use(requireAuth);

// GET /api/admin/audit-log — View audit logs for the user
router.get('/audit-log', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const userId = req.session.userId;
  const { limit = '50', offset = '0', action, resource } = req.query;

  // Bound filter string lengths to prevent abuse of the contains query
  const safeAction = typeof action === 'string' ? action.slice(0, 200) : undefined;
  const safeResource = typeof resource === 'string' ? resource.slice(0, 100) : undefined;

  const where: any = { userId };
  if (safeAction) where.action = { contains: safeAction };
  if (safeResource) where.resource = safeResource;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit as string) || 50, 100),
      skip: parseInt(offset as string) || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ logs, total });
});

// GET /api/admin/login-history — View login attempts
router.get('/login-history', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const user = await prisma.user.findUnique({ where: { id: req.session.userId }, select: { email: true } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const attempts = await prisma.loginAttempt.findMany({
    where: { email: user.email },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json({ attempts });
});

// GET /api/admin/security-status — Overall security posture
router.get('/security-status', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const userId = req.session.userId;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, createdAt: true } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  // Active API keys
  const activeApiKeys = await prisma.apiKey.count({ where: { userId, isActive: true } });

  // Recent failed login attempts (last 24h)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentFailedLogins = await prisma.loginAttempt.count({
    where: { email: user.email, success: false, createdAt: { gte: oneDayAgo } },
  });

  // Recent audit activity (last 24h)
  const recentAuditActions = await prisma.auditLog.count({
    where: { userId, createdAt: { gte: oneDayAgo } },
  });

  // Total accounts
  const accountCount = await prisma.account.count({ where: { userId, isActive: true } });

  // Check for accounts with unencrypted account numbers
  const accountsWithNumbers = await prisma.account.count({
    where: { userId, accountNumber: { not: null } },
  });

  res.json({
    security: {
      activeApiKeys,
      recentFailedLogins,
      recentAuditActions,
      accountCount,
      accountsWithNumbers,
      encryptionEnabled: !!process.env.ENCRYPTION_KEY,
      sessionSecure: process.env.NODE_ENV === 'production',
      recommendations: buildSecurityRecommendations({
        encryptionEnabled: !!process.env.ENCRYPTION_KEY,
        sessionSecure: process.env.NODE_ENV === 'production',
        recentFailedLogins,
        activeApiKeys,
      }),
    },
  });
});

function buildSecurityRecommendations(status: {
  encryptionEnabled: boolean;
  sessionSecure: boolean;
  recentFailedLogins: number;
  activeApiKeys: number;
}): string[] {
  const recs: string[] = [];
  if (!status.encryptionEnabled) recs.push('Enable data encryption by setting ENCRYPTION_KEY in your environment');
  if (!status.sessionSecure) recs.push('Set NODE_ENV=production and enable HTTPS for secure cookies');
  if (status.recentFailedLogins > 3) recs.push('Multiple failed login attempts detected — consider changing your password');
  if (status.activeApiKeys > 5) recs.push('You have many active API keys — review and revoke unused keys');
  if (recs.length === 0) recs.push('Security posture looks good! All checks passed.');
  return recs;
}

export default router;

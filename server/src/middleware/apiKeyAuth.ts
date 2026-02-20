import type { Request, Response, NextFunction } from 'express';
import { hashApiKey } from '../services/encryption.ts';

/**
 * API Key authentication middleware.
 * Checks for X-API-Key header and authenticates the request.
 * Falls through to session auth if no API key is provided.
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    // No API key — fall through to session auth
    next();
    return;
  }

  const prisma = (req as any).prisma;
  if (!prisma) {
    next();
    return;
  }

  const keyHash = hashApiKey(apiKey);

  prisma.apiKey.findFirst({
    where: {
      keyHash,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
  })
    .then((record: any) => {
      if (!record) {
        res.status(401).json({ error: 'Invalid or expired API key' });
        return;
      }

      // Check permissions
      const method = req.method;
      const permissions = record.permissions.split(',');
      const isReadOnly = method === 'GET' || method === 'HEAD';
      const hasWritePermission = permissions.includes('write') || permissions.includes('admin');

      if (!isReadOnly && !hasWritePermission) {
        res.status(403).json({ error: 'API key does not have write permissions' });
        return;
      }

      // Set user context (same as session auth)
      req.session.userId = record.userId;
      (req as any).userId = record.userId;
      (req as any).apiKeyAuth = true;
      (req as any).apiKeyId = record.id;

      // Update last used timestamp (fire-and-forget)
      prisma.apiKey.update({
        where: { id: record.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => {});

      next();
    })
    .catch((err: any) => {
      console.error('API key auth error:', err.message);
      res.status(500).json({ error: 'Authentication error' });
    });
}

/**
 * Require either session auth or API key auth.
 * Used as a replacement for requireAuth on endpoints that support both.
 */
export function requireAuthOrApiKey(req: Request, res: Response, next: NextFunction): void {
  if (req.session.userId || (req as any).apiKeyAuth) {
    (req as any).userId = req.session.userId;
    next();
    return;
  }
  res.status(401).json({ error: 'Authentication required (session or API key)' });
}

import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.ts';
import { generateApiKey, hashApiKey } from '../services/encryption.ts';

const router = Router();
router.use(requireAuth);

// GET /api/api-keys — List user's API keys (never expose the full key)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const keys = await prisma.apiKey.findMany({
    where: { userId: req.session.userId },
    select: {
      id: true, name: true, keyPrefix: true, permissions: true,
      lastUsedAt: true, expiresAt: true, isActive: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ apiKeys: keys });
});

// POST /api/api-keys — Generate a new API key
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const { name, permissions, expiresInDays } = req.body;

  if (!name) { res.status(400).json({ error: 'Name is required' }); return; }

  const allowedPermissions = ['read', 'write'];
  const requestedPermissions = (permissions || 'read').split(',').map((p: string) => p.trim());
  if (!requestedPermissions.every((p: string) => allowedPermissions.includes(p))) {
    res.status(400).json({ error: `Invalid permissions. Allowed values: ${allowedPermissions.join(', ')}` });
    return;
  }

  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.substring(0, 12) + '...';

  // Validate expiry — must be a positive integer, max 10 years
  if (expiresInDays !== undefined && expiresInDays !== null) {
    const days = Number(expiresInDays);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      res.status(400).json({ error: 'expiresInDays must be an integer between 1 and 3650' });
      return;
    }
  }

  const expiresAt = expiresInDays
    ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000)
    : null;

  const apiKey = await prisma.apiKey.create({
    data: {
      userId: req.session.userId,
      name,
      keyHash,
      keyPrefix,
      permissions: permissions || 'read',
      expiresAt,
    },
    select: { id: true, name: true, keyPrefix: true, permissions: true, expiresAt: true, createdAt: true },
  });

  // Return the raw key ONCE — it can never be retrieved again
  res.status(201).json({
    apiKey,
    rawKey,
    warning: 'Save this key now. It cannot be retrieved again.',
  });
});

// DELETE /api/api-keys/:id — Revoke an API key
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;

  const key = await prisma.apiKey.findFirst({
    where: { id: req.params.id, userId: req.session.userId },
  });
  if (!key) { res.status(404).json({ error: 'API key not found' }); return; }

  await prisma.apiKey.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  res.json({ message: 'API key revoked' });
});

// PUT /api/api-keys/:id — Update API key settings
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const { name, permissions, isActive } = req.body;

  const key = await prisma.apiKey.findFirst({
    where: { id: req.params.id, userId: req.session.userId },
  });
  if (!key) { res.status(404).json({ error: 'API key not found' }); return; }

  if (permissions !== undefined) {
    const allowedPermissions = ['read', 'write'];
    const requestedPermissions = permissions.split(',').map((p: string) => p.trim());
    if (!requestedPermissions.every((p: string) => allowedPermissions.includes(p))) {
      res.status(400).json({ error: `Invalid permissions. Allowed values: ${allowedPermissions.join(', ')}` });
      return;
    }
  }

  const updated = await prisma.apiKey.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(permissions !== undefined && { permissions }),
      ...(isActive !== undefined && { isActive }),
    },
    select: { id: true, name: true, keyPrefix: true, permissions: true, isActive: true, expiresAt: true },
  });

  res.json({ apiKey: updated });
});

export default router;

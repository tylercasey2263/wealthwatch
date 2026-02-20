import { Router } from 'express';
import type { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.ts';

const router = Router();
router.use(requireAuth);

const VALID_PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const;

function validatePeriod(period: any): string | null {
  if (period === undefined) return null;
  if (!(VALID_PERIODS as readonly string[]).includes(period)) {
    return `period must be one of: ${VALID_PERIODS.join(', ')}`;
  }
  return null;
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const budgets = await prisma.budget.findMany({
    where: { userId: req.session.userId },
    orderBy: { category: 'asc' },
  });
  res.json({ budgets });
});

router.post('/', [
  body('category').trim().notEmpty().isLength({ max: 100 }),
  body('amount').isFloat({ min: 0 }),
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  const { category, amount, period } = req.body;

  const periodError = validatePeriod(period);
  if (periodError) { res.status(400).json({ error: periodError }); return; }

  const prisma = (req as any).prisma;
  const budget = await prisma.budget.create({
    data: { userId: req.session.userId!, category, amount: parseFloat(amount), period: period || 'monthly' },
  });
  res.status(201).json({ budget });
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const existing = await prisma.budget.findFirst({
    where: { id: req.params.id, userId: req.session.userId },
  });
  if (!existing) { res.status(404).json({ error: 'Budget not found' }); return; }

  const { category, amount, period } = req.body;

  const periodError = validatePeriod(period);
  if (periodError) { res.status(400).json({ error: periodError }); return; }

  if (category !== undefined && (typeof category !== 'string' || category.trim().length === 0 || category.length > 100)) {
    res.status(400).json({ error: 'category must be a non-empty string of 100 characters or fewer' });
    return;
  }

  const budget = await prisma.budget.update({
    where: { id: req.params.id },
    data: {
      ...(category !== undefined && { category: category.trim() }),
      ...(amount !== undefined && { amount: parseFloat(amount) }),
      ...(period !== undefined && { period }),
    },
  });
  res.json({ budget });
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const existing = await prisma.budget.findFirst({
    where: { id: req.params.id, userId: req.session.userId },
  });
  if (!existing) { res.status(404).json({ error: 'Budget not found' }); return; }

  await prisma.budget.delete({ where: { id: req.params.id } });
  res.json({ message: 'Budget deleted' });
});

export default router;

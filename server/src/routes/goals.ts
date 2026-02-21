import { Router } from 'express';
import type { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.ts';

const router = Router();
router.use(requireAuth);

const VALID_GOAL_TYPES = ['debt_free', 'savings', 'emergency_fund', 'investment', 'custom'] as const;

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const goals = await prisma.goal.findMany({
    where: { userId: req.session.userId },
    orderBy: [{ isCompleted: 'asc' }, { targetDate: 'asc' }],
  });
  res.json({ goals });
});

router.post('/', [
  body('title').trim().notEmpty().isLength({ max: 200 }),
  body('type').isIn(VALID_GOAL_TYPES),
  body('targetAmount').optional({ nullable: true }).isFloat({ min: 0 }),
  body('currentAmount').optional().isFloat({ min: 0 }),
  body('targetDate').optional({ nullable: true }).isISO8601(),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 1000 }),
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  const { title, type, targetAmount, currentAmount, targetDate, notes } = req.body;
  const prisma = (req as any).prisma;
  const goal = await prisma.goal.create({
    data: {
      userId: req.session.userId!,
      title: title.trim(),
      type,
      targetAmount: targetAmount != null ? parseFloat(targetAmount) : null,
      currentAmount: currentAmount != null ? parseFloat(currentAmount) : 0,
      targetDate: targetDate ? new Date(targetDate) : null,
      notes: notes || null,
    },
  });
  res.status(201).json({ goal });
});

router.put('/:id', [
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('targetAmount').optional({ nullable: true }).isFloat({ min: 0 }),
  body('currentAmount').optional().isFloat({ min: 0 }),
  body('targetDate').optional({ nullable: true }).isISO8601(),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 1000 }),
  body('isCompleted').optional().isBoolean(),
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  const prisma = (req as any).prisma;
  const existing = await prisma.goal.findFirst({
    where: { id: req.params.id, userId: req.session.userId },
  });
  if (!existing) { res.status(404).json({ error: 'Goal not found' }); return; }

  const { title, targetAmount, currentAmount, targetDate, notes, isCompleted } = req.body;
  const goal = await prisma.goal.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(targetAmount !== undefined && { targetAmount: targetAmount != null ? parseFloat(targetAmount) : null }),
      ...(currentAmount !== undefined && { currentAmount: parseFloat(currentAmount) }),
      ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
      ...(notes !== undefined && { notes }),
      ...(isCompleted !== undefined && { isCompleted }),
    },
  });
  res.json({ goal });
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const existing = await prisma.goal.findFirst({
    where: { id: req.params.id, userId: req.session.userId },
  });
  if (!existing) { res.status(404).json({ error: 'Goal not found' }); return; }

  await prisma.goal.delete({ where: { id: req.params.id } });
  res.json({ message: 'Goal deleted' });
});

export default router;

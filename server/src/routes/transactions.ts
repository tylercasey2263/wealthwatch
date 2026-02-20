import { Router } from 'express';
import type { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.ts';
import { encrypt, decrypt } from '../services/encryption.ts';

const router = Router();
router.use(requireAuth);

const VALID_TYPES = ['income', 'expense', 'transfer'] as const;

function decryptTransaction(t: any): any {
  const result = { ...t };
  if (result.description) {
    try { result.description = decrypt(result.description); } catch { /* legacy unencrypted data */ }
  }
  if (result.notes) {
    try { result.notes = decrypt(result.notes); } catch { /* legacy */ }
  }
  // Decrypt included account fields
  if (result.account) {
    const acct = { ...result.account };
    if (acct.name) { try { acct.name = decrypt(acct.name); } catch { /* legacy */ } }
    if (acct.institution) { try { acct.institution = decrypt(acct.institution); } catch { /* legacy */ } }
    result.account = acct;
  }
  return result;
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const { accountId, category, type, startDate, endDate, limit = '50', offset = '0' } = req.query;

  // Bound pagination to prevent data dumps
  const take = Math.min(Math.max(1, parseInt(limit as string) || 50), 200);
  const skip = Math.max(0, parseInt(offset as string) || 0);

  const where: any = { account: { userId: req.session.userId } };
  if (accountId && typeof accountId === 'string') where.accountId = accountId;
  if (category && typeof category === 'string') where.category = category;
  if (type && typeof type === 'string' && (VALID_TYPES as readonly string[]).includes(type)) where.type = type;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      const d = new Date(startDate as string);
      if (!isNaN(d.getTime())) where.date.gte = d;
    }
    if (endDate) {
      const d = new Date(endDate as string);
      if (!isNaN(d.getTime())) where.date.lte = d;
    }
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { account: { select: { name: true, institution: true, type: true } } },
      orderBy: { date: 'desc' },
      take,
      skip,
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({ transactions: transactions.map(decryptTransaction), total, limit: take, offset: skip });
});

router.post('/', [
  body('accountId').notEmpty(),
  body('date').isISO8601(),
  body('description').trim().notEmpty(),
  body('amount').isFloat(),
  body('type').isIn(VALID_TYPES),
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  const prisma = (req as any).prisma;
  const { accountId, date, description, amount, category, subcategory, type, isRecurring, notes } = req.body;

  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: req.session.userId },
  });
  if (!account) { res.status(404).json({ error: 'Account not found' }); return; }

  const parsedAmount = parseFloat(amount);

  // Atomic: create transaction and update balance in one DB transaction
  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        accountId,
        date: new Date(date),
        description: encrypt(description),
        amount: parsedAmount,
        category: category || 'Uncategorized',
        subcategory: subcategory || null,
        type,
        isRecurring: isRecurring || false,
        notes: notes ? encrypt(notes) : null,
      },
    }),
    prisma.account.update({
      where: { id: accountId },
      data: { balance: { increment: parsedAmount } },
    }),
  ]);

  res.status(201).json({ transaction: decryptTransaction(transaction) });
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const existing = await prisma.transaction.findFirst({
    where: { id: req.params.id, account: { userId: req.session.userId } },
  });
  if (!existing) { res.status(404).json({ error: 'Transaction not found' }); return; }

  const { date, description, amount, category, subcategory, type, isRecurring, notes } = req.body;

  // Validate type if provided
  if (type !== undefined && !(VALID_TYPES as readonly string[]).includes(type)) {
    res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
    return;
  }

  // Validate date if provided
  if (date !== undefined) {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      res.status(400).json({ error: 'Invalid date format' });
      return;
    }
  }

  const updateData: any = {
    ...(date !== undefined && { date: new Date(date) }),
    ...(description !== undefined && { description: encrypt(description) }),
    ...(amount !== undefined && { amount: parseFloat(amount) }),
    ...(category !== undefined && { category }),
    ...(subcategory !== undefined && { subcategory }),
    ...(type !== undefined && { type }),
    ...(isRecurring !== undefined && { isRecurring }),
    ...(notes !== undefined && { notes: notes ? encrypt(notes) : null }),
  };

  // If amount is changing, update balance atomically
  if (amount !== undefined && parseFloat(amount) !== existing.amount) {
    const diff = parseFloat(amount) - existing.amount;
    const [transaction] = await prisma.$transaction([
      prisma.transaction.update({ where: { id: req.params.id }, data: updateData }),
      prisma.account.update({
        where: { id: existing.accountId },
        data: { balance: { increment: diff } },
      }),
    ]);
    res.json({ transaction: decryptTransaction(transaction) });
  } else {
    const transaction = await prisma.transaction.update({ where: { id: req.params.id }, data: updateData });
    res.json({ transaction: decryptTransaction(transaction) });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const existing = await prisma.transaction.findFirst({
    where: { id: req.params.id, account: { userId: req.session.userId } },
  });
  if (!existing) { res.status(404).json({ error: 'Transaction not found' }); return; }

  // Atomic: delete transaction and revert balance in one DB transaction
  await prisma.$transaction([
    prisma.transaction.delete({ where: { id: req.params.id } }),
    prisma.account.update({
      where: { id: existing.accountId },
      data: { balance: { decrement: existing.amount } },
    }),
  ]);
  res.json({ message: 'Transaction deleted' });
});

export default router;

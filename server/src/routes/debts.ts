import { Router } from 'express';
import type { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.ts';
import { encrypt, decrypt } from '../services/encryption.ts';

const router = Router();
router.use(requireAuth);

function decryptDebt(d: any): any {
  const result = { ...d };
  if (result.name) { try { result.name = decrypt(result.name); } catch { /* legacy */ } }
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
  const debts = await prisma.debt.findMany({
    where: { account: { userId: req.session.userId } },
    include: { account: { select: { name: true, institution: true } } },
    orderBy: { interestRate: 'desc' },
  });
  res.json({ debts: debts.map(decryptDebt) });
});

router.post('/', [
  body('accountId').notEmpty(),
  body('name').trim().notEmpty(),
  body('originalBalance').isFloat({ min: 0 }),
  body('currentBalance').isFloat({ min: 0 }),
  body('interestRate').isFloat({ min: 0 }),
  body('minimumPayment').isFloat({ min: 0 }),
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  const prisma = (req as any).prisma;
  const { accountId, name, originalBalance, currentBalance, interestRate, minimumPayment, dueDate, startDate } = req.body;

  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: req.session.userId },
  });
  if (!account) { res.status(404).json({ error: 'Account not found' }); return; }

  const debt = await prisma.debt.create({
    data: {
      accountId, name: encrypt(name),
      originalBalance: parseFloat(originalBalance),
      currentBalance: parseFloat(currentBalance),
      interestRate: parseFloat(interestRate),
      minimumPayment: parseFloat(minimumPayment),
      dueDate: dueDate ? parseInt(dueDate) : null,
      startDate: startDate ? new Date(startDate) : new Date(),
    },
  });
  res.status(201).json({ debt: decryptDebt(debt) });
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const existing = await prisma.debt.findFirst({
    where: { id: req.params.id, account: { userId: req.session.userId } },
  });
  if (!existing) { res.status(404).json({ error: 'Debt not found' }); return; }

  const { name, currentBalance, interestRate, minimumPayment, dueDate } = req.body;

  // Validate dueDate — must be a calendar day 1–31
  if (dueDate !== undefined) {
    const day = parseInt(dueDate, 10);
    if (isNaN(day) || day < 1 || day > 31) {
      res.status(400).json({ error: 'dueDate must be a day of month between 1 and 31' });
      return;
    }
  }

  const debt = await prisma.debt.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name: encrypt(name) }),
      ...(currentBalance !== undefined && { currentBalance: parseFloat(currentBalance) }),
      ...(interestRate !== undefined && { interestRate: parseFloat(interestRate) }),
      ...(minimumPayment !== undefined && { minimumPayment: parseFloat(minimumPayment) }),
      ...(dueDate !== undefined && { dueDate: parseInt(dueDate, 10) }),
    },
  });
  res.json({ debt: decryptDebt(debt) });
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const existing = await prisma.debt.findFirst({
    where: { id: req.params.id, account: { userId: req.session.userId } },
  });
  if (!existing) { res.status(404).json({ error: 'Debt not found' }); return; }

  await prisma.debt.delete({ where: { id: req.params.id } });
  res.json({ message: 'Debt deleted' });
});

export default router;

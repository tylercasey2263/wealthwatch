import { Router } from 'express';
import type { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.ts';
import { encrypt, decrypt } from '../services/encryption.ts';

const router = Router();
router.use(requireAuth);

// Fields that are encrypted at rest
const ENCRYPTED_FIELDS = ['name', 'institution', 'accountNumber'] as const;

function decryptAccount(account: any): any {
  const result = { ...account };
  for (const field of ['name', 'institution'] as const) {
    if (result[field]) {
      try { result[field] = decrypt(result[field]); } catch { /* legacy unencrypted data */ }
    }
  }
  if (result.accountNumber) {
    try {
      const raw = decrypt(result.accountNumber);
      result.accountNumber = '****' + raw.slice(-4);
    } catch {
      result.accountNumber = result.accountNumber.length > 4
        ? '****' + result.accountNumber.slice(-4)
        : result.accountNumber;
    }
  }
  // Also decrypt transaction descriptions if included
  if (result.transactions) {
    result.transactions = result.transactions.map((t: any) => decryptTransaction(t));
  }
  return result;
}

function decryptTransaction(t: any): any {
  const result = { ...t };
  if (result.description) {
    try { result.description = decrypt(result.description); } catch { /* legacy */ }
  }
  if (result.notes) {
    try { result.notes = decrypt(result.notes); } catch { /* legacy */ }
  }
  return result;
}

function encryptField(value: string | null | undefined): string | null {
  if (!value) return null;
  try { return encrypt(value); } catch { return value; }
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const accounts = await prisma.account.findMany({
    where: { userId: req.session.userId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ accounts: accounts.map(decryptAccount) });
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const account = await prisma.account.findFirst({
    where: { id: req.params.id, userId: req.session.userId },
    include: { transactions: { take: 10, orderBy: { date: 'desc' } } },
  });
  if (!account) { res.status(404).json({ error: 'Account not found' }); return; }
  res.json({ account: decryptAccount(account) });
});

router.post('/', [
  body('name').trim().notEmpty(),
  body('institution').trim().notEmpty(),
  body('type').isIn(['bank', 'credit_card', 'loan', 'investment', 'income']),
  body('balance').isFloat(),
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  const prisma = (req as any).prisma;
  const { name, institution, type, subtype, balance, creditLimit, interestRate, minimumPayment, accountNumber } = req.body;

  const account = await prisma.account.create({
    data: {
      userId: req.session.userId!,
      name: encrypt(name),
      institution: encrypt(institution),
      type,
      subtype: subtype || null,
      balance: parseFloat(balance),
      creditLimit: creditLimit ? parseFloat(creditLimit) : null,
      interestRate: interestRate ? parseFloat(interestRate) : null,
      minimumPayment: minimumPayment ? parseFloat(minimumPayment) : null,
      accountNumber: encryptField(accountNumber),
    },
  });
  res.status(201).json({ account: decryptAccount(account) });
});

const VALID_ACCOUNT_TYPES = ['bank', 'credit_card', 'loan', 'investment', 'income'] as const;

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const existing = await prisma.account.findFirst({
    where: { id: req.params.id, userId: req.session.userId },
  });
  if (!existing) { res.status(404).json({ error: 'Account not found' }); return; }

  const { name, institution, type, subtype, balance, creditLimit, interestRate, minimumPayment, accountNumber, isActive } = req.body;

  // Validate type if provided
  if (type !== undefined && !(VALID_ACCOUNT_TYPES as readonly string[]).includes(type)) {
    res.status(400).json({ error: `type must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}` });
    return;
  }
  const account = await prisma.account.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name: encrypt(name) }),
      ...(institution !== undefined && { institution: encrypt(institution) }),
      ...(type !== undefined && { type }),
      ...(subtype !== undefined && { subtype }),
      ...(balance !== undefined && { balance: parseFloat(balance) }),
      ...(creditLimit !== undefined && { creditLimit: creditLimit ? parseFloat(creditLimit) : null }),
      ...(interestRate !== undefined && { interestRate: interestRate ? parseFloat(interestRate) : null }),
      ...(minimumPayment !== undefined && { minimumPayment: minimumPayment ? parseFloat(minimumPayment) : null }),
      ...(accountNumber !== undefined && { accountNumber: encryptField(accountNumber) }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  res.json({ account: decryptAccount(account) });
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const existing = await prisma.account.findFirst({
    where: { id: req.params.id, userId: req.session.userId },
  });
  if (!existing) { res.status(404).json({ error: 'Account not found' }); return; }

  await prisma.account.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ message: 'Account deleted' });
});

export default router;

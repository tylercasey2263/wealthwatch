import { Router } from 'express';
import type { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.ts';
import { encrypt, decrypt } from '../services/encryption.ts';

const router = Router();
router.use(requireAuth);

function decryptInvestment(inv: any): any {
  const result = { ...inv };
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
  const investments = await prisma.investment.findMany({
    where: { account: { userId: req.session.userId } },
    include: { account: { select: { name: true, institution: true } } },
    orderBy: { currentValue: 'desc' },
  });
  res.json({ investments: investments.map(decryptInvestment) });
});

router.post('/', [
  body('accountId').notEmpty(),
  body('name').trim().notEmpty(),
  body('currentValue').isFloat({ min: 0 }),
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  const prisma = (req as any).prisma;
  const { accountId, name, currentValue, costBasis, monthlyContribution, employerMatch, returnRate, allocations } = req.body;

  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: req.session.userId },
  });
  if (!account) { res.status(404).json({ error: 'Account not found' }); return; }

  if (allocations !== undefined && JSON.stringify(allocations).length > MAX_ALLOCATIONS_JSON) {
    res.status(400).json({ error: 'allocations payload too large' });
    return;
  }

  const investment = await prisma.investment.create({
    data: {
      accountId, name: encrypt(name),
      currentValue: parseFloat(currentValue),
      costBasis: costBasis ? parseFloat(costBasis) : null,
      monthlyContribution: monthlyContribution ? parseFloat(monthlyContribution) : 0,
      employerMatch: employerMatch ? parseFloat(employerMatch) : null,
      returnRate: returnRate ? parseFloat(returnRate) : null,
      allocations: allocations ? JSON.stringify(allocations) : null,
    },
  });
  res.status(201).json({ investment: decryptInvestment(investment) });
});

const MAX_ALLOCATIONS_JSON = 10_000; // 10KB

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const existing = await prisma.investment.findFirst({
    where: { id: req.params.id, account: { userId: req.session.userId } },
  });
  if (!existing) { res.status(404).json({ error: 'Investment not found' }); return; }

  const { name, currentValue, costBasis, monthlyContribution, employerMatch, returnRate, allocations } = req.body;

  // Validate allocations size before JSON serialization
  if (allocations !== undefined) {
    const allocStr = JSON.stringify(allocations);
    if (allocStr.length > MAX_ALLOCATIONS_JSON) {
      res.status(400).json({ error: 'allocations payload too large' });
      return;
    }
  }

  const investment = await prisma.investment.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name: encrypt(name) }),
      ...(currentValue !== undefined && { currentValue: parseFloat(currentValue) }),
      ...(costBasis !== undefined && { costBasis: parseFloat(costBasis) }),
      ...(monthlyContribution !== undefined && { monthlyContribution: parseFloat(monthlyContribution) }),
      ...(employerMatch !== undefined && { employerMatch: parseFloat(employerMatch) }),
      ...(returnRate !== undefined && { returnRate: parseFloat(returnRate) }),
      ...(allocations !== undefined && { allocations: JSON.stringify(allocations) }),
    },
  });
  res.json({ investment: decryptInvestment(investment) });
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const existing = await prisma.investment.findFirst({
    where: { id: req.params.id, account: { userId: req.session.userId } },
  });
  if (!existing) { res.status(404).json({ error: 'Investment not found' }); return; }

  await prisma.investment.delete({ where: { id: req.params.id } });
  res.json({ message: 'Investment deleted' });
});

export default router;

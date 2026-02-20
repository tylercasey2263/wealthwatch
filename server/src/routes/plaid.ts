import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.ts';
import { encrypt, decrypt } from '../services/encryption.ts';
import {
  isPlaidConfigured,
  createLinkToken,
  exchangePublicToken,
  getPlaidAccounts,
  getPlaidTransactions,
  removePlaidItem,
} from '../services/plaid.ts';

const router = Router();
router.use(requireAuth);

// GET /api/plaid/status — Check if Plaid is configured
router.get('/status', (_req: Request, res: Response): void => {
  res.json({
    configured: isPlaidConfigured(),
    environment: process.env.PLAID_ENV || 'sandbox',
  });
});

// POST /api/plaid/link-token — Get a Link token for Plaid Link
router.post('/link-token', async (req: Request, res: Response): Promise<void> => {
  if (!isPlaidConfigured()) {
    res.status(503).json({ error: 'Plaid integration is not configured' });
    return;
  }

  try {
    const result = await createLinkToken(req.session.userId!);
    res.json(result);
  } catch (err: any) {
    console.error('Plaid error:', err.message);
    res.status(500).json({ error: 'Bank integration error. Please try again.' });
  }
});

// POST /api/plaid/exchange — Exchange public token and create linked accounts
router.post('/exchange', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const { publicToken, institutionName } = req.body;

  if (!publicToken) { res.status(400).json({ error: 'publicToken is required' }); return; }

  try {
    // Exchange for access token
    const { accessToken, itemId } = await exchangePublicToken(publicToken);

    // Encrypt the access token before storing
    const encryptedToken = encrypt(accessToken);

    // Fetch accounts from Plaid
    const plaidAccounts = await getPlaidAccounts(accessToken);

    // Create accounts in our database
    const createdAccounts = [];
    for (const pa of plaidAccounts) {
      const account = await prisma.account.create({
        data: {
          userId: req.session.userId,
          name: encrypt(pa.name),
          institution: encrypt(institutionName || 'Connected Bank'),
          type: pa.type,
          subtype: pa.subtype,
          balance: pa.balance,
          accountNumber: pa.mask ? encrypt(pa.mask) : null,
          isActive: true,
        },
      });
      createdAccounts.push(account);
    }

    // Store the Plaid connection details (encrypted access token)
    // In a full implementation, you'd have a PlaidItem model
    // For now, store in the first account's metadata or a separate store

    res.json({
      success: true,
      accounts: createdAccounts,
      itemId,
      message: `Connected ${createdAccounts.length} accounts from ${institutionName || 'your bank'}`,
    });
  } catch (err: any) {
    console.error('Plaid error:', err.message);
    res.status(500).json({ error: 'Bank integration error. Please try again.' });
  }
});

// POST /api/plaid/sync — Sync transactions from a connected institution
router.post('/sync', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const { accessToken: encryptedToken, accountId, startDate, endDate } = req.body;

  if (!encryptedToken || !accountId) {
    res.status(400).json({ error: 'accessToken and accountId are required' });
    return;
  }

  // Verify account ownership
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: req.session.userId },
  });
  if (!account) { res.status(404).json({ error: 'Account not found' }); return; }

  try {
    const accessToken = decrypt(encryptedToken);

    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const end = endDate || now.toISOString().split('T')[0];

    const { transactions } = await getPlaidTransactions(accessToken, start!, end!);

    let imported = 0;
    let skipped = 0;

    for (const tx of transactions) {
      if (tx.pending) { skipped++; continue; }

      // Check for duplicate (by date + amount; description is encrypted so can't compare directly)
      const existing = await prisma.transaction.findFirst({
        where: {
          accountId,
          date: new Date(tx.date),
          amount: tx.amount,
        },
      });

      if (existing) { skipped++; continue; }

      await prisma.transaction.create({
        data: {
          accountId,
          date: new Date(tx.date),
          description: encrypt(tx.description),
          amount: tx.amount,
          category: tx.category,
          subcategory: tx.subcategory,
          type: tx.type,
          notes: encrypt(`Synced from Plaid${tx.merchantName ? ` (${tx.merchantName})` : ''}`),
        },
      });
      imported++;
    }

    // Update account balance
    const plaidAccounts = await getPlaidAccounts(accessToken);
    const matchedAccount = plaidAccounts.find((pa: any) =>
      pa.name === account.name || pa.mask === account.accountNumber
    );
    if (matchedAccount) {
      await prisma.account.update({
        where: { id: accountId },
        data: { balance: matchedAccount.balance },
      });
    }

    res.json({ imported, skipped, total: transactions.length });
  } catch (err: any) {
    console.error('Plaid error:', err.message);
    res.status(500).json({ error: 'Bank integration error. Please try again.' });
  }
});

// DELETE /api/plaid/disconnect — Disconnect a Plaid item
router.delete('/disconnect', async (req: Request, res: Response): Promise<void> => {
  const { accessToken: encryptedToken } = req.body;
  if (!encryptedToken) { res.status(400).json({ error: 'accessToken is required' }); return; }

  try {
    const accessToken = decrypt(encryptedToken);
    await removePlaidItem(accessToken);
    res.json({ message: 'Bank connection removed' });
  } catch (err: any) {
    console.error('Plaid error:', err.message);
    res.status(500).json({ error: 'Bank integration error. Please try again.' });
  }
});

export default router;

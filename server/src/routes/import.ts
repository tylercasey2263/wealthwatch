import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.ts';
import { parseCSV, mapCSVToTransactions } from '../providers/IFinancialProvider.ts';
import type { CSVMapping } from '../providers/IFinancialProvider.ts';
import { encrypt } from '../services/encryption.ts';

const router = Router();
router.use(requireAuth);

const MAX_CSV_ROWS = 5_000;
const MAX_CSV_BYTES = 2 * 1024 * 1024; // 2MB — tighter than global 5MB limit

// POST /api/import/csv - Import transactions from CSV data
router.post('/csv', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const { accountId, csvContent, mapping } = req.body as {
    accountId: string;
    csvContent: string;
    mapping: CSVMapping;
  };

  if (!accountId || !csvContent || !mapping) {
    res.status(400).json({ error: 'accountId, csvContent, and mapping are required' });
    return;
  }

  // Enforce a tighter size limit on CSV content
  if (typeof csvContent !== 'string' || Buffer.byteLength(csvContent, 'utf8') > MAX_CSV_BYTES) {
    res.status(400).json({ error: `CSV content must be ${MAX_CSV_BYTES / 1024 / 1024}MB or smaller` });
    return;
  }

  // Verify account belongs to user
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: req.session.userId },
  });
  if (!account) { res.status(404).json({ error: 'Account not found' }); return; }

  const rows = parseCSV(csvContent);
  if (rows.length < 2) { res.status(400).json({ error: 'CSV must have headers and at least one data row' }); return; }

  const headers = rows[0]!;
  const dataRows = rows.slice(1);

  // Enforce row limit before processing
  if (dataRows.length > MAX_CSV_ROWS) {
    res.status(400).json({ error: `CSV must have ${MAX_CSV_ROWS} or fewer data rows` });
    return;
  }

  let transactions;
  try {
    transactions = mapCSVToTransactions(dataRows, headers, mapping);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
    return;
  }

  // Build validated, encrypted transaction records
  const validTransactions: any[] = [];
  let skipped = 0;

  for (const t of transactions) {
    let parsedDate: Date;
    try { parsedDate = new Date(t.date); }
    catch { skipped++; continue; }

    if (isNaN(parsedDate.getTime())) { skipped++; continue; }
    if (!t.description) { skipped++; continue; }

    validTransactions.push({
      accountId,
      date: parsedDate,
      description: encrypt(t.description),
      amount: t.amount,
      category: t.category || 'Uncategorized',
      type: t.type,
      notes: encrypt('Imported from CSV'),
    });
  }

  if (validTransactions.length > 0) {
    // Batch insert all valid transactions in one query (avoids N+1 DB pressure)
    await prisma.transaction.createMany({ data: validTransactions });

    // Update account balance atomically
    const balanceDelta = validTransactions.reduce((sum, t) => sum + t.amount, 0);
    await prisma.account.update({
      where: { id: accountId },
      data: { balance: { increment: balanceDelta } },
    });
  }

  const imported = validTransactions.length;
  skipped += transactions.length - validTransactions.length;

  res.json({ imported, skipped, total: transactions.length });
});

// POST /api/import/csv-preview - Preview CSV data before importing
router.post('/csv-preview', async (req: Request, res: Response): Promise<void> => {
  const { csvContent } = req.body;

  if (!csvContent) { res.status(400).json({ error: 'csvContent is required' }); return; }

  // Enforce size limit on preview as well
  if (typeof csvContent !== 'string' || Buffer.byteLength(csvContent, 'utf8') > MAX_CSV_BYTES) {
    res.status(400).json({ error: `CSV content must be ${MAX_CSV_BYTES / 1024 / 1024}MB or smaller` });
    return;
  }

  const rows = parseCSV(csvContent);
  if (rows.length < 2) { res.status(400).json({ error: 'CSV must have headers and at least one data row' }); return; }

  const headers = rows[0]!;
  const preview = rows.slice(1, 6); // First 5 data rows only

  res.json({ headers, preview, totalRows: rows.length - 1 });
});

// GET /api/import/providers - List available provider adapters
router.get('/providers', async (_req: Request, res: Response): Promise<void> => {
  const providers = [
    { id: 'usaa', name: 'USAA', type: 'bank', method: 'csv', status: 'available' },
    { id: 'navyfed', name: 'Navy Federal', type: 'bank', method: 'csv', status: 'available' },
    { id: 'capitalone', name: 'Capital One', type: 'credit_card', method: 'csv', status: 'available' },
    { id: 'citibank', name: 'Citibank', type: 'credit_card', method: 'csv', status: 'available' },
    { id: 'bridgecrest', name: 'Bridgecrest', type: 'loan', method: 'manual', status: 'available' },
    { id: 'guideline', name: 'Guideline', type: 'investment', method: 'csv', status: 'available' },
    { id: 'tsp', name: 'TSP', type: 'investment', method: 'csv', status: 'available' },
    { id: 'va', name: 'VA', type: 'income', method: 'manual', status: 'available' },
    { id: 'plaid', name: 'Plaid (auto-sync)', type: 'bank', method: 'api', status: 'coming_soon' },
  ];
  res.json({ providers });
});

export default router;

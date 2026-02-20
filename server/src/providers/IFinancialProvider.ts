export interface ConnectionResult {
  success: boolean;
  accountId?: string;
  error?: string;
}

export interface SyncResult {
  transactionsAdded: number;
  transactionsUpdated: number;
  balanceUpdated: boolean;
  error?: string;
}

export interface ProviderTransaction {
  date: string;
  description: string;
  amount: number;
  category?: string;
  type: 'income' | 'expense' | 'transfer';
}

export interface ProviderBalance {
  current: number;
  available?: number;
  limit?: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface IFinancialProvider {
  id: string;
  name: string;
  type: 'bank' | 'credit_card' | 'loan' | 'investment' | 'income';
  supportedInstitutions: string[];

  getTransactions(range: DateRange): Promise<ProviderTransaction[]>;
  getBalances(): Promise<ProviderBalance>;
}

// CSV Import provider — works for any institution via file upload
export interface CSVMapping {
  dateColumn: string;
  descriptionColumn: string;
  amountColumn: string;
  categoryColumn?: string;
  dateFormat?: string; // e.g. 'MM/DD/YYYY', 'YYYY-MM-DD'
}

export function parseCSV(content: string): string[][] {
  const lines = content.trim().split('\n');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
      else { current += char; }
    }
    result.push(current.trim());
    return result;
  });
}

export function mapCSVToTransactions(
  rows: string[][],
  headers: string[],
  mapping: CSVMapping
): ProviderTransaction[] {
  const dateIdx = headers.indexOf(mapping.dateColumn);
  const descIdx = headers.indexOf(mapping.descriptionColumn);
  const amountIdx = headers.indexOf(mapping.amountColumn);
  const catIdx = mapping.categoryColumn ? headers.indexOf(mapping.categoryColumn) : -1;

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    throw new Error('Required columns not found in CSV');
  }

  return rows.map(row => {
    const amount = parseFloat(row[amountIdx]!.replace(/[$,]/g, ''));
    return {
      date: row[dateIdx]!,
      description: row[descIdx]!,
      amount,
      category: catIdx >= 0 ? row[catIdx] : undefined,
      type: amount >= 0 ? 'income' as const : 'expense' as const,
    };
  }).filter(t => !isNaN(t.amount) && t.description);
}

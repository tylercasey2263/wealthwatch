/**
 * Plaid API Integration Service
 *
 * Handles communication with the Plaid API for automatic bank syncing.
 * Requires PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV in environment.
 *
 * Flow:
 * 1. Client requests a Link Token → user opens Plaid Link
 * 2. User authenticates with their bank → Plaid returns a public_token
 * 3. Server exchanges public_token for access_token (stored encrypted)
 * 4. Server uses access_token to fetch transactions on demand or via webhook
 */

const PLAID_ENVS: Record<string, string> = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com',
};

function getPlaidConfig() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV || 'sandbox';

  if (!clientId || !secret) {
    return null;
  }

  return {
    clientId,
    secret,
    baseUrl: PLAID_ENVS[env] || PLAID_ENVS.sandbox,
  };
}

export function isPlaidConfigured(): boolean {
  return getPlaidConfig() !== null;
}

async function plaidRequest(endpoint: string, body: Record<string, any>) {
  const config = getPlaidConfig();
  if (!config) throw new Error('Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET.');

  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.clientId,
      secret: config.secret,
      ...body,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_message || `Plaid API error: ${response.status}`);
  }
  return data;
}

/**
 * Create a Plaid Link token for the client-side Plaid Link widget.
 */
export async function createLinkToken(userId: string): Promise<{ linkToken: string }> {
  const data = await plaidRequest('/link/token/create', {
    user: { client_user_id: userId },
    client_name: 'FinanceCmd',
    products: ['transactions'],
    country_codes: ['US'],
    language: 'en',
  });

  return { linkToken: data.link_token };
}

/**
 * Exchange a Plaid public_token (from Link) for a permanent access_token.
 */
export async function exchangePublicToken(publicToken: string): Promise<{
  accessToken: string;
  itemId: string;
}> {
  const data = await plaidRequest('/item/token/exchange', {
    public_token: publicToken,
  });

  return {
    accessToken: data.access_token,
    itemId: data.item_id,
  };
}

/**
 * Fetch accounts from a connected Plaid item.
 */
export async function getPlaidAccounts(accessToken: string) {
  const data = await plaidRequest('/accounts/get', {
    access_token: accessToken,
  });

  return data.accounts.map((acc: any) => ({
    plaidAccountId: acc.account_id,
    name: acc.name || acc.official_name,
    type: mapPlaidAccountType(acc.type),
    subtype: acc.subtype,
    balance: acc.balances.current || 0,
    availableBalance: acc.balances.available,
    mask: acc.mask, // Last 4 digits
  }));
}

/**
 * Fetch transactions from a connected Plaid item.
 */
export async function getPlaidTransactions(
  accessToken: string,
  startDate: string,
  endDate: string
) {
  const data = await plaidRequest('/transactions/get', {
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
    options: { count: 500, offset: 0 },
  });

  return {
    transactions: data.transactions.map((tx: any) => ({
      plaidTransactionId: tx.transaction_id,
      plaidAccountId: tx.account_id,
      date: tx.date,
      description: tx.name || tx.merchant_name || 'Unknown',
      amount: -tx.amount, // Plaid uses negative for credits
      category: tx.personal_finance_category?.primary || tx.category?.[0] || 'Uncategorized',
      subcategory: tx.personal_finance_category?.detailed || tx.category?.[1] || null,
      type: tx.amount > 0 ? 'expense' : 'income',
      merchantName: tx.merchant_name,
      pending: tx.pending,
    })),
    totalTransactions: data.total_transactions,
  };
}

/**
 * Remove a Plaid item (disconnect a bank).
 */
export async function removePlaidItem(accessToken: string): Promise<void> {
  await plaidRequest('/item/remove', {
    access_token: accessToken,
  });
}

function mapPlaidAccountType(plaidType: string): string {
  const typeMap: Record<string, string> = {
    depository: 'bank',
    credit: 'credit_card',
    loan: 'loan',
    investment: 'investment',
  };
  return typeMap[plaidType] || 'bank';
}

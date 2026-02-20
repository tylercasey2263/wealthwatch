# API Reference

All endpoints are prefixed with `/api`. The server runs on `https://localhost:3443` in development.

## Authentication

Most endpoints require an authenticated session. Two methods are supported:

**Session auth (browser):**
Include the session cookie (`fincmd.sid`) and `X-CSRF-Token` header with every state-changing request. The CSRF token is returned in the `X-CSRF-Token` response header on every request and must be captured and re-sent.

**API key auth (scripts):**
Include the key in the `X-API-Key` header. No CSRF token required.

```bash
curl https://localhost:3443/api/accounts \
  -H "X-API-Key: fincmd_your_key_here"
```

---

## Auth

### POST /api/auth/register

Create a new account.

**Body:**
```json
{
  "email": "you@example.com",
  "password": "Str0ng!Pass",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

**Response `201`:**
```json
{ "user": { "id": "...", "email": "...", "firstName": "...", "lastName": "...", "createdAt": "..." } }
```

**Password requirements:** 8–128 chars, uppercase, lowercase, digit, special character, no common patterns.

---

### POST /api/auth/login

**Body:**
```json
{ "email": "you@example.com", "password": "Str0ng!Pass" }
```

**Response `200`:**
```json
{ "user": { "id": "...", "email": "...", "firstName": "...", "lastName": "..." } }
```

**Rate limit:** 10 attempts per 15 minutes per IP+email. After 5 wrong passwords, account locked for 15 minutes.

---

### POST /api/auth/logout

No body. Destroys the session.

**Response `200`:**
```json
{ "message": "Logged out successfully" }
```

---

### GET /api/auth/me

Returns the current user. Requires auth.

**Response `200`:**
```json
{ "user": { "id": "...", "email": "...", "firstName": "...", "lastName": "...", "createdAt": "..." } }
```

---

### POST /api/auth/change-password

Requires auth.

**Body:**
```json
{ "currentPassword": "old", "newPassword": "NewStr0ng!Pass" }
```

**Response `200`:**
```json
{ "message": "Password changed successfully" }
```

Session is rotated after a successful password change.

---

## Accounts

All account routes require auth. `name` and `institution` are stored encrypted; `accountNumber` is masked on read.

### GET /api/accounts

Returns all active accounts for the authenticated user.

**Response `200`:**
```json
{
  "accounts": [
    {
      "id": "...",
      "name": "USAA Checking",
      "institution": "USAA",
      "type": "bank",
      "subtype": "checking",
      "balance": 4250.00,
      "creditLimit": null,
      "accountNumber": "****1234",
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### GET /api/accounts/:id

Returns one account with the 10 most recent transactions.

---

### POST /api/accounts

**Body:**
```json
{
  "name": "USAA Checking",
  "institution": "USAA",
  "type": "bank",
  "subtype": "checking",
  "balance": 4250.00,
  "accountNumber": "123456781234"
}
```

`type` must be one of: `bank`, `credit_card`, `loan`, `investment`, `income`.

**Response `201`:** `{ "account": { ... } }`

---

### PUT /api/accounts/:id

Partial update — include only the fields you want to change. Same field rules as POST.

**Response `200`:** `{ "account": { ... } }`

---

### DELETE /api/accounts/:id

Soft-deletes the account (`isActive: false`). Transactions are preserved.

**Response `200`:** `{ "message": "Account deleted" }`

---

## Transactions

### GET /api/transactions

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `accountId` | string | Filter by account |
| `category` | string | Filter by category |
| `type` | `income\|expense\|transfer` | Filter by type |
| `startDate` | ISO 8601 | Range start |
| `endDate` | ISO 8601 | Range end |
| `limit` | integer | Default 50, max 200 |
| `offset` | integer | Pagination offset |

**Response `200`:**
```json
{ "transactions": [...], "total": 142, "limit": 50, "offset": 0 }
```

---

### POST /api/transactions

**Body:**
```json
{
  "accountId": "...",
  "date": "2025-01-15",
  "description": "Grocery store",
  "amount": -87.43,
  "type": "expense",
  "category": "Food",
  "subcategory": "Groceries",
  "isRecurring": false,
  "notes": "Weekly shop"
}
```

**Note:** Amount is signed — negative for expenses, positive for income. The account balance is updated atomically.

**Response `201`:** `{ "transaction": { ... } }`

---

### PUT /api/transactions/:id

Partial update. If `amount` changes, the account balance is adjusted atomically.

---

### DELETE /api/transactions/:id

Hard delete. Account balance is decremented by the transaction amount.

---

## Debts

### GET /api/debts

Returns all debts linked to accounts owned by the user.

### POST /api/debts

**Body:**
```json
{
  "accountId": "...",
  "name": "Car loan",
  "originalBalance": 25000,
  "currentBalance": 18432.50,
  "interestRate": 4.99,
  "minimumPayment": 450,
  "dueDate": 15,
  "startDate": "2022-06-01"
}
```

`dueDate` is day-of-month (1–31).

### PUT /api/debts/:id / DELETE /api/debts/:id

Standard partial update / delete.

---

## Investments

### GET /api/investments

### POST /api/investments

**Body:**
```json
{
  "accountId": "...",
  "name": "Guideline 401k",
  "currentValue": 42000,
  "costBasis": 35000,
  "monthlyContribution": 500,
  "employerMatch": 250,
  "returnRate": 7.5,
  "allocations": { "stocks": 90, "bonds": 10 }
}
```

`allocations` can be any JSON object up to 10KB.

### PUT /api/investments/:id / DELETE /api/investments/:id

---

## Budgets

### GET /api/budgets
### POST /api/budgets

**Body:**
```json
{ "category": "Food", "amount": 600, "period": "monthly" }
```

`period` must be: `daily`, `weekly`, `monthly`, or `yearly`.

### PUT /api/budgets/:id / DELETE /api/budgets/:id

---

## Dashboard

### GET /api/dashboard/summary

Returns net worth, monthly income/expenses, savings rate, debt/investment totals, account counts.

---

### GET /api/dashboard/spending-by-category

**Query:** `startDate`, `endDate` (ISO 8601)

**Response:**
```json
{ "categories": [{ "category": "Food", "amount": 523.40 }, ...] }
```

---

### GET /api/dashboard/monthly-trend

**Query:** `months` (integer, 1–60, default 6)

**Response:**
```json
{ "trend": [{ "month": "2025-01", "income": 5200, "expenses": 3100, "savings": 2100 }, ...] }
```

---

### GET /api/dashboard/health-score

Returns a 0–100 financial health score with component breakdown and recommendations.

---

### GET /api/dashboard/cash-flow-forecast

**Query:** `days` (integer, 1–365, default 90)

**Response:**
```json
{
  "forecast": [{ "date": "2025-01-16", "projectedBalance": 4312.57, "income": 0, "expenses": 87.43 }, ...],
  "currentBalance": 4250.00,
  "lowBalanceAlert": false,
  "minimumProjectedBalance": 3214.00,
  "recurringIncome": [...],
  "recurringExpenses": [...]
}
```

---

## Projections

### POST /api/projections/debt-payoff

**Body:**
```json
{
  "strategy": "avalanche",
  "extraMonthly": 200,
  "customDebts": null
}
```

`strategy`: `avalanche` (highest rate first) or `snowball` (lowest balance first).
`extraMonthly`: cap $100,000. Leave `customDebts` null to use debts from the database.

**Custom debts format:**
```json
"customDebts": [
  { "id": "1", "name": "Visa", "balance": 5000, "rate": 19.99, "minimum": 100 }
]
```

---

### POST /api/projections/debt-compare

Runs both strategies and returns a comparison. Same body as debt-payoff minus `strategy` and `customDebts`.

---

### POST /api/projections/investment-growth

**Body:**
```json
{
  "years": 30,
  "annualReturn": 7,
  "initialBalance": 42000,
  "monthlyContribution": 500
}
```

- `years`: 1–50
- `annualReturn`: −50 to 100 (percent)
- `initialBalance`: 0 to $1,000,000,000
- `monthlyContribution`: 0 to $1,000,000

Omit `initialBalance` or `monthlyContribution` to use the sum of your investment accounts.

Returns deterministic projection + Monte Carlo bands (conservative / moderate / aggressive).

---

### POST /api/projections/scenario-save

**Body:**
```json
{
  "name": "Aggressive payoff",
  "description": "Optional notes",
  "type": "debt-payoff",
  "parameters": { "strategy": "avalanche", "extra": 500 },
  "results": { "months": 38, "totalInterest": 1240 }
}
```

`type` must be: `debt-payoff`, `debt-compare`, or `investment-growth`.
`name` max 200 chars. `parameters` and `results` max 50KB JSON each.

---

### GET /api/projections/scenarios

Returns all saved scenarios for the user, with `parameters` and `results` decrypted and parsed.

---

## Import

### POST /api/import/csv-preview

Preview the first 5 rows of a CSV before importing.

**Body:**
```json
{ "csvContent": "Date,Description,Amount\n2025-01-15,Grocery store,-87.43" }
```

**Response:**
```json
{ "headers": ["Date", "Description", "Amount"], "preview": [[...], ...], "totalRows": 142 }
```

Max 2MB CSV content.

---

### POST /api/import/csv

Import transactions from a CSV.

**Body:**
```json
{
  "accountId": "...",
  "csvContent": "Date,Description,Amount\n...",
  "mapping": {
    "dateColumn": "Date",
    "descriptionColumn": "Description",
    "amountColumn": "Amount",
    "categoryColumn": "Category"
  }
}
```

Max 5,000 rows, 2MB. Transactions are batch-inserted. Account balance is updated after import.

**Response:**
```json
{ "imported": 138, "skipped": 4, "total": 142 }
```

---

### GET /api/import/providers

Returns the list of supported CSV import providers with their column format details.

---

## API Keys

### GET /api/api-keys

Returns all API keys (never exposes the raw key).

**Response:**
```json
{
  "apiKeys": [
    {
      "id": "...",
      "name": "Home script",
      "keyPrefix": "fincmd_abc1...",
      "permissions": "read",
      "lastUsedAt": "2025-01-15T10:30:00Z",
      "expiresAt": null,
      "isActive": true,
      "createdAt": "..."
    }
  ]
}
```

---

### POST /api/api-keys

**Body:**
```json
{ "name": "Home script", "permissions": "read", "expiresInDays": 90 }
```

`permissions`: `read`, `write`, or `read,write`.
`expiresInDays`: 1–3650 (optional, omit for no expiry).

**Response `201`:**
```json
{
  "apiKey": { "id": "...", "name": "...", ... },
  "rawKey": "fincmd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "warning": "Save this key now. It cannot be retrieved again."
}
```

---

### DELETE /api/api-keys/:id

Revokes (deactivates) the key.

---

### PUT /api/api-keys/:id

Update name, permissions, or isActive status.

---

## Admin / Security

### GET /api/admin/audit-log

**Query:** `limit` (max 100), `offset`, `action` (substring, max 200 chars), `resource` (max 100 chars)

Returns state-changing operations for the current user.

---

### GET /api/admin/login-history

Returns the 50 most recent login attempts for the current user's email, including failures.

---

### GET /api/admin/security-status

Returns:
- Active API key count
- Recent failed login attempts (last 24h)
- Recent audit actions (last 24h)
- Whether encryption is enabled
- Security recommendations

---

## Health Check

### GET /api/health

No auth required. Returns server status.

```json
{ "status": "ok", "timestamp": "2025-01-15T10:30:00.000Z" }
```

---

## Error Responses

All errors follow this format:

```json
{ "error": "Human-readable error message" }
```

Validation errors:

```json
{ "errors": [{ "msg": "...", "path": "fieldName", "location": "body" }] }
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request / validation failure |
| `401` | Not authenticated |
| `403` | CSRF token mismatch or forbidden |
| `404` | Resource not found (or doesn't belong to you) |
| `409` | Conflict (e.g., email already registered) |
| `423` | Account locked |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

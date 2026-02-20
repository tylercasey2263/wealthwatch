# Security Architecture

This document describes the security model, what protections are in place, and how to harden the application for production.

---

## Threat Model

FinanceCmd is a **single-user, self-hosted** application. The primary threats are:

| Threat | Mitigation |
|--------|-----------|
| Unauthorized access via the web UI | Session auth, bcrypt, account lockout, CSRF |
| Credential stuffing / brute force | Rate limiting (IP+email), lockout after 5 failures |
| Session hijacking | Secure/httpOnly cookies, session fixation prevention |
| Cross-site request forgery | Synchronizer token pattern (CSRF tokens) |
| Cross-site scripting (XSS) | CSP headers, input sanitization, httpOnly cookies |
| SQL injection | Prisma ORM with parameterized queries throughout |
| Data exposure if DB file is stolen | AES-256-GCM encryption on all PII fields |
| API scraping / DoS | Rate limiting, request size limits, computation caps |
| Unauthorized API key use | HMAC-keyed hashing; keys scoped to read/write |

---

## Encryption at Rest

### Algorithm

**AES-256-GCM** — authenticated encryption. Every encrypted value includes an authentication tag that detects tampering.

### Encrypted fields

| Model | Fields |
|-------|--------|
| Account | `name`, `institution`, `accountNumber` |
| Transaction | `description`, `notes` |
| Debt | `name` |
| Investment | `name` |
| Scenario | `name`, `description`, `parameters`, `results` |

### Storage format

```
iv:authTag:ciphertext
```
All components are hex-encoded. The IV (16 bytes) is randomly generated per encryption call, ensuring identical plaintexts produce different ciphertexts.

### Account numbers

Account numbers are encrypted on write. On read, they are decrypted and then masked to `****XXXX` (last 4 digits only) before being returned to the client. The full number is never sent over the wire.

### Key configuration

```bash
# Generate a strong key (do this once per deployment)
openssl rand -hex 32

# Set in server/.env
ENCRYPTION_KEY=<64 hex characters>
```

The server derives the AES key directly from the hex string. If the value is not valid hex or is not 64 characters, it falls back to PBKDF2 derivation (100,000 iterations, SHA-256).

> **Warning:** Changing `ENCRYPTION_KEY` after data is stored will make all encrypted data unreadable. Back up both the key and the database before rotating keys.

---

## Authentication

### Password hashing

- **bcrypt** with cost factor **12** (~300ms per hash, making offline attacks expensive)
- Password policy enforced on register and change-password:
  - 8–128 characters
  - At least one uppercase, lowercase, digit, and special character
  - Rejects common patterns (password, 12345678, qwerty, etc.)

### Account lockout

After **5 consecutive failed login attempts** for a given email address, the account is locked for **15 minutes**. The lockout is tracked in-memory per server process (restarts clear it).

### Session management

| Property | Value |
|----------|-------|
| Cookie name | `fincmd.sid` |
| httpOnly | Yes — inaccessible to JavaScript |
| sameSite | `strict` — never sent cross-origin |
| secure | Yes in production, No in development |
| Max age | 8 hours |

**Session fixation prevention:** On login, registration, and password change, `req.session.regenerate()` is called to issue a new session ID before setting `userId`. This prevents an attacker who pre-established a session from inheriting the authenticated session.

**Session rotation on password change:** Changing your password rotates the session, invalidating the previous session ID.

---

## CSRF Protection

Uses the **Synchronizer Token Pattern**:

1. A random 32-byte token is generated and stored in the session.
2. Every response includes the token in the `X-CSRF-Token` header.
3. The client JavaScript reads and stores this token from every response.
4. All state-changing requests (`POST`, `PUT`, `DELETE`) must include the token in the `X-CSRF-Token` request header.
5. The server compares the header value against the session value. Mismatch → 403.

**Exemptions:**
- `GET`, `HEAD`, `OPTIONS` (safe methods)
- `POST /api/auth/login` and `/api/auth/register` (no session exists yet)
- Requests with a valid `X-API-Key` header (API key auth takes precedence)

---

## Rate Limiting

Three tiers of rate limiting, all in-memory (per-process):

| Tier | Key | Limit |
|------|-----|-------|
| Global | IP address | 200 requests / minute |
| Auth endpoints | IP + normalized email | 10 requests / 15 minutes |
| API keys | API key value | Configurable |

**IP resolution:** `req.ip` is used. Set `TRUST_PROXY=1` in `.env` if running behind a reverse proxy so Express correctly reads the real client IP from `X-Forwarded-For`. Without this, all traffic appears to come from the proxy's IP and rate limiting is ineffective.

> Note: In-memory rate limiting resets on process restart and does not share state across multiple server instances. For production behind a load balancer, replace with a Redis-backed limiter.

---

## Input Validation & Sanitization

### Sanitization (runs on every request before auth)

- Removes null bytes and control characters from all string fields
- Strips `<script>...</script>` blocks using a linear `indexOf` scan (no ReDoS risk)
- Removes inline event handler attributes (`onXxx="..."`) using a bounded regex
- Recurses into nested objects and arrays up to **10 levels deep**

### Validation (per-route)

- `express-validator` enforces types and required fields on create endpoints
- PUT endpoints validate all optional fields before update (type allowlists, integer ranges, string lengths)
- Key limits:

| Endpoint | Limit |
|----------|-------|
| Transaction list | Max 200 per page |
| CSV import | Max 5,000 rows, 2MB |
| Debt payoff extra payment | Max $100,000/month |
| Investment growth annual return | −50% to +100% |
| Investment initial balance | Max $1 billion |
| Scenario parameters/results JSON | Max 50KB each |
| API key expiry | 1–3,650 days |
| Budget period | `daily`, `weekly`, `monthly`, `yearly` |
| Debt due date | Integer 1–31 |

---

## Security Headers

Set by Helmet + custom middleware:

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | `default-src 'self'`; limited script/style inline for Vite dev |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (HTTPS mode only) |
| `Cache-Control` | `no-store, no-cache, must-revalidate, proxy-revalidate` |

---

## API Keys

API keys are an alternative authentication method for programmatic access.

### Generation

- Format: `fincmd_<43 base64url characters>` (256 bits of entropy)
- The raw key is shown **once** at creation time and never stored
- Only the **HMAC-SHA256** hash (keyed with `ENCRYPTION_KEY`) is stored

### Permissions

| Permission | HTTP methods allowed |
|------------|---------------------|
| `read` | `GET`, `HEAD` |
| `write` | All methods |
| `read,write` | All methods |

API keys bypass CSRF checks (the key itself serves as proof of authorization).

### Lifecycle

- Keys can have an optional expiry date (1–3,650 days)
- Keys can be revoked at any time from the Settings page
- Last-used timestamp is recorded on every authenticated request

---

## Audit Logging

All state-changing operations (`POST`, `PUT`, `DELETE`) are logged to the `AuditLog` table with:

- User ID, action, resource type, resource ID
- Request ID (for correlation with server logs)
- IP address, user agent (truncated to 500 chars)
- HTTP status code of the response
- Sanitized request body (passwords and CSV content stripped)

Login attempts (success and failure) are logged separately to the `LoginAttempt` table with the failure reason.

Both logs are accessible from the Settings → Security page in the UI.

---

## HTTPS

### Development

Run `bun run scripts/generate-certs.ts` to generate a self-signed certificate. The Vite dev server proxies `/api` requests to `https://localhost:3443` with `secure: false` to accept the self-signed cert.

### Production

Replace `server/certs/server.key` and `server/certs/server.cert` with real certificates from Let's Encrypt or your CA. The certificate files are gitignored.

---

## Production Hardening Checklist

Before exposing this application to the network:

- [ ] Generate strong secrets:
  - `SESSION_SECRET`: `openssl rand -hex 64`
  - `ENCRYPTION_KEY`: `openssl rand -hex 32`
- [ ] Set `NODE_ENV=production` (enables secure session cookies)
- [ ] Set `ENABLE_HTTPS=true` and use real TLS certificates
- [ ] Set `TRUST_PROXY=1` if behind nginx/Caddy (for correct IP-based rate limiting)
- [ ] Restrict the database file permissions: `chmod 600 server/prisma/dev.db`
- [ ] Store `.env` outside the repository root or use a secrets manager
- [ ] Change the demo user password or delete the demo account after seeding
- [ ] Review `CORS_ORIGIN` — set it to your actual domain, not `http://localhost:5173`
- [ ] Set up regular database backups (the entire state is in `server/prisma/dev.db`)
- [ ] Consider placing behind a reverse proxy (nginx, Caddy) for:
  - Additional TLS termination
  - HTTP/2 support
  - DDoS protection at the network layer

---

## Known Limitations

**In-memory rate limiting and lockout**
The rate limiter and account lockout tracker store state in memory. State is lost on server restart and is not shared across multiple processes. For a single-user self-hosted app this is acceptable; for multi-instance production, replace with Redis.

**Plaid integration is incomplete**
The Plaid access token is not stored in the database, making the `/sync` endpoint non-functional. The token is correctly discarded after account creation. This is a known design gap documented in the code — implementing it properly requires a `PlaidItem` database model.

**SQLite write serialization**
SQLite serializes writes at the file level. The application uses `prisma.$transaction()` for all multi-step balance updates to ensure atomicity. Under very high concurrent write load, consider migrating to PostgreSQL.

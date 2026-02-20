import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  // If key is hex-encoded (64 chars = 32 bytes), decode it
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex');
  }
  // Otherwise derive a key from the passphrase using PBKDF2
  return crypto.pbkdf2Sync(key, 'financecmd-salt', 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a combined string: iv:authTag:ciphertext (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a ciphertext string encrypted with encrypt().
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0]!, 'hex');
  const authTag = Buffer.from(parts[1]!, 'hex');
  const ciphertext = parts[2]!;

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash a value for deterministic lookups (e.g., searching by account number).
 * Uses HMAC-SHA256 so it's consistent but not reversible.
 */
export function hmacHash(value: string): string {
  const key = getEncryptionKey();
  return crypto.createHmac('sha256', key).update(value).digest('hex');
}

/**
 * Generate a cryptographically secure API key.
 */
export function generateApiKey(): string {
  const prefix = 'fincmd';
  const key = crypto.randomBytes(32).toString('base64url');
  return `${prefix}_${key}`;
}

/**
 * Hash an API key for storage using HMAC-SHA256 keyed with the encryption key.
 * HMAC prevents brute-forcing hashes even with a full DB dump, since the key is required.
 * We never store raw API keys.
 */
export function hashApiKey(apiKey: string): string {
  const key = getEncryptionKey();
  return crypto.createHmac('sha256', key).update(apiKey).digest('hex');
}

/**
 * Generate a random encryption key (for initial setup).
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Encrypt sensitive fields on an object, returning a new object with encrypted values.
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] != null && typeof result[field] === 'string' && result[field] !== '') {
      (result as any)[field] = encrypt(String(result[field]));
    }
  }
  return result;
}

/**
 * Decrypt sensitive fields on an object, returning a new object with decrypted values.
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] != null && typeof result[field] === 'string' && result[field].includes(':')) {
      try {
        (result as any)[field] = decrypt(String(result[field]));
      } catch {
        // Field might not be encrypted (legacy data), leave as-is
      }
    }
  }
  return result;
}

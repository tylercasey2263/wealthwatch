/**
 * Generate self-signed TLS certificates for local HTTPS development.
 * Run: bun run scripts/generate-certs.ts
 *
 * This creates:
 *   certs/server.key  — Private key
 *   certs/server.cert — Self-signed certificate (valid 365 days)
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const certsDir = path.join(import.meta.dir, '..', 'certs');

if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

const keyPath = path.join(certsDir, 'server.key');
const certPath = path.join(certsDir, 'server.cert');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('Certificates already exist at:');
  console.log(`  Key:  ${keyPath}`);
  console.log(`  Cert: ${certPath}`);
  console.log('Delete them and re-run to regenerate.');
  process.exit(0);
}

console.log('Generating self-signed TLS certificate...');

try {
  execSync(
    `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" ` +
    `-days 365 -nodes -subj "/CN=localhost/O=FinanceCmd/C=US" ` +
    `-addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`,
    { stdio: 'pipe' }
  );

  console.log('Certificates generated successfully!');
  console.log(`  Key:  ${keyPath}`);
  console.log(`  Cert: ${certPath}`);
  console.log('\nNote: Your browser will show a security warning for self-signed certs.');
  console.log('You can bypass it by clicking "Advanced" → "Proceed to localhost".');
} catch (err: any) {
  // Fallback: use Bun's crypto to generate if openssl is not available
  console.log('openssl not found, using built-in crypto fallback...');

  const { generateKeyPairSync, createSign, createHash, randomBytes } = await import('crypto');

  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  // Create a minimal self-signed X.509 certificate
  // For a proper cert we need ASN.1 encoding — use a simpler approach
  // Write the private key
  fs.writeFileSync(keyPath, privateKey);

  // For the cert, we'll create a basic one using openssl-compatible DER encoding
  // Since we can't easily do full X.509 without openssl, create a script the user can run
  fs.writeFileSync(certPath, publicKey); // Temporary - just the public key

  console.log('Generated key pair. For a proper certificate, install openssl and re-run.');
  console.log(`  Key:  ${keyPath}`);
  console.log(`  Cert: ${certPath} (public key only - need openssl for full cert)`);
}

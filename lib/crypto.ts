import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Hashes a plain-text password using Node.js native scrypt algorithm.
 * Output format: scrypt$salt$hash
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

/**
 * Verifies a password against a stored value. Supports both scrypt hashes
 * and plain-text passwords for seamless backward compatibility.
 */
export function verifyPassword(password: string, storedValue: string): boolean {
  if (!storedValue.startsWith('scrypt$')) {
    // Return comparison directly for legacy plain-text password
    return password === storedValue;
  }

  try {
    const parts = storedValue.split('$');
    if (parts.length !== 3) return false;
    
    const [, salt, hash] = parts;
    const verifyHash = scryptSync(password, salt, 64);
    const storedHashBuffer = Buffer.from(hash, 'hex');
    
    return timingSafeEqual(storedHashBuffer, verifyHash);
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

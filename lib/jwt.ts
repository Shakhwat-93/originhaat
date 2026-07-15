const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-originhaat-key-123456';

export interface AdminSessionPayload {
  id: string;
  username: string;
  role: string;
  permissions: string[];
  exp?: number;
}

// Convert string to ArrayBuffer
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// Helper to base64url encode an ArrayBuffer
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Helper to decode a base64url string to string
function base64UrlToString(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return textDecoder.decode(bytes);
}

// Get the HMAC key
async function getHmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Generates a cryptographically signed session token (JWT format) using Web Crypto API.
 */
export async function generateToken(payload: AdminSessionPayload, expiresInMs: number = 24 * 60 * 60 * 1000): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  const bodyPayload: AdminSessionPayload = {
    ...payload,
    exp: Date.now() + expiresInMs
  };
  const body = btoa(JSON.stringify(bodyPayload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  const key = await getHmacKey(JWT_SECRET);
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    textEncoder.encode(`${header}.${body}`)
  );
  
  const signature = arrayBufferToBase64Url(signatureBuffer);
  return `${header}.${body}.${signature}`;
}

/**
 * Verifies a signed session token using Web Crypto API.
 */
export async function verifyToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, body, signature] = parts;
    
    const key = await getHmacKey(JWT_SECRET);
    
    // Reconstruct base64 signature to verify
    let signatureBase64 = signature.replace(/-/g, '+').replace(/_/g, '/');
    while (signatureBase64.length % 4) {
      signatureBase64 += '=';
    }
    const signatureBinary = atob(signatureBase64);
    const signatureBytes = new Uint8Array(signatureBinary.length);
    for (let i = 0; i < signatureBinary.length; i++) {
      signatureBytes[i] = signatureBinary.charCodeAt(i);
    }
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      textEncoder.encode(`${header}.${body}`)
    );
    
    if (!isValid) return null;
    
    const payload: AdminSessionPayload = JSON.parse(base64UrlToString(body));
    
    // Check expiration
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    
    return payload;
  } catch (e) {
    return null;
  }
}

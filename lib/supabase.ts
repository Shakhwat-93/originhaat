import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const isServer = typeof window === 'undefined';

// Server-side Node.js uses plain HTTP to prevent SSL/TLS handshake issues with self-signed domains.
// Client-side browser uses the Next.js API route proxy to avoid HTTPS Mixed Content / SSL errors.
const supabaseUrl = isServer
  ? (rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl)
  : `${window.location.origin}/api/supabase-proxy`;

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Dummy WebSocket implementation to prevent connection attempts and console errors in the browser.
class DummyWebSocket {
  binaryType = 'blob';
  bufferedAmount = 0;
  extensions = '';
  protocol = '';
  readyState = 3; // CLOSED
  url = '';
  onclose = null;
  onerror = null;
  onmessage = null;
  onopen = null;

  constructor() {}
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return false; }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    WebSocket: isServer ? undefined : (DummyWebSocket as any),
  } as any
});



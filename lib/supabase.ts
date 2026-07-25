import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const isServer = typeof window === 'undefined';

// Server-side Node.js uses plain HTTP to prevent SSL/TLS handshake issues with self-signed domains.
// Client-side browser uses the Next.js API route proxy to avoid HTTPS Mixed Content / SSL errors.
const supabaseUrl = isServer
  ? (rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl)
  : `${window.location.origin}/api/supabase-proxy`;

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Custom WebSocket proxy to forward local Next.js proxy socket endpoints to the real Supabase socket server.
// Since Next.js API route handlers don't proxy WebSockets, we redirect the browser's connection target directly.
class ProxiedWebSocket extends (typeof window !== 'undefined' ? window.WebSocket : Object) {
  constructor(url: string, protocols?: string | string[]) {
    if (url.includes('/api/supabase-proxy/realtime/v1/websocket')) {
      const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
      
      // Use ws:// instead of wss:// if loading the page over plain http (localhost) to avoid self-signed SSL errors
      const isLocalHttp = typeof window !== 'undefined' && window.location.protocol === 'http:';
      const wsProtocol = isLocalHttp ? 'ws://' : (rawSupabaseUrl.startsWith('https://') ? 'wss://' : 'ws://');
      
      const wsHost = rawSupabaseUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}${wsHost}/realtime/v1/websocket${url.split('/websocket')[1] || ''}`;
      
      console.log('[Realtime WebSocket Proxy] Redirecting connection to Supabase host:', wsUrl);
      super(wsUrl, protocols);
    } else {
      super(url, protocols);
    }
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    WebSocket: isServer ? undefined : (ProxiedWebSocket as any),
  } as any
});



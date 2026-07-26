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
// Since Next.js API route handlers don't proxy WebSockets, we hijack the global window.WebSocket class.
if (typeof window !== 'undefined' && window.WebSocket) {
  const OriginalWebSocket = window.WebSocket;
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  class DummyWebSocket {
    url: string;
    readyState: number = 0; // CONNECTING
    onopen: any = null;
    onerror: any = null;
    onclose: any = null;
    onmessage: any = null;
    private listeners: Record<string, Function[]> = {};

    constructor(url: string, protocols?: string | string[]) {
      this.url = url;
      // Trigger connection failure after 2 seconds silently to prevent spamming
      setTimeout(() => {
        this.readyState = 3; // CLOSED
        const errEvent = { type: 'error', target: this, currentTarget: this };
        const closeEvent = { type: 'close', target: this, currentTarget: this, code: 1006, reason: 'Silently blocked on production secure origin', wasClean: false };
        
        if (this.onerror) {
          try { this.onerror(errEvent); } catch (e) {}
        }
        this.trigger('error', errEvent);
        
        if (this.onclose) {
          try { this.onclose(closeEvent); } catch (e) {}
        }
        this.trigger('close', closeEvent);
      }, 2000);
    }

    send(data: any) {}
    close(code?: number, reason?: string) {
      this.readyState = 3;
    }

    addEventListener(type: string, callback: any) {
      if (!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push(callback);
    }

    removeEventListener(type: string, callback: any) {
      if (!this.listeners[type]) return;
      this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
    }

    private trigger(type: string, event: any) {
      if (this.listeners[type]) {
        this.listeners[type].forEach(cb => {
          try { cb(event); } catch (e) {}
        });
      }
    }
  }

  class ProxiedWebSocket extends OriginalWebSocket {
    constructor(url: string, protocols?: string | string[]) {
      if (url.includes('/api/supabase-proxy/realtime/v1/websocket')) {
        const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
        const isLocalHttp = window.location.protocol === 'http:';
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

  window.WebSocket = (isLocalhost ? ProxiedWebSocket : DummyWebSocket) as any;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);



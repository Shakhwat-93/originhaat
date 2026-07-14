import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function writeAuditLog(username: string, action: string, details: string, ipAddress?: string) {
  try {
    await supabase.from('oh_audit_logs').insert({
      username: username || 'system',
      action,
      details,
      ip_address: ipAddress || 'unknown'
    });
  } catch (err) {
    console.error('Audit log write error:', err);
  }
}

import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export interface SteadfastSettings {
  steadfast_api_key: string | null;
  steadfast_secret_key: string | null;
}

const BASE_URL = 'https://portal.packzy.com/api/v1';

export async function getSteadfastSettings(): Promise<SteadfastSettings | null> {
  const { data, error } = await supabase
    .from('oh_settings')
    .select('steadfast_api_key,steadfast_secret_key')
    .eq('id', 1)
    .single();

  if (error || !data) return null;
  return data as SteadfastSettings;
}

export async function getSteadfastBalance(): Promise<number | null> {
  const settings = await getSteadfastSettings();
  if (!settings?.steadfast_api_key || !settings?.steadfast_secret_key) {
    throw new Error('Steadfast credentials not configured.');
  }

  const res = await fetch(`${BASE_URL}/get_balance`, {
    method: 'GET',
    headers: {
      'Api-Key': settings.steadfast_api_key,
      'Secret-Key': settings.steadfast_secret_key,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Steadfast API error: HTTP ${res.status}`);
  }

  const data = await res.json();
  if (data.status === 200) {
    return data.current_balance;
  }
  return null;
}

export async function getSteadfastOrderStatus(type: 'cid' | 'invoice' | 'tracking', value: string): Promise<string | null> {
  const settings = await getSteadfastSettings();
  if (!settings?.steadfast_api_key || !settings?.steadfast_secret_key) {
    throw new Error('Steadfast credentials not configured.');
  }

  let path = '';
  if (type === 'cid') path = `/status_by_cid/${value}`;
  else if (type === 'invoice') path = `/status_by_invoice/${value}`;
  else if (type === 'tracking') path = `/status_by_trackingcode/${value}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      'Api-Key': settings.steadfast_api_key,
      'Secret-Key': settings.steadfast_secret_key,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Steadfast API error: HTTP ${res.status}`);
  }

  const data = await res.json();
  if (data.status === 200) {
    return data.delivery_status;
  }
  return null;
}

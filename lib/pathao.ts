/**
 * lib/pathao.ts
 * Shared utility for Pathao Courier Merchant API
 * Handles token management (issue / auto-refresh)
 */

import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export interface PathaoSettings {
  pathao_environment: 'sandbox' | 'production';
  pathao_base_url: string;
  pathao_client_id: string;
  pathao_client_secret: string;
  pathao_username: string;
  pathao_password: string;
  pathao_store_id: number | null;
  pathao_access_token: string | null;
  pathao_refresh_token: string | null;
  pathao_token_expires_at: string | null;
}

export interface PathaoTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

/**
 * Load Pathao settings from oh_settings row id=1
 */
export async function getPathaoSettings(): Promise<PathaoSettings | null> {
  const { data, error } = await supabase
    .from('oh_settings')
    .select(
      'pathao_environment,pathao_base_url,pathao_client_id,pathao_client_secret,pathao_username,pathao_password,pathao_store_id,pathao_access_token,pathao_refresh_token,pathao_token_expires_at'
    )
    .eq('id', 1)
    .single();

  if (error || !data) return null;
  return data as PathaoSettings;
}

/**
 * Save updated token fields back to oh_settings
 */
export async function savePathaoTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  await supabase
    .from('oh_settings')
    .update({
      pathao_access_token: accessToken,
      pathao_refresh_token: refreshToken,
      pathao_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);
}

/**
 * Get a valid Pathao access token.
 * - If stored token is still valid (> 5 min left), use it.
 * - If expired but refresh token exists, refresh it.
 * - Otherwise, issue fresh with username/password.
 */
export async function getValidPathaoToken(): Promise<{ token: string; baseUrl: string } | null> {
  const settings = await getPathaoSettings();
  if (!settings) return null;

  const {
    pathao_base_url: baseUrl,
    pathao_client_id: clientId,
    pathao_client_secret: clientSecret,
    pathao_username: username,
    pathao_password: password,
    pathao_access_token: storedToken,
    pathao_refresh_token: refreshToken,
    pathao_token_expires_at: expiresAt,
  } = settings;

  if (!clientId || !clientSecret) return null;

  // Check if stored token is still valid (with 5 min buffer)
  const isTokenValid =
    storedToken &&
    expiresAt &&
    new Date(expiresAt).getTime() - Date.now() > 5 * 60 * 1000;

  if (isTokenValid) {
    return { token: storedToken!, baseUrl };
  }

  // Try refresh token first
  if (refreshToken) {
    try {
      const res = await fetch(`${baseUrl}/aladdin/api/v1/issue-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (res.ok) {
        const data: PathaoTokenResponse = await res.json();
        await savePathaoTokens(data.access_token, data.refresh_token, data.expires_in);
        return { token: data.access_token, baseUrl };
      }
    } catch (_) {
      // Fall through to password grant
    }
  }

  // Issue fresh token with username/password
  if (!username || !password) return null;

  const res = await fetch(`${baseUrl}/aladdin/api/v1/issue-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'password',
      username,
      password,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Token issue failed: HTTP ${res.status}`);
  }

  const data: PathaoTokenResponse = await res.json();
  await savePathaoTokens(data.access_token, data.refresh_token, data.expires_in);
  return { token: data.access_token, baseUrl };
}

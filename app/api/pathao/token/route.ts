import { NextRequest, NextResponse } from 'next/server';
import { getValidPathaoToken, getPathaoSettings, savePathaoTokens } from '@/lib/pathao';
import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

/**
 * POST /api/pathao/token
 * Issue or refresh a Pathao access token using stored credentials.
 * Body: { force?: boolean } - if true, always re-issue with password grant
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const force = body?.force === true;

    const settings = await getPathaoSettings();
    if (!settings) {
      return NextResponse.json({ error: 'Pathao settings not found' }, { status: 404 });
    }

    const {
      pathao_base_url: baseUrl,
      pathao_client_id: clientId,
      pathao_client_secret: clientSecret,
      pathao_username: username,
      pathao_password: password,
    } = settings;

    if (!clientId || !clientSecret || !username || !password) {
      return NextResponse.json(
        { error: 'Pathao credentials not configured. Please fill in all credential fields in Settings.' },
        { status: 400 }
      );
    }

    if (!force) {
      // Use smart token management (auto-refresh if needed)
      const result = await getValidPathaoToken();
      if (result) {
        return NextResponse.json({
          success: true,
          message: 'Token is valid',
          base_url: result.baseUrl,
        });
      }
    }

    // Force fresh token with password grant
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

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || 'Failed to issue token from Pathao' },
        { status: res.status }
      );
    }

    await savePathaoTokens(data.access_token, data.refresh_token, data.expires_in);

    return NextResponse.json({
      success: true,
      message: 'Token issued successfully',
      expires_in: data.expires_in,
    });
  } catch (err: any) {
    console.error('[Pathao Token]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getValidPathaoToken } from '@/lib/pathao';

/**
 * GET /api/pathao/stores
 * Fetch merchant store list from Pathao.
 * Used to populate the Store ID dropdown in Settings.
 */
export async function GET() {
  try {
    const auth = await getValidPathaoToken();
    if (!auth) {
      return NextResponse.json(
        { error: 'No valid Pathao token. Please configure credentials and test connection first.' },
        { status: 401 }
      );
    }

    const res = await fetch(`${auth.baseUrl}/aladdin/api/v1/stores`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || 'Failed to fetch stores from Pathao' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      stores: data?.data?.data || [],
    });
  } catch (err: any) {
    console.error('[Pathao Stores]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

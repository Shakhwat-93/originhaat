import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/jwt';
import { writeAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

async function checkAdminAuth(request: NextRequest): Promise<{ authorized: boolean; username?: string }> {
  const adminKey = request.headers.get('x-admin-key');
  if (adminKey && (adminKey === process.env.ADMIN_PASSWORD || adminKey === process.env.NEXT_PUBLIC_ADMIN_KEY)) {
    return { authorized: true, username: 'admin' };
  }
  const sessionCookie = request.cookies.get('admin_session');
  if (sessionCookie?.value) {
    const payload = await verifyToken(sessionCookie.value);
    if (payload) {
      return { authorized: true, username: payload.username };
    }
  }
  return { authorized: false };
}

// PUT /api/top-selling/reorder
export async function PUT(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items } = body; // Array of { id: string, sort_order: number }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 });
    }

    // Update each item in parallel
    const updatePromises = items.map((item: { id: string; sort_order: number }) =>
      supabase
        .from('oh_top_selling_products')
        .update({
          sort_order: Number(item.sort_order),
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)
    );

    const results = await Promise.all(updatePromises);
    const hasError = results.some((r) => r.error);

    if (hasError) {
      return NextResponse.json({ error: 'Failed to update order for some items' }, { status: 500 });
    }

    await writeAuditLog(
      auth.username || 'admin',
      'reorder_top_selling_products',
      `Reordered ${items.length} top selling products`
    );

    return NextResponse.json({ success: true, message: 'Ordering updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Reorder failed' }, { status: 500 });
  }
}

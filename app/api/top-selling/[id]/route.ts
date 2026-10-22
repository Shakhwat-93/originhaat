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

// GET /api/top-selling/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('oh_top_selling_products')
      .select('*, product:oh_products (*)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}

// PUT /api/top-selling/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.badge_text !== undefined) {
      updatePayload.badge_text = body.badge_text ? String(body.badge_text).trim().toUpperCase() : null;
    }
    if (body.is_active !== undefined) {
      updatePayload.is_active = Boolean(body.is_active);
    }
    if (body.sort_order !== undefined) {
      updatePayload.sort_order = Number(body.sort_order);
    }

    const { data, error } = await supabase
      .from('oh_top_selling_products')
      .update(updatePayload)
      .eq('id', id)
      .select('*, product:oh_products (*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await writeAuditLog(
      auth.username || 'admin',
      'update_top_selling_product',
      `Updated top selling item ${id}: ${JSON.stringify(updatePayload)}`
    );

    return NextResponse.json({ success: true, item: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 });
  }
}

// DELETE /api/top-selling/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch existing item for audit info
    const { data: existing } = await supabase
      .from('oh_top_selling_products')
      .select('id, product_id, product:oh_products(name_bn, name_en)')
      .eq('id', id)
      .single();

    // Delete ONLY from oh_top_selling_products, never touches oh_products
    const { error } = await supabase
      .from('oh_top_selling_products')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const prodName = (existing?.product as any)?.name_bn || (existing?.product as any)?.name_en || id;
    await writeAuditLog(
      auth.username || 'admin',
      'remove_top_selling_product',
      `Removed product "${prodName}" from Top Selling carousel (ID: ${id})`
    );

    return NextResponse.json({ success: true, message: 'Item removed from Top Selling carousel' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 });
  }
}

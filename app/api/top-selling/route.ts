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

// GET /api/top-selling
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('all') === 'true';

    let query = supabase
      .from('oh_top_selling_products')
      .select(`
        id,
        product_id,
        sort_order,
        is_active,
        badge_text,
        created_at,
        updated_at,
        product:oh_products (
          id,
          name_bn,
          name_en,
          display_name_lang,
          slug,
          price,
          original_price,
          stock,
          images,
          is_active,
          code
        )
      `)
      .order('sort_order', { ascending: true });

    if (!includeAll) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching top selling items:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('Top selling GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch items' }, { status: 500 });
  }
}

// POST /api/top-selling
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { product_id, badge_text, is_active } = body;

    if (!product_id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Check if product exists in catalog
    const { data: prod, error: prodErr } = await supabase
      .from('oh_products')
      .select('id, name_bn, name_en')
      .eq('id', product_id)
      .single();

    if (prodErr || !prod) {
      return NextResponse.json({ error: 'Product not found in catalog' }, { status: 404 });
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('oh_top_selling_products')
      .select('id')
      .eq('product_id', product_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'This product is already in the Top Selling list' }, { status: 400 });
    }

    // Get current maximum sort_order
    const { data: maxOrderData } = await supabase
      .from('oh_top_selling_products')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSortOrder = (maxOrderData && maxOrderData.length > 0 && maxOrderData[0].sort_order !== null)
      ? maxOrderData[0].sort_order + 1
      : 1;

    const payload = {
      product_id,
      badge_text: badge_text ? String(badge_text).trim().toUpperCase() : 'BEST SELLER',
      sort_order: typeof body.sort_order === 'number' ? body.sort_order : nextSortOrder,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('oh_top_selling_products')
      .insert(payload)
      .select(`
        id,
        product_id,
        sort_order,
        is_active,
        badge_text,
        created_at,
        updated_at,
        product:oh_products (*)
      `)
      .single();

    if (error) {
      console.error('Error inserting top selling item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await writeAuditLog(
      auth.username || 'admin',
      'add_top_selling_product',
      `Added product "${prod.name_bn || prod.name_en}" to Top Selling carousel with badge "${payload.badge_text}"`
    );

    return NextResponse.json({ success: true, item: data }, { status: 201 });
  } catch (err: any) {
    console.error('Top selling POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

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

export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { product_ids, brand_id } = body;

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: 'Please select at least one product' }, { status: 400 });
    }

    let brandName = 'Unassigned';
    if (brand_id) {
      const { data: brand, error: brandErr } = await supabase
        .from('oh_brands')
        .select('id, name')
        .eq('id', brand_id)
        .single();

      if (brandErr || !brand) {
        return NextResponse.json({ error: 'Specified brand does not exist' }, { status: 400 });
      }
      brandName = brand.name;
    }

    // Perform bulk update without touching any other fields
    const { error: updateErr } = await supabase
      .from('oh_products')
      .update({
        brand_id: brand_id || null,
        updated_at: new Date().toISOString()
      })
      .in('id', product_ids);

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update products: ' + updateErr.message }, { status: 500 });
    }

    await writeAuditLog(
      auth.username || 'admin',
      'bulk_assign_brand',
      `Assigned ${product_ids.length} products to brand "${brandName}" (ID: ${brand_id || 'none'})`
    );

    return NextResponse.json({
      success: true,
      updated_count: product_ids.length,
      brand_name: brandName,
      message: `Successfully assigned ${product_ids.length} product(s) to "${brandName}".`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

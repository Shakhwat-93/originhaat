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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data: brand, error } = await supabase
      .from('oh_brands')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    return NextResponse.json(brand);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const {
      name,
      slug,
      logo_url,
      description,
      is_active,
      show_on_homepage,
      sort_order,
      seo_title,
      seo_description,
    } = body;

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
      }
      updatePayload.name = name.trim();
    }

    if (slug !== undefined) {
      const cleanSlug = slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      if (!cleanSlug) {
        return NextResponse.json({ error: 'A valid slug is required' }, { status: 400 });
      }

      // Check if another brand has this slug
      const { data: existing } = await supabase
        .from('oh_brands')
        .select('id')
        .eq('slug', cleanSlug)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: 'Another brand already uses this slug' }, { status: 409 });
      }
      updatePayload.slug = cleanSlug;
    }

    if (logo_url !== undefined) {
      if (!logo_url || typeof logo_url !== 'string' || !logo_url.trim()) {
        return NextResponse.json({ error: 'Brand logo is required' }, { status: 400 });
      }
      updatePayload.logo_url = logo_url.trim();
    }

    if (description !== undefined) updatePayload.description = description ? description.trim() : null;
    if (is_active !== undefined) updatePayload.is_active = Boolean(is_active);
    if (show_on_homepage !== undefined) updatePayload.show_on_homepage = Boolean(show_on_homepage);
    if (sort_order !== undefined) updatePayload.sort_order = Number(sort_order) || 0;
    if (seo_title !== undefined) updatePayload.seo_title = seo_title ? seo_title.trim() : null;
    if (seo_description !== undefined) updatePayload.seo_description = seo_description ? seo_description.trim() : null;

    const { data, error } = await supabase
      .from('oh_brands')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await writeAuditLog(
      auth.username || 'admin',
      'update_brand',
      `Updated brand ID: ${id} (${data.name})`
    );

    return NextResponse.json({ success: true, brand: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'check'; // 'check' | 'unassign_and_delete' | 'reassign_and_delete'
    const reassignToId = searchParams.get('reassign_to');

    // 1. Check if brand exists
    const { data: brand, error: brandErr } = await supabase
      .from('oh_brands')
      .select('id, name')
      .eq('id', id)
      .single();

    if (brandErr || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // 2. Count assigned products
    const { count, error: countErr } = await supabase
      .from('oh_products')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', id);

    const productCount = count || 0;

    if (productCount > 0 && action === 'check') {
      return NextResponse.json({
        can_delete: false,
        product_count: productCount,
        message: `This brand is assigned to ${productCount} product(s). Please choose to unassign them or reassign to another brand before deleting.`
      }, { status: 400 });
    }

    // 3. Handle reassignment or unassignment
    if (productCount > 0) {
      if (action === 'reassign_and_delete') {
        if (!reassignToId || reassignToId === id) {
          return NextResponse.json({ error: 'Please specify a valid alternative brand for reassignment' }, { status: 400 });
        }
        // Verify target brand exists
        const { data: targetBrand } = await supabase
          .from('oh_brands')
          .select('id')
          .eq('id', reassignToId)
          .single();

        if (!targetBrand) {
          return NextResponse.json({ error: 'Target brand for reassignment was not found' }, { status: 400 });
        }

        // Reassign products to target brand
        const { error: reassignErr } = await supabase
          .from('oh_products')
          .update({ brand_id: reassignToId })
          .eq('brand_id', id);

        if (reassignErr) {
          return NextResponse.json({ error: 'Failed to reassign products: ' + reassignErr.message }, { status: 500 });
        }
      } else {
        // Default safe action: unassign products (set brand_id = null)
        const { error: unassignErr } = await supabase
          .from('oh_products')
          .update({ brand_id: null })
          .eq('brand_id', id);

        if (unassignErr) {
          return NextResponse.json({ error: 'Failed to unassign products: ' + unassignErr.message }, { status: 500 });
        }
      }
    }

    // 4. Delete the brand
    const { error: deleteErr } = await supabase
      .from('oh_brands')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      return NextResponse.json({ error: 'Failed to delete brand: ' + deleteErr.message }, { status: 500 });
    }

    await writeAuditLog(
      auth.username || 'admin',
      'delete_brand',
      `Deleted brand "${brand.name}" (ID: ${id}). Action on ${productCount} products: ${action}`
    );

    return NextResponse.json({
      success: true,
      message: `Brand "${brand.name}" was successfully deleted.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

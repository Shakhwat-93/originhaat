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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('all') === 'true';
    const includeCounts = searchParams.get('include_counts') === 'true';
    const homepageOnly = searchParams.get('homepage_only') === 'true';

    let query = supabase.from('oh_brands').select('*');

    if (!includeAll) {
      query = query.eq('is_active', true);
    }

    if (homepageOnly) {
      query = query.eq('show_on_homepage', true);
    }

    query = query.order('sort_order', { ascending: true }).order('name', { ascending: true });

    const { data: brands, error } = await query;
    if (error) {
      console.error('Error fetching brands:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (includeCounts && brands && brands.length > 0) {
      // Fetch product counts per brand
      const { data: prods, error: countErr } = await supabase
        .from('oh_products')
        .select('brand_id');

      const countMap: Record<string, number> = {};
      if (!countErr && prods) {
        for (const p of prods) {
          if (p.brand_id) {
            countMap[p.brand_id] = (countMap[p.brand_id] || 0) + 1;
          }
        }
      }

      const brandsWithCount = brands.map(b => ({
        ...b,
        product_count: countMap[b.id] || 0,
      }));

      return NextResponse.json(brandsWithCount);
    }

    return NextResponse.json(brands || []);
  } catch (err: any) {
    console.error('Brands GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      slug,
      logo_url,
      description,
      is_active = true,
      show_on_homepage = true,
      sort_order = 0,
      seo_title,
      seo_description,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
    }

    if (!logo_url || typeof logo_url !== 'string' || !logo_url.trim()) {
      return NextResponse.json({ error: 'Brand logo is required' }, { status: 400 });
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!cleanSlug) {
      return NextResponse.json({ error: 'A valid slug is required' }, { status: 400 });
    }

    // Check for duplicate slug
    const { data: existing } = await supabase
      .from('oh_brands')
      .select('id')
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'A brand with this slug already exists. Please choose a unique slug.' }, { status: 409 });
    }

    const brandPayload = {
      name: name.trim(),
      slug: cleanSlug,
      logo_url: logo_url.trim(),
      description: description ? description.trim() : null,
      is_active: Boolean(is_active),
      show_on_homepage: Boolean(show_on_homepage),
      sort_order: Number.isInteger(Number(sort_order)) ? Number(sort_order) : 0,
      seo_title: seo_title ? seo_title.trim() : null,
      seo_description: seo_description ? seo_description.trim() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('oh_brands')
      .insert(brandPayload)
      .select()
      .single();

    if (error) {
      console.error('Error inserting brand:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await writeAuditLog(
      auth.username || 'admin',
      'create_brand',
      `Created brand "${data.name}" (${data.slug})`
    );

    return NextResponse.json({ success: true, brand: data }, { status: 201 });
  } catch (err: any) {
    console.error('Brands POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

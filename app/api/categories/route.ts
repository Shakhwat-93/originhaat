import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

export async function GET() {
  try {
    const { data: cats, error: catErr } = await supabase
      .from('oh_categories')
      .select('id, name_bn, name_en, slug, icon, image_url, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (catErr) throw catErr;

    const { data: productsData } = await supabase
      .from('oh_products')
      .select('category_id')
      .eq('is_active', true);

    const countsMap: Record<string, number> = {};
    if (productsData) {
      productsData.forEach((p: any) => {
        if (p.category_id) {
          countsMap[p.category_id] = (countsMap[p.category_id] || 0) + 1;
        }
      });
    }

    const formattedCats = (cats || []).map((cat) => ({
      id: cat.id,
      name_bn: cat.name_bn,
      name_en: cat.name_en,
      slug: cat.slug,
      icon: cat.icon || cat.image_url,
      product_count: countsMap[cat.id] || 0,
    }));

    return NextResponse.json(formattedCats, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err: any) {
    console.error('[API Categories Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch categories' }, { status: 500 });
  }
}

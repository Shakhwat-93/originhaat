import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';

// Server-side backend calls use plain HTTP to avoid SSL/TLS handshake failures in Node.js.
const supabaseUrl = rawUrl.startsWith('https://')
  ? rawUrl.replace('https://', 'http://')
  : rawUrl;

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Create a server-side client
export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  }
});

export async function getSettings() {
  const { data, error } = await supabaseServer
    .from('oh_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Error fetching settings:', error);
    // Return defaults if not available
    return {
      site_name: 'Origin Haat',
      whatsapp_number: '8801700000000',
      delivery_charge_inside: 60,
      delivery_charge_outside: 120,
      free_delivery_min_amount: 2000,
      announcement_text: '',
      is_announcement_active: false,
      is_live_chat_active: true,
      whatsapp_default_message: 'হ্যালো! আমি Origin Haat থেকে সাহায্য চাই।',
      default_faqs: [],
    };
  }
  return {
    ...data,
    is_live_chat_active: data?.is_live_chat_active ?? true,
    whatsapp_default_message: data?.whatsapp_default_message || 'হ্যালো! আমি Origin Haat থেকে সাহায্য চাই।',
    free_delivery_min_amount: data.free_delivery_min_order ?? 2000,
    default_faqs: data?.default_faqs || [],
  };
}

export async function getBanners() {
  const { data, error } = await supabaseServer
    .from('oh_banners')
    .select('*')
    .eq('is_active', true)
    .neq('subtitle', 'featured_bottom')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching banners:', error);
    return [];
  }
  return data || [];
}

export async function getFeaturedBottomBanner() {
  const { data, error } = await supabaseServer
    .from('oh_banners')
    .select('*')
    .eq('subtitle', 'featured_bottom')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching featured bottom banner:', error);
    return null;
  }
  return data || null;
}

export async function getCategories() {
  const { data, error } = await supabaseServer
    .from('oh_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data || [];
}

export async function getFeaturedProducts() {
  const { data, error } = await supabaseServer
    .from('oh_products')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    // Fallback: If sort_order column is missing in remote DB, order by created_at
    const { data: fallbackData } = await supabaseServer
      .from('oh_products')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false });

    return fallbackData || [];
  }
  return data || [];
}

export async function getAllProducts() {
  const { data, error } = await supabaseServer
    .from('oh_products')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    // Fallback: If sort_order column is missing in remote DB, order by created_at
    const { data: fallbackData } = await supabaseServer
      .from('oh_products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    return fallbackData || [];
  }
  return data || [];
}

export async function getProductBySlug(slug: string) {
  const decodedSlug = decodeURIComponent(slug);
  // Fetch product with category name
  const { data: product, error } = await supabaseServer
    .from('oh_products')
    .select('*, oh_categories(name_bn)')
    .eq('slug', decodedSlug)
    .eq('is_active', true)
    .single();

  if (error || !product) {
    console.error('Error fetching product by slug:', error);
    return null;
  }

  // Fetch FAQs
  const { data: faqs } = await supabaseServer
    .from('oh_faqs')
    .select('question, answer')
    .eq('product_id', product.id)
    .order('sort_order', { ascending: true });

  // Fetch Reviews
  const { data: reviews } = await supabaseServer
    .from('oh_reviews')
    .select('*')
    .eq('product_id', product.id)
    .eq('is_active', true)
    .order('date', { ascending: false });

  return {
    ...product,
    category: (product.oh_categories as any)?.name_bn || 'স্মার্ট গ্যাজেটস',
    faqs: faqs || [],
    reviews: reviews || [],
  };
}

export async function getProductSlugs() {
  const { data, error } = await supabaseServer
    .from('oh_products')
    .select('slug')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching slugs:', error);
    return [];
  }
  return data?.map(p => ({ slug: p.slug })) || [];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  description?: string | null;
  is_active: boolean;
  show_on_homepage: boolean;
  sort_order: number;
  seo_title?: string | null;
  seo_description?: string | null;
  created_at?: string;
  updated_at?: string;
  product_count?: number;
}

export async function getBrands(): Promise<Brand[]> {
  const { data, error } = await supabaseServer
    .from('oh_brands')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching brands:', error);
    return [];
  }
  return data || [];
}

export async function getHomepageBrands(): Promise<Brand[]> {
  const { data, error } = await supabaseServer
    .from('oh_brands')
    .select('*')
    .eq('is_active', true)
    .eq('show_on_homepage', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching homepage brands:', error);
    return [];
  }
  return data || [];
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const decodedSlug = decodeURIComponent(slug);
  const { data, error } = await supabaseServer
    .from('oh_brands')
    .select('*')
    .eq('slug', decodedSlug)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }
  return data;
}

export async function getBrandSlugs(): Promise<{ slug: string }[]> {
  const { data, error } = await supabaseServer
    .from('oh_brands')
    .select('slug')
    .eq('is_active', true);

  if (error || !data) {
    return [];
  }
  return data.map(b => ({ slug: b.slug }));
}

export async function getProductsByBrandId(brandId: string) {
  const { data, error } = await supabaseServer
    .from('oh_products')
    .select('*, oh_categories(name_bn)')
    .eq('brand_id', brandId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products by brand id:', error);
    return [];
  }
  return data || [];
}

export interface TopSellingItem {
  id: string;
  product_id: string;
  sort_order: number;
  is_active: boolean;
  badge_text?: string | null;
  created_at?: string;
  updated_at?: string;
  product: any;
}

export async function getTopSellingProducts(): Promise<TopSellingItem[]> {
  try {
    const { data, error } = await supabaseServer
      .from('oh_top_selling_products')
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
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching top selling products:', error);
      const fallback = await getFeaturedProducts();
      return (fallback || []).map((p: any, idx: number) => ({
        id: `fallback-${p.id}`,
        product_id: p.id,
        sort_order: idx + 1,
        is_active: true,
        badge_text: 'BEST SELLER',
        product: p,
      }));
    }

    const validItems = (data || [])
      .filter((item: any) => item.product && item.product.is_active !== false)
      .map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        sort_order: item.sort_order,
        is_active: item.is_active,
        badge_text: item.badge_text || 'BEST SELLER',
        created_at: item.created_at,
        updated_at: item.updated_at,
        product: item.product,
      }));

    if (validItems.length === 0) {
      const fallback = await getFeaturedProducts();
      return (fallback || []).map((p: any, idx: number) => ({
        id: `fallback-${p.id}`,
        product_id: p.id,
        sort_order: idx + 1,
        is_active: true,
        badge_text: 'BEST SELLER',
        product: p,
      }));
    }

    return validItems;
  } catch (err) {
    console.error('getTopSellingProducts error:', err);
    return [];
  }
}

export interface CategoryWithProducts {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  icon?: string;
  image_url?: string;
  sort_order?: number;
  products: any[];
}

export async function getCategoriesWithProducts(): Promise<CategoryWithProducts[]> {
  try {
    const [cats, products] = await Promise.all([
      getCategories(),
      getAllProducts()
    ]);

    if (!cats || cats.length === 0) return [];

    const result: CategoryWithProducts[] = [];
    for (const cat of cats) {
      const catProducts = (products || []).filter(
        (p: any) => (p.category_id === cat.id || p.category_slug === cat.slug) && p.is_active !== false
      );
      if (catProducts.length > 0) {
        result.push({
          id: cat.id,
          name_bn: cat.name_bn,
          name_en: cat.name_en,
          slug: cat.slug,
          icon: cat.icon || cat.image_url,
          image_url: cat.image_url,
          sort_order: cat.sort_order ?? 0,
          products: catProducts,
        });
      }
    }
    return result;
  } catch (err) {
    console.error('getCategoriesWithProducts error:', err);
    return [];
  }
}




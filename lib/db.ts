import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
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
    };
  }
  return data;
}

export async function getBanners() {
  const { data, error } = await supabaseServer
    .from('oh_banners')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching banners:', error);
    return [];
  }
  return data || [];
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
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }
  return data || [];
}

export async function getAllProducts() {
  const { data, error } = await supabaseServer
    .from('oh_products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all products:', error);
    return [];
  }
  return data || [];
}

export async function getProductBySlug(slug: string) {
  // Fetch product with category name
  const { data: product, error } = await supabaseServer
    .from('oh_products')
    .select('*, oh_categories(name_bn)')
    .eq('slug', slug)
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

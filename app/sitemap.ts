import { MetadataRoute } from 'next';
import { supabaseServer } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://originhaat.com';
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/track-order`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/cart`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  // Fetch all active products
  const { data: products } = await supabaseServer
    .from('oh_products')
    .select('slug, updated_at')
    .eq('is_active', true);

  const productPages: MetadataRoute.Sitemap = (products || []).map((p) => ({
    url: `${baseUrl}/product/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  // Fetch all active categories
  const { data: categories } = await supabaseServer
    .from('oh_categories')
    .select('slug, updated_at')
    .eq('is_active', true);

  const categoryPages: MetadataRoute.Sitemap = (categories || []).map((c) => ({
    url: `${baseUrl}/category/${c.slug}`,
    lastModified: c.updated_at ? new Date(c.updated_at) : now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Fetch published dynamic pages
  const { data: pages } = await supabaseServer
    .from('oh_pages')
    .select('slug, updated_at')
    .eq('is_published', true);

  const dynamicPages: MetadataRoute.Sitemap = (pages || []).map((p) => ({
    url: `${baseUrl}/pages/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...productPages, ...categoryPages, ...dynamicPages];
}

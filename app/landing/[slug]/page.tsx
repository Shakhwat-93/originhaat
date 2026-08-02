import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import LandingClientPage from './LandingClientPage';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  if (!slug) {
    return notFound();
  }

  const decodedSlug = decodeURIComponent(slug);

  // Fetch landing page layout along with its associated product details
  const { data: landingPage, error } = await supabase
    .from('oh_landing_pages')
    .select('*, product:oh_products (*)')
    .eq('slug', decodedSlug.trim().toLowerCase())
    .eq('is_active', true)
    .single();

  if (error || !landingPage || !landingPage.product) {
    console.error(`Landing page fetch failed for slug "${slug}":`, error);
    return notFound();
  }

  return <LandingClientPage data={landingPage as any} />;
}

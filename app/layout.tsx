import type { Metadata } from 'next';
import { Hind_Siliguri } from 'next/font/google';
import './globals.css';
import { ToastNotification } from '@/components/shared/ToastNotification';
import { getSettings } from '@/lib/db';

const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-hind',
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();

  return {
    title: settings?.seo_title || 'Origin Haat — বাংলাদেশের সেরা অনলাইন শপ',
    description: settings?.seo_description || 'Origin Haat-এ কিনুন সেরা পণ্য। ক্যাশ অন ডেলিভারি, ঢাকায় ২৪ ঘণ্টায় ডেলিভারি।',
    keywords: 'online shopping bangladesh, অনলাইন শপিং, ক্যাশ অন ডেলিভারি, বাংলাদেশ, skincare, electronics, home',
    authors: [{ name: settings?.site_name || 'Origin Haat' }],
    metadataBase: new URL('https://originhaat.com'),
    openGraph: {
      type: 'website',
      locale: 'bn_BD',
      url: 'https://originhaat.com',
      siteName: settings?.site_name || 'Origin Haat',
      title: settings?.seo_title || 'Origin Haat — বাংলাদেশের সেরা অনলাইন শপ',
      description: settings?.seo_description || 'সেরা দামে সেরা পণ্য। ক্যাশ অন ডেলিভারি উপলব্ধ।',
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: settings?.site_name || 'Origin Haat',
        },
      ],
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" className={hindSiliguri.variable}>
      <body className={`${hindSiliguri.className} antialiased bg-surface`}>
        {children}
        <ToastNotification />
      </body>
    </html>
  );
}

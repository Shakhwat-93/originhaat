import type { Metadata } from 'next';
import { Anek_Bangla, Tiro_Bangla } from 'next/font/google';
import './globals.css';
import { ToastNotification } from '@/components/shared/ToastNotification';
import { TrackingScripts } from '@/components/shared/TrackingScripts';
import { getSettings } from '@/lib/db';

const anekBangla = Anek_Bangla({
  subsets: ['bengali', 'latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-anek',
});

const tiroBangla = Tiro_Bangla({
  subsets: ['bengali', 'latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-tiro',
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();

  const siteName = settings?.site_name || 'Origin Haat';
  const title = settings?.seo_title || 'Origin Haat — বাংলাদেশের সেরা অনলাইন শপিং';
  const description =
    settings?.seo_description ||
    'Origin Haat-এ কিনুন সেরা মানের পণ্য — স্কিনকেয়ার, ইলেকট্রনিক্স, লাইফস্টাইল। ক্যাশ অন ডেলিভারি উপলব্ধ। ঢাকায় ২৪ ঘণ্টায় ডেলিভারি। বাংলাদেশের যেকোনো জায়গায় শিপিং।';
  const keywords =
    'অনলাইন শপিং বাংলাদেশ, origin haat, online shopping bangladesh, ক্যাশ অন ডেলিভারি, originhaat.com, সেরা অনলাইন শপ, skincare bangladesh, electronics bangladesh, home decor bangladesh, lifestyle products, বেস্ট অনলাইন শপিং সাইট';

  return {
    title: {
      default: title,
      template: `%s — ${siteName}`,
    },
    description,
    keywords,
    authors: [{ name: siteName, url: 'https://originhaat.com' }],
    creator: siteName,
    publisher: siteName,
    metadataBase: new URL('https://originhaat.com'),
    alternates: {
      canonical: 'https://originhaat.com',
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'bn_BD',
      url: 'https://originhaat.com',
      siteName,
      title,
      description,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: siteName,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@originhaat',
      creator: '@originhaat',
      title,
      description,
      images: ['/og-image.png'],
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    },
    category: 'shopping',
    classification: 'E-commerce',
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  const siteName = settings?.site_name || 'Origin Haat';
  const description =
    settings?.seo_description ||
    'Origin Haat-এ কিনুন সেরা মানের পণ্য। ক্যাশ অন ডেলিভারি উপলব্ধ।';

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: 'https://originhaat.com',
    description,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://originhaat.com/shop?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'bn-BD',
  };

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: 'https://originhaat.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://originhaat.com/logo.png',
    },
    sameAs: [
      settings?.facebook_url || 'https://www.facebook.com/originhaat',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Bengali', 'English'],
      areaServed: 'BD',
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'BD',
    },
  };

  return (
    <html lang="bn" className={`${anekBangla.variable} ${tiroBangla.variable}`}>
      <body className={`${anekBangla.className} antialiased bg-surface`}>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {children}
        <TrackingScripts settings={settings as any} />
        <ToastNotification />
      </body>
    </html>
  );
}

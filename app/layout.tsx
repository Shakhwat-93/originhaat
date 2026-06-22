import type { Metadata } from 'next';
import { Hind_Siliguri } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { RecentOrderPopup } from '@/components/shared/RecentOrderPopup';
import { ToastNotification } from '@/components/shared/ToastNotification';
import { WhatsAppButton } from '@/components/shared/WhatsAppButton';
import { MobileBottomNav } from '@/components/shared/MobileBottomNav';
import { FloatingCartWidget } from '@/components/shared/FloatingCartWidget';

const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-hind',
});

export const metadata: Metadata = {
  title: 'Origin Haat — বাংলাদেশের সেরা অনলাইন শপ',
  description:
    'Origin Haat-এ কিনুন সেরা পণ্য। ক্যাশ অন ডেলিভারি, ঢাকায় ২৪ ঘণ্টায় ডেলিভারি। ১০০% অরিজিনাল পণ্য গ্যারান্টি।',
  keywords:
    'online shopping bangladesh, অনলাইন শপিং, ক্যাশ অন ডেলিভারি, বাংলাদেশ, skincare, electronics, home',
  authors: [{ name: 'Origin Haat' }],
  creator: 'Origin Haat',
  publisher: 'Origin Haat',
  metadataBase: new URL('https://originhaat.com'),
  openGraph: {
    type: 'website',
    locale: 'bn_BD',
    url: 'https://originhaat.com',
    siteName: 'Origin Haat',
    title: 'Origin Haat — বাংলাদেশের সেরা অনলাইন শপ',
    description:
      'সেরা দামে সেরা পণ্য। ক্যাশ অন ডেলিভারি উপলব্ধ। বাংলাদেশের সবচেয়ে বিশ্বস্ত অনলাইন শপ।',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Origin Haat Online Shop Bangladesh',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Origin Haat — বাংলাদেশের সেরা অনলাইন শপ',
    description: 'সেরা দামে সেরা পণ্য। ক্যাশ অন ডেলিভারি উপলব্ধ।',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" className={hindSiliguri.variable}>
      <body className={`${hindSiliguri.className} antialiased bg-surface`}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <RecentOrderPopup />
        <ToastNotification />
        <WhatsAppButton phoneNumber="8801XXXXXXXXX" />
        <MobileBottomNav />
        <FloatingCartWidget />
      </body>
    </html>
  );
}

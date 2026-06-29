'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  FileText, Shield, Truck, HelpCircle, FileCheck, Search, 
  ArrowLeft, Globe, ChevronRight, MessageSquare 
} from 'lucide-react';

const SIDEBAR_LINKS = [
  { slug: 'track-order', label: 'অর্ডার ট্র্যাক করুন', labelEn: 'Track Order', href: '/track-order', icon: Search },
  { slug: 'return-policy', label: 'রিটার্ন পলিসি', labelEn: 'Return Policy', href: '/pages/return-policy', icon: FileText },
  { slug: 'shipping-info', label: 'শিপিং তথ্য', labelEn: 'Shipping Info', href: '/pages/shipping-info', icon: Truck },
  { slug: 'privacy-policy', label: 'প্রাইভেসি পলিসি', labelEn: 'Privacy Policy', href: '/pages/privacy-policy', icon: Shield },
  { slug: 'terms-conditions', label: 'আমাদের শর্তাবলী', labelEn: 'Terms & Conditions', href: '/pages/terms-conditions', icon: FileCheck },
  { slug: 'faq', label: 'FAQ', labelEn: 'FAQ', href: '/pages/faq', icon: HelpCircle },
];

export default function DynamicCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [pageData, setPageData] = useState<{
    title: string;
    title_bn: string | null;
    content: string;
    content_bn: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'bn' | 'en'>('bn');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    const fetchPage = async () => {
      const { data, error } = await supabase
        .from('oh_pages')
        .select('title, title_bn, content, content_bn')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        console.error('Error fetching page:', error);
        setPageData(null);
      } else {
        setPageData(data);
      }
      setLoading(false);
    };

    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-[#ff6b35] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-gray-400 mt-3 font-semibold">পৃষ্ঠা লোড হচ্ছে...</p>
      </div>
    );
  }

  const currentTitle = lang === 'bn' && pageData?.title_bn ? pageData.title_bn : (pageData?.title || 'Not Found');
  const currentContent = lang === 'bn' && pageData?.content_bn ? pageData.content_bn : (pageData?.content || 'The requested page content is not available.');

  return (
    <div className="min-h-screen bg-[#fafaf9] py-6 sm:py-10 px-4 sm:px-6 lg:px-8 font-sans text-black">
      <div className="max-w-6xl mx-auto">
        
        {/* Top bar with Breadcrumbs & Language switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs text-gray-400 font-semibold">
            <Link href="/" className="hover:text-primary transition-colors">হোম</Link>
            <ChevronRight size={12} />
            <span className="text-gray-500 font-bold">{currentTitle}</span>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              onClick={() => setLang(l => l === 'bn' ? 'en' : 'bn')}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary-light hover:bg-primary-light/80 text-primary font-extrabold text-xs rounded-xl transition-all cursor-pointer border border-primary/10"
            >
              <Globe size={13} />
              <span>{lang === 'bn' ? 'English (EN)' : 'বাংলা (BN)'}</span>
            </button>

            <Link
              href="/"
              className="flex items-center gap-1 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs rounded-xl transition-all border border-gray-200"
            >
              <ArrowLeft size={13} />
              <span>{lang === 'bn' ? 'ফিরে যান' : 'Back'}</span>
            </Link>
          </div>
        </div>

        {/* Mobile Horizontal scrollable chips row */}
        <div className="lg:hidden overflow-x-auto flex gap-2 pb-3 mb-6 -mx-4 px-4 scrollbar-none">
          {SIDEBAR_LINKS.map((link) => {
            const isLinkActive = link.slug === slug;
            const Icon = link.icon;
            return (
              <Link
                key={link.slug}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-extrabold whitespace-nowrap shrink-0 transition-all border ${
                  isLinkActive
                    ? 'bg-primary text-white border-transparent shadow-xs'
                    : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                }`}
              >
                <Icon size={14} className={isLinkActive ? 'text-white' : 'text-gray-400'} />
                <span>{lang === 'bn' ? link.label : link.labelEn}</span>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* LEFT: Help Center Sidebar Links (Hidden on mobile) */}
          <div className="hidden lg:block bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-4 sticky top-6">
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm tracking-tight px-1">
                {lang === 'bn' ? 'গ্রাহক সেবা' : 'Customer Service'}
              </h3>
              <p className="text-[10px] text-gray-400 font-semibold px-1 mt-0.5">Help & Resource Center</p>
            </div>

            <div className="space-y-1.5">
              {SIDEBAR_LINKS.map((link) => {
                const isLinkActive = link.slug === slug;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.slug}
                    href={link.href}
                    className={`w-full flex items-center gap-3 px-3 py-2.8 rounded-xl text-xs font-bold transition-all border ${
                      isLinkActive
                        ? 'bg-primary-light text-primary border-primary/10'
                        : 'text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={15} className={isLinkActive ? 'text-primary' : 'text-gray-400'} />
                    <span>{lang === 'bn' ? link.label : link.labelEn}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-4 border-t border-gray-100 text-center">
              <p className="text-[10px] text-gray-400 font-medium">জরুরি প্রয়োজনে সরাসরি যোগাযোগ করুন</p>
              <a
                href="tel:01300000000"
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-black text-primary hover:underline"
              >
                <MessageSquare size={12} />
                <span>+৮৮০১XXXXXXXXX</span>
              </a>
            </div>
          </div>

          {/* RIGHT: Dynamic Page Content Card */}
          <div className="lg:col-span-3 bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            {!pageData ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
                  <FileText size={28} />
                </div>
                <h3 className="font-extrabold text-gray-900 text-base">Page Not Found</h3>
                <p className="text-xs text-gray-400">The requested dynamic page does not exist.</p>
                <button
                  onClick={() => router.push('/')}
                  className="bg-primary text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer"
                >
                  Go Home
                </button>
              </div>
            ) : (
              <>
                {/* Header title */}
                <div className="border-b border-gray-100 pb-4 relative">
                  <span className="w-8 h-1 bg-primary rounded-full absolute -top-1 left-0" />
                  <h1 className="font-black text-gray-900 text-xl tracking-tight sm:text-2xl mt-2">
                    {currentTitle}
                  </h1>
                  <p className="text-[10px] text-gray-400 font-semibold mt-1">
                    Last updated: {new Date().toLocaleDateString()}
                  </p>
                </div>

                {/* Content body */}
                <div className="text-gray-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-semibold space-y-4 min-h-[30vh]">
                  {currentContent}
                </div>

                {/* Need Help Box */}
                <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                  <div className="text-center sm:text-left">
                    <h4 className="font-extrabold text-gray-900 text-sm">
                      {lang === 'bn' ? 'অতিরিক্ত কোনো প্রশ্ন আছে?' : 'Have more questions?'}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {lang === 'bn' ? 'আমাদের কাস্টমার সাপোর্ট টিম ২৪/৭ ফ্রি সলিউশন দিতে প্রস্তুত।' : 'Our support team is ready to assist you 24/7.'}
                    </p>
                  </div>
                  <a
                    href="tel:01300000000"
                    className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-black hover:bg-gray-900 text-white text-xs font-extrabold rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <MessageSquare size={14} />
                    <span>{lang === 'bn' ? 'যোগাযোগ করুন' : 'Contact Support'}</span>
                  </a>
                </div>
              </>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

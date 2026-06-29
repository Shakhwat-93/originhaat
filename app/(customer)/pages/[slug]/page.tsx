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
    <div className="min-h-screen bg-[#fafaf9] pb-12 font-sans text-black">
      
      {/* Centered Large Header Banner (Ghorer Bazar style) */}
      <div className="w-full bg-[#f4f4f5] border-b border-gray-200 py-10 px-4 text-center">
        <h1 className="font-extrabold text-2xl md:text-3xl text-gray-900 tracking-tight">
          {currentTitle}
        </h1>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8">
        
        {/* Breadcrumbs & Language switcher bar */}
        <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-6 bg-white py-3 px-4 rounded-xl border border-gray-100 shadow-2xs">
          <div className="flex items-center gap-1.5">
            <Link href="/" className="hover:text-primary transition-colors">হোম</Link>
            <span>&gt;</span>
            <span className="text-gray-600 font-bold">{currentTitle}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(l => l === 'bn' ? 'en' : 'bn')}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary-light hover:bg-primary-light/80 text-primary font-black rounded-lg border border-primary/10 cursor-pointer text-[10px]"
            >
              <Globe size={11} />
              <span>{lang === 'bn' ? 'English (EN)' : 'বাংলা (BN)'}</span>
            </button>
            
            <Link
              href="/"
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg border border-gray-200 text-[10px]"
            >
              <ArrowLeft size={11} />
              <span>{lang === 'bn' ? 'ফিরে যান' : 'Back'}</span>
            </Link>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-2xs space-y-6">
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
              {/* Content body */}
              <div className="text-gray-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium space-y-4 min-h-[30vh]">
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
  );
}

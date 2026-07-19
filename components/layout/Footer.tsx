import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin } from 'lucide-react';
import { categories } from '@/data/products';

interface FooterProps {
  settings?: {
    hotline_number?: string;
    contact_email?: string;
    contact_address?: string;
    support_time?: string;
    payment_methods?: string;
  };
}

export function Footer({ settings }: FooterProps) {
  const hotlineNumber = settings?.hotline_number || '01XXXXXXXXX';
  const contactEmail = settings?.contact_email || 'support@originhaat.com';
  const contactAddress = settings?.contact_address || 'ঢাকা, বাংলাদেশ';
  const supportTime = settings?.support_time || 'সকাল ৯টা — রাত ৯টা';
  const paymentMethodsString = settings?.payment_methods || '💳 bKash, 💚 Nagad, 💜 Rocket, 🏦 DBBL';

  const paymentMethods = paymentMethodsString
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <footer className="bg-white text-gray-600 border-t border-[#e5e7eb] mt-16">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image
                src="/logo.png"
                alt="Origin Haat Logo"
                width={140}
                height={40}
                className="h-9 w-auto object-contain"
              />
            </Link>
            <p className="text-sm leading-relaxed mb-4 text-gray-500">
              বাংলাদেশের বিশ্বস্ত অনলাইন শপ। সেরা মানের পণ্য, সর্বোত্তম দাম, দ্রুত ডেলিভারি।
            </p>
            <div className="flex gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-[#1877F2] rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity animate-pulse-badge"
                aria-label="Facebook"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-[#FF0000] rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity"
                aria-label="YouTube"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" /></svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-gradient-to-tr from-[#FFB200] via-[#FF007A] to-[#7A00FF] rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity"
                aria-label="Instagram"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-gray-900 font-bold mb-4">ক্যাটাগরি</h3>
            <ul className="space-y-2.5 text-sm">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <Link href={`/category/${cat.slug}`} className="hover:text-[#ff6b35] transition-colors">
                    {cat.name_bn}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-gray-900 font-bold mb-4">গ্রাহক সেবা</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'অর্ডার ট্র্যাক করুন', href: '/track-order' },
                { label: 'রিটার্ন পলিসি', href: '/pages/return-policy' },
                { label: 'শিপিং তথ্য', href: '/pages/shipping-info' },
                { label: 'প্রাইভেসি পলিসি', href: '/pages/privacy-policy' },
                { label: 'ব্যবহারের শর্তাবলী', href: '/pages/terms-conditions' },
                { label: 'FAQ', href: '/pages/faq' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-[#ff6b35] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-gray-900 font-bold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Phone size={15} className="text-[#ff6b35] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-800 font-semibold">{hotlineNumber}</p>
                  <p className="text-xs text-gray-400">{supportTime}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={15} className="text-[#ff6b35] mt-0.5 flex-shrink-0" />
                <a href={`mailto:${contactEmail}`} className="hover:text-[#ff6b35] transition-colors">
                  {contactEmail}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={15} className="text-[#ff6b35] mt-0.5 flex-shrink-0" />
                <span>{contactAddress}</span>
              </li>
            </ul>

            {/* Trust Badges */}
            <div className="mt-6 flex flex-wrap gap-2">
              {paymentMethods.map((badge) => (
                <span
                  key={badge}
                  className="text-xs bg-gray-50 border border-gray-200 px-2 py-1 rounded-md text-gray-600 font-medium shadow-sm"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <p>© ২০২৬ Origin Haat. সর্বস্বত্ব সংরক্ষিত।</p>
          <div className="flex items-center gap-1">
            <span>Build by</span>
            <a
              href="https://shakhwatrasel.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ff6b35] font-semibold hover:underline"
            >
              Shakhwat Hossain Rasel
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

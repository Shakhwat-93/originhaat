import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin } from 'lucide-react';
import { categories } from '@/data/products';

export function Footer() {
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
                href="https://wa.me/8801XXXXXXXXX"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-[#25D366] rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity"
                aria-label="WhatsApp"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                </svg>
              </a>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-gray-900 font-bold mb-4">Categories</h3>
            <ul className="space-y-2 text-sm">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="flex items-center gap-2 hover:text-[#ff6b35] transition-colors"
                  >
                    <span>{cat.icon}</span> {cat.name_en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-gray-900 font-bold mb-4">Customer Service</h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'অর্ডার ট্র্যাক করুন', href: '/track-order' },
                { label: 'রিটার্ন পলিসি', href: '/return-policy' },
                { label: 'শিপিং তথ্য', href: '/shipping' },
                { label: 'প্রাইভেসি পলিসি', href: '/privacy' },
                { label: 'ব্যবহারের শর্তাবলী', href: '/terms' },
                { label: 'FAQ', href: '/faq' },
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
                  <p className="text-gray-800 font-semibold">01XXXXXXXXX</p>
                  <p className="text-xs text-gray-400">সকাল ৯টা — রাত ৯টা</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={15} className="text-[#ff6b35] mt-0.5 flex-shrink-0" />
                <a href="mailto:support@originhaat.com" className="hover:text-[#ff6b35] transition-colors">
                  support@originhaat.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={15} className="text-[#ff6b35] mt-0.5 flex-shrink-0" />
                <span>ঢাকা, বাংলাদেশ</span>
              </li>
            </ul>

            {/* Trust Badges */}
            <div className="mt-6 flex flex-wrap gap-2">
              {['💳 bKash', '💚 Nagad', '💜 Rocket', '🏦 DBBL'].map((badge) => (
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
          <div className="flex items-center gap-4">
            <span>🔒 SSL সুরক্ষিত</span>
            <span>✅ ১০০% অরিজিনাল</span>
            <span>🚚 দ্রুত ডেলিভারি</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

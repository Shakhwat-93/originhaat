import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('bn-BD')}`;
}

export function formatBDTNumeric(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`;
}

export function calculateDiscount(original: number, sale: number): number {
  return Math.round(((original - sale) / original) * 100);
}

export function getStockStatus(stock: number): {
  label: string;
  color: string;
  urgent: boolean;
} {
  if (stock === 0) {
    return { label: 'স্টক শেষ', color: 'text-red-600', urgent: false };
  }
  if (stock <= 5) {
    return { label: `মাত্র ${stock} টি বাকি!`, color: 'text-red-500', urgent: true };
  }
  if (stock <= 10) {
    return { label: `সীমিত স্টক — ${stock} টি বাকি`, color: 'text-orange-500', urgent: true };
  }
  return { label: 'স্টকে আছে', color: 'text-green-600', urgent: false };
}

export function generateWhatsAppURL(
  phone: string,
  message: string
): string {
  const cleaned = phone.replace(/\D/g, '');
  const international = cleaned.startsWith('0') ? `88${cleaned}` : cleaned;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

export function generateOrderWhatsAppMessage(
  customerName: string,
  phone: string,
  address: string,
  district: string,
  items: { name: string; qty: number; price: number }[],
  total: number
): string {
  const itemLines = items
    .map((i) => `• ${i.name} × ${i.qty} = ৳${i.price * i.qty}`)
    .join('\n');

  const districtLabel = district ? (district === 'Dhaka' || district === 'Outside Dhaka' ? (district === 'Dhaka' ? 'ঢাকা' : 'ঢাকার বাইরে') : district) : '';
  const fullAddress = districtLabel 
    ? `${address}, ${districtLabel}` 
    : address;

  return `🛍️ নতুন অর্ডার —\nOrigin Haat - সেরা পণ্য, সবার জন্য।\nঅরিজিনাল প্রোডাক্ট এর নিশ্চয়তা\n\n👤 নাম: ${customerName}\n📞 মোবাইল: ${phone}\n📍 ঠিকানা: ${fullAddress}\n\n📦 অর্ডার:\n${itemLines}\n\n💰 মোট: ৳${total}\n💳 পেমেন্ট: ক্যাশ অন ডেলিভারি`;
}

export function toBengaliNumber(num: number): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bengaliDigits[parseInt(d)]);
}

export function getRelativeTime(dateStr: string): string {
  return dateStr;
}

export function formatImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.includes('/storage/v1/object/public/')) {
    const storageIndex = url.indexOf('/storage/v1');
    if (storageIndex !== -1) {
      return `/api/supabase-proxy${url.substring(storageIndex)}`;
    }
  }
  return url;
}

export function formatName(bn?: string, en?: string, displayNameLang?: string): string {
  const lang = displayNameLang || 'bn';

  if (lang === 'en') {
    const rawEn = en?.trim() || bn?.trim() || '';
    if (rawEn.includes('|')) {
      const parts = rawEn.split('|');
      return parts[0].trim();
    }
    return rawEn;
  } else {
    const rawBn = bn?.trim() || en?.trim() || '';
    if (rawBn.includes('|')) {
      const parts = rawBn.split('|');
      return parts[1]?.trim() || parts[0].trim();
    }
    return rawBn;
  }
}


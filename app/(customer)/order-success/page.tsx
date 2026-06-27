'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Home, MessageCircle, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface StoredOrder {
  id: string;
  name: string;
  phone: string;
  district: string;
  total: number;
  whatsappMessage: string;
}

export default function OrderSuccessPage() {
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('8801700000000');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lastOrder');
      if (stored) setOrder(JSON.parse(stored));
    } catch {
      // ignore
    }

    const fetchWhatsappNumber = async () => {
      try {
        const { data } = await supabase.from('oh_settings').select('whatsapp_number').eq('id', 1).single();
        if (data?.whatsapp_number) {
          setWhatsappNumber(data.whatsapp_number);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchWhatsappNumber();
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center">
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex justify-center mb-6"
        >
          <div className="w-24 h-24 bg-[#fff3ef] rounded-full flex items-center justify-center">
            <CheckCircle size={48} className="text-[#10b981]" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-3xl font-bold text-[#111827] mb-2">
            অর্ডার সফল হয়েছে! 🎉
          </h1>
          <p className="text-[#6b7280] text-lg mb-6">
            আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে।
            শীঘ্রই আমাদের টিম আপনার সাথে যোগাযোগ করবে।
          </p>

          {/* Order Info */}
          {order && (
            <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5 mb-6 text-left">
              <h2 className="font-bold text-[#111827] mb-4 flex items-center gap-2">
                <Package size={18} className="text-[#ff6b35]" />
                অর্ডারের তথ্য
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">অর্ডার নম্বর</span>
                  <span className="font-bold text-[#111827]">{order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">নাম</span>
                  <span className="font-medium text-[#374151]">{order.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">মোবাইল</span>
                  <span className="font-medium text-[#374151]">{order.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">জেলা</span>
                  <span className="font-medium text-[#374151]">{order.district}</span>
                </div>
                <div className="flex justify-between border-t border-[#e5e7eb] pt-2 mt-2">
                  <span className="font-bold text-[#111827]">মোট পরিশোধ</span>
                  <span className="font-bold text-[#ff6b35] text-lg">৳{order.total}</span>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Promise */}
          <div className="bg-[#fff3ef] rounded-2xl p-4 mb-6">
            <p className="text-[#ff6b35] font-semibold">🚚 ডেলিভারির সময়</p>
            <p className="text-sm text-[#374151] mt-1">
              ঢাকার মধ্যে: ২৪ ঘণ্টার মধ্যে · সারাদেশ: ২-৩ কর্মদিবস
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            {order && (
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(order.whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1fad54] text-white font-bold py-3.5 rounded-xl transition-colors cursor-pointer"
              >
                <MessageCircle size={18} />
                WhatsApp-এ কনফার্ম করুন
              </a>
            )}
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-2 bg-[#ff6b35] hover:bg-[#e55520] text-white font-bold py-3.5 rounded-xl transition-colors cursor-pointer"
            >
              <Home size={18} />
              হোমে ফিরুন
            </Link>
          </div>

          <p className="text-xs text-[#6b7280] mt-4">
            কোনো সমস্যা? আমাদের কল করুন: <a href={`tel:${whatsappNumber}`} className="text-[#ff6b35] font-semibold">{whatsappNumber}</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

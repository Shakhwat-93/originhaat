'use client';

import { useState } from 'react';
import { FAQ } from '@/types';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductFAQProps {
  faqs: FAQ[];
}

export function ProductFAQ({ faqs }: ProductFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const defaultFAQs: FAQ[] = [
    { question: 'ডেলিভারি চার্জ কত?', answer: '৳৯৯৯ এর বেশি অর্ডারে ফ্রি ডেলিভারি। ঢাকায় ৬০ টাকা এবং ঢাকার বাইরে ১০০ টাকা।' },
    { question: 'কিভাবে পেমেন্ট করবো?', answer: 'ক্যাশ অন ডেলিভারি — পণ্য পেয়ে পেমেন্ট করুন। bKash, Nagad, Rocket ও গ্রহণযোগ্য।' },
    { question: 'পণ্য ফেরত দেওয়া যাবে?', answer: 'হ্যাঁ, পণ্য পাওয়ার ৭ দিনের মধ্যে যেকোনো কারণে ফেরত দিতে পারবেন।' },
    { question: 'অর্ডার কিভাবে ট্র্যাক করবো?', answer: 'অর্ডার করার পরে WhatsApp-এ ট্র্যাকিং লিংক পাঠানো হবে।' },
    ...faqs,
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6">
      <h2 className="text-lg font-bold text-[#111827] mb-4">❓ সাধারণ প্রশ্নোত্তর</h2>
      <div className="space-y-2">
        {defaultFAQs.map((faq, i) => (
          <div
            key={i}
            className="border border-[#e5e7eb] rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[#f8f9fa] transition-colors"
            >
              <span className="text-sm font-semibold text-[#111827] pr-4">{faq.question}</span>
              <ChevronDown
                size={16}
                className={cn(
                  'text-[#6b7280] flex-shrink-0 transition-transform duration-200',
                  openIndex === i ? 'rotate-180' : ''
                )}
              />
            </button>
            <AnimatePresence>
              {openIndex === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="px-4 pb-4 text-sm text-[#374151] leading-relaxed border-t border-[#f3f4f6] pt-3">
                    {faq.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

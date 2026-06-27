'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  MessageCircle, 
  X, 
  Bot, 
  Send, 
  Sparkles, 
  Phone, 
  Truck, 
  CreditCard, 
  Search 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatsAppButtonProps {
  phoneNumber: string;
  message?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export function WhatsAppButton({ phoneNumber, message = 'হ্যালো! আমি Origin Haat থেকে অর্ডার করতে চাই।' }: WhatsAppButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [facebookUrl, setFacebookUrl] = useState('');
  
  // Chatbot states
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'আসসালামু আলাইকুম! আমি Origin Haat এর এআই অ্যাসিস্ট্যান্ট। আমি আপনাকে কীভাবে সাহায্য করতে পারি? নিচের যেকোনো একটি প্রশ্ন সিলেক্ট করতে পারেন:',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch social settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('oh_settings').select('facebook_url').eq('id', 1).single();
        if (data?.facebook_url) {
          setFacebookUrl(data.facebook_url);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Construct links
  const waUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  
  const getMessengerUrl = () => {
    if (!facebookUrl) return 'https://m.me';
    try {
      const url = new URL(facebookUrl);
      const path = url.pathname.replace(/^\/|\/$/g, '');
      if (path) return `https://m.me/${path}`;
    } catch (e) {
      // ignore
    }
    return facebookUrl || 'https://m.me';
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      setIsTyping(false);
      let replyText = '';
      const cleanText = text.toLowerCase();

      if (cleanText.includes('ডেলিভারি') || cleanText.includes('delivery') || cleanText.includes('সময়') || cleanText.includes('খরচ')) {
        replyText = 'Origin Haat-এ ডেলিভারি চার্জ ঢাকায় ৬০ টাকা এবং ঢাকার বাইরে ১২০ টাকা। ঢাকায় আমরা ২৪ ঘণ্টার মধ্যে এবং ঢাকার বাইরে ২-৩ দিনের মধ্যে ডেলিভারি সম্পন্ন করে থাকি। এছাড়া ৯৯৯ টাকা বা তার বেশি অর্ডারে ডেলিভারি চার্জ সম্পূর্ণ ফ্রি!';
      } else if (cleanText.includes('পেমেন্ট') || cleanText.includes('টাকা') || cleanText.includes('payment') || cleanText.includes('বিকাশ')) {
        replyText = 'আমরা মূলত ক্যাশ অন ডেলিভারি (Cash on Delivery) সুবিধা দিয়ে থাকি। অর্থাৎ প্রোডাক্ট হাতে পেয়ে, দেখে তারপর মূল্য পরিশোধ করবেন। এছাড়া আপনি চাইলে বিকাশ বা রকেটেও পেমেন্ট করতে পারেন।';
      } else if (cleanText.includes('ট্র্যাক') || cleanText.includes('অবস্থা') || cleanText.includes('track') || cleanText.includes('অর্ডার')) {
        replyText = 'আপনার অর্ডারের বর্তমান অবস্থা জানতে আমাদের ওয়েবসাইটের নিচে থাকা "অর্ডার ট্র্যাক" বাটনে ক্লিক করুন। সেখানে আপনার মোবাইল নাম্বার বা অর্ডার আইডি দিয়ে সরাসরি লাইভ আপডেট দেখতে পাবেন।';
      } else if (cleanText.includes('যোগাযোগ') || cleanText.includes('ফোন') || cleanText.includes('নাম্বার') || cleanText.includes('কাস্টমার')) {
        replyText = `আমাদের কাস্টমার রিপ্রেজেন্টেটিভের সাথে সরাসরি চ্যাট করতে পাশে থাকা WhatsApp লিংকে ক্লিক করুন অথবা সরাসরি আমাদের ফোন করুন।`;
      } else {
        replyText = 'ধন্যবাদ আপনার মেসেজের জন্য! আমাদের কাস্টমার রিপ্রেজেন্টেটিভ খুব শীঘ্রই আপনার চ্যাটে রেসপন্স করবেন। জরুরি প্রয়োজনে দয়া করে সরাসরি আমাদের ফোন করুন অথবা হোয়াটসঅ্যাপে যোগাযোগ করুন।';
      }

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: replyText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
    }, 1000);
  };

  const quickReplies = [
    { text: '🚚 ডেলিভারি চার্জ ও সময়', value: 'ডেলিভারি চার্জ ও সময় কত?' },
    { text: '💳 পেমেন্ট পদ্ধতি', value: 'পেমেন্ট কীভাবে করব?' },
    { text: '📦 অর্ডার ট্র্যাক করার নিয়ম', value: 'অর্ডার কীভাবে ট্র্যাক করব?' },
    { text: '📞 সাপোর্ট এজেন্টের নাম্বার', value: 'যোগাযোগের মোবাইল নাম্বার কত?' },
  ];

  return (
    <>
      {/* Speed Dial Support widget container */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex flex-col items-end gap-3 select-none">
        
        {/* Expanded Speed Dial options */}
        <AnimatePresence>
          {isOpen && (
            <div className="flex flex-col items-end gap-3 mb-2">
              
              {/* Option 1: WhatsApp */}
              <motion.a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.8 }}
                transition={{ duration: 0.15, delay: 0.1 }}
                className="flex items-center gap-2 group"
              >
                <span className="bg-white text-slate-800 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                  WhatsApp চ্যাট
                </span>
                <div className="w-12 h-12 bg-[#25D366] rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform">
                  <svg viewBox="0 0 24 24" className="w-6.5 h-6.5 fill-white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                  </svg>
                </div>
              </motion.a>

              {/* Option 2: Facebook Messenger */}
              <motion.a
                href={getMessengerUrl()}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.8 }}
                transition={{ duration: 0.15, delay: 0.05 }}
                className="flex items-center gap-2 group"
              >
                <span className="bg-white text-slate-800 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                  Messenger চ্যাট
                </span>
                <div className="w-12 h-12 bg-gradient-to-tr from-[#006AFF] to-[#00B2FF] rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform">
                  <svg viewBox="0 0 24 24" className="w-6.5 h-6.5 fill-white">
                    <path d="M12 2C6.48 2 2 6.14 2 11.25c0 2.91 1.45 5.51 3.75 7.18.2.14.32.37.32.61l.01 2.2c0 .48.53.79.96.57l2.45-1.28c.2-.1.43-.13.65-.07 1.22.35 2.52.54 3.86.54 5.52 0 10-4.14 10-9.25S17.52 2 12 2zm1.09 11.45l-1.89-2.02-3.69 2.02c-.38.21-.83-.2-.68-.6l2.03-3.69-1.89-2.02c-.28-.3-.07-.79.33-.79l3.69.01 1.89 2.02 3.69-2.02c.38-.21.83.2.68.6l-2.03 3.69 1.89 2.02c.28.3.07.79-.33.79l-3.69-.01z" />
                  </svg>
                </div>
              </motion.a>

              {/* Option 3: AI Chatbot */}
              <motion.button
                onClick={() => {
                  setShowChatbot(true);
                  setIsOpen(false);
                }}
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2 group"
              >
                <span className="bg-white text-slate-800 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                  AI চ্যাটবট (Support Bot)
                </span>
                <div className="w-12 h-12 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform text-white">
                  <Bot size={22} />
                </div>
              </motion.button>

            </div>
          )}
        </AnimatePresence>

        {/* Trigger Button */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white relative outline-none transition-all duration-300",
            isOpen 
              ? "bg-slate-800 hover:bg-slate-700 hover:shadow-2xl" 
              : "bg-gradient-to-tr from-[#ff6b35] to-[#ff8c5a] hover:from-[#e55520] hover:to-[#ff6b35] hover:shadow-2xl"
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Pulsing glow ring when closed */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full bg-[#ff6b35] animate-ping opacity-30 -z-10" />
          )}

          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X size={24} />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center"
              >
                <MessageCircle size={26} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* AI Chatbot Dialog Overlay */}
      <AnimatePresence>
        {showChatbot && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => setShowChatbot(false)} />

            {/* Dialog Container */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="bg-white w-[380px] max-w-full h-[550px] max-h-[85vh] rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden relative z-10"
            >
              
              {/* Header */}
              <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-4 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center relative">
                    <Bot size={22} />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-indigo-600 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                      Origin Haat AI Assistant
                      <Sparkles size={13} className="text-amber-300 animate-pulse" />
                    </h3>
                    <p className="text-[11px] text-indigo-100 flex items-center gap-1 mt-0.5">
                      <span>⚡ অনলাইন</span>
                      <span>•</span>
                      <span>সর্বদা সাহায্য করতে প্রস্তুত</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowChatbot(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={cn(
                      "flex items-end gap-2",
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.sender === 'bot' && (
                      <div className="w-7 h-7 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                        <Bot size={15} />
                      </div>
                    )}
                    <div className="max-w-[75%]">
                      <div className={cn(
                        "p-3 rounded-2xl text-[13px] leading-relaxed shadow-xs",
                        msg.sender === 'user' 
                          ? 'bg-[#ff6b35] text-white rounded-br-none' 
                          : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                      )}>
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-slate-400 block mt-1 px-1">
                        {msg.timestamp.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Bot Typing indicator */}
                {isTyping && (
                  <div className="flex items-end gap-2 justify-start">
                    <div className="w-7 h-7 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0 animate-pulse">
                      <Bot size={15} />
                    </div>
                    <div className="p-3 bg-white border border-slate-100 rounded-2xl rounded-bl-none shadow-xs">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Quick Reply Badges */}
              <div className="px-4 py-2 border-t border-slate-100 bg-white flex items-center gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
                {quickReplies.map((qr, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(qr.value)}
                    className="inline-block border border-slate-200 hover:border-[#ff6b35] hover:text-[#ff6b35] text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer bg-slate-50"
                  >
                    {qr.text}
                  </button>
                ))}
              </div>

              {/* Message Input Footer */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputValue);
                }}
                className="p-3.5 border-t border-slate-100 bg-white flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="আপনার প্রশ্নটি এখানে লিখুন..."
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:border-[#ff6b35] focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="w-10 h-10 bg-[#ff6b35] hover:bg-[#e55520] disabled:bg-slate-200 text-white rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-sm"
                >
                  <Send size={16} />
                </button>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

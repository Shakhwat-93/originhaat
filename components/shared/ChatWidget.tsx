'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  MessageCircle, X, Send, Paperclip, Mic,
  ChevronRight, Volume2, Check, CheckCheck, ThumbsUp, ThumbsDown,
  ChevronLeft, Bot, MessageSquare, Sparkles, Phone, Star, Globe
} from 'lucide-react';
import { formatBDTNumeric } from '@/lib/utils';
import { showSuccessAlert, showErrorAlert } from '@/lib/alerts';

interface ChatWidgetProps {
  whatsappNumber: string;
}

interface BotMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

// ── SVG Robot Avatar Component ────────────────────────────────────────────
function RobotAvatar({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="40" fill="#FFF3EE" />
      {/* Body */}
      <rect x="20" y="30" width="40" height="30" rx="8" fill="#ff6b35" />
      {/* Head */}
      <rect x="24" y="14" width="32" height="22" rx="7" fill="#ff6b35" />
      {/* Antenna */}
      <line x1="40" y1="14" x2="40" y2="8" stroke="#ff6b35" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="40" cy="6" r="3" fill="#ff6b35" />
      {/* Eyes */}
      <circle cx="32" cy="23" r="4" fill="white" />
      <circle cx="48" cy="23" r="4" fill="white" />
      <circle cx="33" cy="24" r="2" fill="#ff6b35" />
      <circle cx="49" cy="24" r="2" fill="#ff6b35" />
      {/* Mouth */}
      <rect x="30" y="30" width="20" height="3" rx="1.5" fill="white" opacity="0.7" />
      {/* Hands */}
      <rect x="10" y="38" width="10" height="14" rx="5" fill="#ff6b35" />
      <rect x="60" y="38" width="10" height="14" rx="5" fill="#ff6b35" />
      {/* Legs */}
      <rect x="26" y="58" width="10" height="10" rx="4" fill="#ff6b35" />
      <rect x="44" y="58" width="10" height="10" rx="4" fill="#ff6b35" />
      {/* Shine dots on body */}
      <circle cx="33" cy="42" r="2.5" fill="white" opacity="0.4" />
      <circle cx="40" cy="42" r="2.5" fill="white" opacity="0.4" />
      <circle cx="47" cy="42" r="2.5" fill="white" opacity="0.4" />
    </svg>
  );
}

// ── Decorative floating bubbles for welcome screen ────────────────────────
function BubbleDots() {
  return (
    <>
      <span className="absolute top-3 left-5 w-3 h-3 rounded-full bg-[#ff6b35]/20 animate-bounce [animation-delay:0s]" />
      <span className="absolute top-8 right-8 w-2 h-2 rounded-full bg-[#ff6b35]/30 animate-bounce [animation-delay:0.3s]" />
      <span className="absolute bottom-4 left-8 w-2.5 h-2.5 rounded-full bg-[#ff6b35]/15 animate-bounce [animation-delay:0.6s]" />
      <span className="absolute bottom-8 right-4 w-3 h-3 rounded-full bg-[#ff6b35]/25 animate-bounce [animation-delay:0.9s]" />
    </>
  );
}

export function ChatWidget({ whatsappNumber }: ChatWidgetProps) {
  const [isOpen, setIsOpen]         = useState(false);
  const [activeScreen, setActiveScreen] = useState<'welcome' | 'menu' | 'live-onboard' | 'live-thread' | 'ai-bot' | 'end-session' | 'feedback-done'>('welcome');

  // Visitor
  const [visitorId, setVisitorId]   = useState('');
  const [name, setName]             = useState('');
  const [phone, setPhone]           = useState('');
  const [department, setDepartment] = useState('Support');
  const [lang, setLang]             = useState<'bn' | 'en'>('bn');
  const [facebookUrl, setFacebookUrl] = useState('');

  // Live chat
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages]     = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [visitorMeta, setVisitorMeta]   = useState<any>(null);
  const [isTyping, setIsTyping]     = useState(false);

  // Voice
  const [isRecording, setIsRecording]   = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // Feedback / rating
  const [starRating, setStarRating] = useState<number>(0);
  const [comment, setComment]       = useState('');

  // AI bot
  const [aiBotMessages, setAiBotMessages] = useState<BotMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: lang === 'bn'
        ? 'আসসালামু আলাইকুম! আমি Origin Haat এর AI Assistant। কীভাবে সাহায্য করতে পারি?'
        : 'Hello! I am Origin Haat AI Assistant. How can I help you today?',
      timestamp: new Date(),
    }
  ]);
  const [aiInput, setAiInput]   = useState('');
  const [aiTyping, setAiTyping] = useState(false);

  // Unread badge
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef    = useRef<HTMLDivElement>(null);
  const botMessagesEndRef = useRef<HTMLDivElement>(null);

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let storedId = localStorage.getItem('oh_visitor_id');
    if (!storedId) {
      storedId = 'v_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('oh_visitor_id', storedId);
    }
    setVisitorId(storedId);

    fetch('/api/ip-info').then(r => r.json()).then(d => setVisitorMeta(d)).catch(() => {});
    supabase.from('oh_settings').select('facebook_url').eq('id', 1).single()
      .then(({ data }) => { if (data?.facebook_url) setFacebookUrl(data.facebook_url); });

    const savedName  = localStorage.getItem('oh_visitor_name');
    const savedPhone = localStorage.getItem('oh_visitor_phone');
    if (savedName && savedPhone) {
      setName(savedName); setPhone(savedPhone);
      reconnectPreviousChat(storedId);
    }
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { botMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiBotMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!activeChat) return;
    const ch = supabase.channel(`cw-${activeChat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'oh_chat_messages', filter: `chat_id=eq.${activeChat.id}` },
        (payload) => {
          const m = payload.new as any;
          setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
          if (m.sender_role === 'agent' && !isOpen) setUnreadCount(n => n + 1);
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'oh_chat_messages', filter: `chat_id=eq.${activeChat.id}` },
        (payload) => { const u = payload.new as any; setMessages(prev => prev.map(m => m.id === u.id ? u : m)); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeChat, isOpen]);

  const reconnectPreviousChat = async (vId: string) => {
    const { data } = await supabase.from('oh_chats').select('*').eq('visitor_id', vId)
      .in('status', ['active', 'pending']).order('created_at', { ascending: false }).limit(1);
    if (data && data.length > 0) { setActiveChat(data[0]); loadMessages(data[0].id); }
  };

  const loadMessages = async (chatId: string) => {
    const { data } = await supabase.from('oh_chat_messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    localStorage.setItem('oh_visitor_name', name);
    localStorage.setItem('oh_visitor_phone', phone);

    const { data: newChat, error } = await supabase.from('oh_chats').insert({
      visitor_id: visitorId, customer_name: name, customer_phone: phone,
      department, status: 'pending',
      ip: visitorMeta?.ip || null, country: visitorMeta?.country || null,
      city: visitorMeta?.city || null, device: visitorMeta?.device || null,
      browser: visitorMeta?.browser || null, os: visitorMeta?.os || null,
      landing_page: typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '/',
      current_page: typeof window !== 'undefined' ? window.location.pathname : '/',
      session_duration: 0,
    }).select().single();

    if (error) { showErrorAlert('Error', 'Failed to connect. Try again.'); return; }
    if (newChat) {
      setActiveChat(newChat);
      await supabase.from('oh_chat_messages').insert({
        chat_id: newChat.id, sender_role: 'system', sender_name: 'System',
        body: `Joined "${department}" department.`,
      });
      loadMessages(newChat.id);
      setActiveScreen('live-thread');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !activeChat) return;
    const body = messageInput;
    setMessageInput('');
    await supabase.from('oh_chat_messages').insert({
      chat_id: activeChat.id, sender_role: 'customer', sender_name: name, body
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;
    try {
      const fileName = `${activeChat.id}/${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('oh_chat_attachments').upload(fileName, file);
      if (error) throw error;
      const { data: ud } = supabase.storage.from('oh_chat_attachments').getPublicUrl(fileName);
      const ftype = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'voice' : 'pdf';
      await supabase.from('oh_chat_messages').insert({
        chat_id: activeChat.id, sender_role: 'customer', sender_name: name,
        attachments: [{ url: ud.publicUrl, name: file.name, type: ftype }],
      });
    } catch (err: any) { showErrorAlert('Upload Failed', err.message); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const fn = `${activeChat.id}/voice-${Date.now()}.webm`;
        const { error } = await supabase.storage.from('oh_chat_attachments').upload(fn, blob, { contentType: 'audio/webm' });
        if (!error) {
          const { data: ud } = supabase.storage.from('oh_chat_attachments').getPublicUrl(fn);
          await supabase.from('oh_chat_messages').insert({
            chat_id: activeChat.id, sender_role: 'customer', sender_name: name,
            attachments: [{ url: ud.publicUrl, name: 'Voice Note', type: 'voice' }],
          });
        }
      };
      rec.start();
      setMediaRecorder(rec);
      setIsRecording(true);
    } catch { showErrorAlert('Permission Denied', 'Microphone access required.'); }
  };

  const stopRecording = () => { if (mediaRecorder && isRecording) { mediaRecorder.stop(); setIsRecording(false); } };

  const submitFeedback = async () => {
    if (!activeChat || !starRating) return;
    await supabase.from('oh_chats').update({ rating: starRating, rating_comment: comment, status: 'resolved' }).eq('id', activeChat.id);
    setActiveScreen('feedback-done');
    setTimeout(() => { setActiveScreen('welcome'); setActiveChat(null); setMessages([]); setStarRating(0); setComment(''); }, 2500);
  };

  const handleAISend = (text: string) => {
    if (!text.trim()) return;
    setAiBotMessages(prev => [...prev, { id: `u-${Date.now()}`, sender: 'user', text, timestamp: new Date() }]);
    setAiInput('');
    setAiTyping(true);
    setTimeout(() => {
      setAiTyping(false);
      const t = text.toLowerCase();
      let reply = '';
      if (t.includes('delivery') || t.includes('ডেলিভারি'))
        reply = 'ঢাকায় ৬০ টাকা, ঢাকার বাইরে ১২০ টাকা। ৯৯৯+ টাকার অর্ডারে ফ্রি ডেলিভারি!';
      else if (t.includes('payment') || t.includes('পেমেন্ট') || t.includes('বিকাশ'))
        reply = 'আমরা Cash on Delivery, bKash এবং Rocket পেমেন্ট সাপোর্ট করি।';
      else if (t.includes('order') || t.includes('অর্ডার') || t.includes('track'))
        reply = 'অর্ডার ট্র্যাক করতে "Order [নম্বর]" লিখুন অথবা লাইভ চ্যাটে এজেন্টের সাথে কথা বলুন।';
      else
        reply = 'ধন্যবাদ! আমাদের লাইভ চ্যাটে আরও সাহায্য পাবেন। "লাইভ চ্যাট" সিলেক্ট করুন।';
      setAiBotMessages(prev => [...prev, { id: `b-${Date.now()}`, sender: 'bot', text: reply, timestamp: new Date() }]);
    }, 900);
  };

  const getMessengerUrl = () => {
    if (!facebookUrl) return 'https://m.me';
    try { const u = new URL(facebookUrl); return `https://m.me/${u.pathname.replace(/^\/|\/$/g, '')}`; } catch { return facebookUrl; }
  };
  const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('হ্যালো! আমি Origin Haat থেকে সাহায্য চাই।')}`;

  const quickReplies = [
    { bn: '🚚 ডেলিভারি চার্জ', en: '🚚 Delivery Info' },
    { bn: '💳 পেমেন্ট পদ্ধতি', en: '💳 Payment Methods' },
    { bn: '📦 অর্ডার ট্র্যাক', en: '📦 Track Order' },
  ];

  // Screen title helper
  const screenTitle = () => {
    if (activeScreen === 'welcome') return lang === 'bn' ? 'Origin Haat Support' : 'Origin Haat Support';
    if (activeScreen === 'menu') return lang === 'bn' ? 'সাপোর্ট হাব' : 'Support Hub';
    if (activeScreen === 'live-onboard') return lang === 'bn' ? 'লাইভ চ্যাট' : 'Live Chat';
    if (activeScreen === 'live-thread') return lang === 'bn' ? 'কাস্টমার কেয়ার' : 'Customer Care';
    if (activeScreen === 'ai-bot') return lang === 'bn' ? 'AI অ্যাসিস্ট্যান্ট' : 'AI Assistant';
    if (activeScreen === 'end-session') return lang === 'bn' ? 'চ্যাট রেটিং' : 'Rate Session';
    return 'Origin Haat';
  };

  const canGoBack = ['menu', 'live-onboard', 'ai-bot', 'end-session'].includes(activeScreen) ||
    (activeScreen === 'live-thread' && !!activeChat);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end select-none" style={{ fontFamily: "'Inter', 'Noto Sans Bengali', sans-serif" }}>

      {/* ── CHAT POPUP CARD ── */}
      {isOpen && (
        <div
          className="mb-3 bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{
            width: 'min(360px, calc(100vw - 24px))',
            height: 'min(580px, calc(100dvh - 100px))',
          }}
        >

          {/* ── HEADER ── */}
          <div
            className="shrink-0 px-4 py-3.5 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%)' }}
          >
            <div className="flex items-center gap-2.5">
              {canGoBack && activeScreen !== 'feedback-done' && (
                <button
                  onClick={() => setActiveScreen(activeScreen === 'live-thread' ? 'menu' : activeScreen === 'live-onboard' ? 'menu' : activeScreen === 'ai-bot' ? 'menu' : activeScreen === 'end-session' ? 'live-thread' : 'menu')}
                  className="text-white/80 hover:text-white w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/15 transition-colors cursor-pointer shrink-0"
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              {/* Avatar on header */}
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Bot size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-white text-sm leading-none truncate">{screenTitle()}</h4>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                  <span className="text-white/75 text-[10px] font-semibold">Online • সর্বদা সহায়তায়</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setLang(l => l === 'bn' ? 'en' : 'bn')}
                className="bg-white/15 hover:bg-white/25 text-white text-[10px] font-black px-2 py-1 rounded-lg cursor-pointer transition-colors"
              >
                {lang === 'bn' ? 'EN' : 'বাং'}
              </button>
              <button
                onClick={() => { setIsOpen(false); setUnreadCount(0); }}
                className="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── SCREENS ── */}
          <div className="flex-1 overflow-hidden flex flex-col bg-[#faf9f8]">

            {/* ━━ SCREEN: WELCOME ━━ */}
            {activeScreen === 'welcome' && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <BubbleDots />
                {/* Large robot illustration */}
                <div className="mb-5 drop-shadow-md">
                  <RobotAvatar size={96} />
                </div>
                <h3 className="font-extrabold text-gray-900 text-lg text-center leading-snug">
                  {lang === 'bn' ? 'স্বাগতম! 👋' : 'Welcome! 👋'}
                </h3>
                <p className="text-gray-500 text-xs text-center mt-1.5 leading-relaxed max-w-[220px]">
                  {lang === 'bn'
                    ? 'Origin Haat-এ আপনাকে স্বাগতম। আমরা সবসময় আপনার সেবায় প্রস্তুত।'
                    : 'Welcome to Origin Haat. We\'re here to help you anytime.'}
                </p>
                <button
                  onClick={() => setActiveScreen('menu')}
                  className="mt-6 w-full max-w-[240px] py-3 rounded-2xl text-white font-extrabold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8c5a)' }}
                >
                  {lang === 'bn' ? 'সাপোর্ট শুরু করুন' : 'Start Support Chat'}
                </button>
                <p className="text-[10px] text-gray-400 mt-3 font-semibold">
                  {lang === 'bn' ? 'সাধারণত ৫ মিনিটের মধ্যে রেসপন্স' : 'Usually responds within 5 minutes'}
                </p>
              </div>
            )}

            {/* ━━ SCREEN: MENU ━━ */}
            {activeScreen === 'menu' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                <div className="text-center pb-1">
                  <p className="text-[11px] text-gray-400 font-semibold">
                    {lang === 'bn' ? 'একটি সাপোর্ট চ্যানেল বেছে নিন' : 'Choose a support channel'}
                  </p>
                </div>

                {/* Live Chat */}
                <button
                  onClick={() => activeChat ? setActiveScreen('live-thread') : setActiveScreen('live-onboard')}
                  className="w-full flex items-center gap-3.5 p-3.5 bg-white hover:bg-orange-50 border border-gray-100 hover:border-[#ff6b35]/30 rounded-2xl shadow-xs transition-all cursor-pointer group active:scale-[.98] text-left"
                >
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#ff6b35,#ff8c5a)' }}>
                    <MessageSquare size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-extrabold text-gray-800 text-xs">{lang === 'bn' ? 'লাইভ কাস্টমার সাপোর্ট' : 'Live Customer Support'}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{lang === 'bn' ? 'এজেন্টের সাথে সরাসরি চ্যাট করুন' : 'Chat directly with our team'}</p>
                  </div>
                  <ChevronRight size={15} className="text-gray-300 group-hover:text-[#ff6b35] shrink-0 transition-colors" />
                </button>

                {/* AI Bot */}
                <button
                  onClick={() => setActiveScreen('ai-bot')}
                  className="w-full flex items-center gap-3.5 p-3.5 bg-white hover:bg-violet-50 border border-gray-100 hover:border-violet-200 rounded-2xl shadow-xs transition-all cursor-pointer group active:scale-[.98] text-left"
                >
                  <div className="w-11 h-11 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
                    <Bot size={20} className="text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-extrabold text-gray-800 text-xs flex items-center gap-1">
                      {lang === 'bn' ? 'AI অ্যাসিস্ট্যান্ট' : 'AI Assistant'}
                      <Sparkles size={10} className="text-amber-500 animate-pulse" />
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{lang === 'bn' ? '২৪/৭ ইনস্ট্যান্ট অটো সাপোর্ট' : '24/7 automated instant support'}</p>
                  </div>
                  <ChevronRight size={15} className="text-gray-300 group-hover:text-violet-500 shrink-0 transition-colors" />
                </button>

                {/* WhatsApp */}
                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center gap-3.5 p-3.5 bg-white hover:bg-green-50 border border-gray-100 hover:border-green-200 rounded-2xl shadow-xs transition-all cursor-pointer group active:scale-[.98] text-left">
                  <div className="w-11 h-11 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#25D366]">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-extrabold text-gray-800 text-xs">{lang === 'bn' ? 'হোয়াটসঅ্যাপ সাপোর্ট' : 'WhatsApp Support'}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{lang === 'bn' ? 'সরাসরি হোয়াটসঅ্যাপে মেসেজ দিন' : 'Message us directly on WhatsApp'}</p>
                  </div>
                  <ChevronRight size={15} className="text-gray-300 group-hover:text-green-500 shrink-0 transition-colors" />
                </a>

                {/* Messenger */}
                <a href={getMessengerUrl()} target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center gap-3.5 p-3.5 bg-white hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-2xl shadow-xs transition-all cursor-pointer group active:scale-[.98] text-left">
                  <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#006AFF]">
                      <path d="M12 2C6.48 2 2 6.14 2 11.25c0 2.91 1.45 5.51 3.75 7.18.2.14.32.37.32.61l.01 2.2c0 .48.53.79.96.57l2.45-1.28c.2-.1.43-.13.65-.07 1.22.35 2.52.54 3.86.54 5.52 0 10-4.14 10-9.25S17.52 2 12 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-extrabold text-gray-800 text-xs">{lang === 'bn' ? 'ফেসবুক মেসেঞ্জার' : 'Facebook Messenger'}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{lang === 'bn' ? 'মেসেঞ্জারে যোগাযোগ করুন' : 'Connect via Facebook Messenger'}</p>
                  </div>
                  <ChevronRight size={15} className="text-gray-300 group-hover:text-blue-500 shrink-0 transition-colors" />
                </a>

                {/* Footer hint */}
                <div className="text-center pt-1">
                  <p className="text-[10px] text-gray-300 font-semibold">Powered by Origin Haat Support</p>
                </div>
              </div>
            )}

            {/* ━━ SCREEN: ONBOARD ━━ */}
            {activeScreen === 'live-onboard' && (
              <div className="flex-1 overflow-y-auto flex flex-col">
                {/* Illustration top */}
                <div className="flex flex-col items-center pt-6 pb-4 px-5 bg-[#fff7f4]">
                  <RobotAvatar size={72} />
                  <h3 className="font-extrabold text-gray-900 text-sm mt-3 text-center">
                    {lang === 'bn' ? 'চ্যাট শুরু করতে তথ্য দিন' : 'Tell us a bit about you'}
                  </h3>
                  <p className="text-[11px] text-gray-400 text-center mt-1">
                    {lang === 'bn' ? 'নিচের ফর্মটি পূরণ করুন' : 'Fill the form to continue'}
                  </p>
                </div>

                <form onSubmit={handleOnboard} className="p-5 space-y-3.5 flex-1">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                      {lang === 'bn' ? 'আপনার নাম *' : 'Your Name *'}
                    </label>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)}
                      placeholder={lang === 'bn' ? 'নাম লিখুন' : 'Enter your name'}
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff6b35] text-gray-800 bg-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                      {lang === 'bn' ? 'মোবাইল নাম্বার *' : 'Mobile Number *'}
                    </label>
                    <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff6b35] text-gray-800 bg-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                      {lang === 'bn' ? 'ডিপার্টমেন্ট' : 'Department'}
                    </label>
                    <select value={department} onChange={e => setDepartment(e.target.value)}
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff6b35] text-gray-800 bg-white cursor-pointer">
                      <option value="Sales">Sales Support (বিক্রয়)</option>
                      <option value="Support">General Support (সাধারণ)</option>
                      <option value="Payment">Payment / Delivery</option>
                      <option value="Refund">Return & Refund (রিটার্ন)</option>
                      <option value="Technical">Technical Help</option>
                    </select>
                  </div>
                  <button type="submit"
                    className="w-full py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-md transition-all active:scale-95 cursor-pointer mt-2"
                    style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8c5a)' }}>
                    {lang === 'bn' ? '💬 চ্যাট শুরু করুন' : '💬 Start Chat'}
                  </button>
                </form>
              </div>
            )}

            {/* ━━ SCREEN: LIVE THREAD ━━ */}
            {activeScreen === 'live-thread' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Agent status bar */}
                <div className="bg-white px-4 py-2.5 border-b border-gray-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#ff6b35] flex items-center justify-center">
                      <Bot size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-gray-800">Origin Haat Support</p>
                      <p className="text-[9px] text-emerald-500 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        {lang === 'bn' ? 'অনলাইন' : 'Online Now'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveScreen('end-session')}
                    className="text-[10px] text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors"
                  >
                    {lang === 'bn' ? 'শেষ করুন' : 'End Chat'}
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#faf9f8]">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-6">
                      <RobotAvatar size={60} />
                      <p className="text-xs text-gray-400 font-semibold mt-2">
                        {lang === 'bn' ? 'এজেন্ট শীঘ্রই কানেক্ট হবেন...' : 'An agent will connect shortly...'}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:.2s]" />
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:.4s]" />
                      </div>
                    </div>
                  )}

                  {messages.map((m) => {
                    const isMe     = m.sender_role === 'customer';
                    const isSystem = m.sender_role === 'system';

                    if (isSystem) return (
                      <div key={m.id} className="flex justify-center">
                        <span className="text-[9px] bg-gray-100 text-gray-400 font-semibold px-3 py-1 rounded-full border border-gray-200">{m.body}</span>
                      </div>
                    );

                    return (
                      <div key={m.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isMe && (
                          <div className="w-6 h-6 rounded-full bg-[#ff6b35] flex items-center justify-center shrink-0">
                            <Bot size={12} className="text-white" />
                          </div>
                        )}
                        <div className={`max-w-[72%] space-y-0.5`}>
                          <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed font-medium shadow-xs ${
                            isMe
                              ? 'text-white rounded-br-sm'
                              : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                          }`}
                            style={isMe ? { background: 'linear-gradient(135deg,#ff6b35,#ff8c5a)' } : {}}
                          >
                            {m.body && <p className="whitespace-pre-line">{m.body}</p>}
                            {m.attachments?.length > 0 && m.attachments.map((f: any, i: number) => (
                              <div key={i} className="flex items-center gap-1.5 mt-1.5 bg-black/10 px-2 py-1 rounded-xl text-[10px]">
                                <Paperclip size={10} />
                                <a href={f.url} target="_blank" rel="noreferrer" className="underline truncate">{f.name}</a>
                              </div>
                            ))}
                          </div>
                          <p className={`text-[9px] text-gray-300 font-semibold px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick suggestions */}
                {messages.length <= 1 && (
                  <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto shrink-0 bg-[#faf9f8]">
                    {quickReplies.map((q, i) => (
                      <button key={i} onClick={() => setMessageInput(lang === 'bn' ? q.bn : q.en)}
                        className="px-2.5 py-1.5 bg-white border border-gray-200 hover:border-[#ff6b35] text-gray-600 hover:text-[#ff6b35] text-[10px] font-bold rounded-xl shrink-0 transition-all cursor-pointer">
                        {lang === 'bn' ? q.bn : q.en}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <form onSubmit={handleSendMessage} className="bg-white border-t border-gray-100 px-3 py-2.5 flex items-center gap-2 shrink-0">
                  <label className="p-1.5 text-gray-400 hover:text-[#ff6b35] cursor-pointer shrink-0 transition-colors">
                    <Paperclip size={17} />
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <button type="button"
                    onMouseDown={startRecording} onMouseUp={stopRecording}
                    onTouchStart={startRecording} onTouchEnd={stopRecording}
                    className={`p-1.5 shrink-0 rounded-lg cursor-pointer transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-[#ff6b35]'}`}>
                    <Mic size={17} />
                  </button>
                  <input type="text" value={messageInput} onChange={e => setMessageInput(e.target.value)}
                    placeholder={lang === 'bn' ? 'বার্তা লিখুন...' : 'Type a message...'}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#ff6b35] text-gray-800" />
                  <button type="submit"
                    className="w-8 h-8 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-sm cursor-pointer active:scale-90 transition-all"
                    style={{ background: 'linear-gradient(135deg,#ff6b35,#ff8c5a)' }}>
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}

            {/* ━━ SCREEN: AI BOT ━━ */}
            {activeScreen === 'ai-bot' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Bot avatar banner */}
                <div className="flex items-center gap-3 px-4 py-3 bg-[#fff7f4] border-b border-orange-100 shrink-0">
                  <RobotAvatar size={40} />
                  <div>
                    <p className="font-extrabold text-gray-800 text-xs">Origin Haat AI Bot</p>
                    <p className="text-[9px] text-emerald-500 font-bold">{lang === 'bn' ? 'সর্বদা অনলাইন' : 'Always Online'}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#faf9f8]">
                  {aiBotMessages.map((msg) => (
                    <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {msg.sender === 'bot' && (
                        <div className="w-6 h-6 rounded-full bg-[#ff6b35] flex items-center justify-center shrink-0">
                          <Bot size={12} className="text-white" />
                        </div>
                      )}
                      <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed font-medium shadow-xs ${
                        msg.sender === 'user'
                          ? 'text-white rounded-br-sm'
                          : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                      }`}
                        style={msg.sender === 'user' ? { background: 'linear-gradient(135deg,#ff6b35,#ff8c5a)' } : {}}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {aiTyping && (
                    <div className="flex items-end gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#ff6b35] flex items-center justify-center shrink-0">
                        <Bot size={12} className="text-white" />
                      </div>
                      <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-xs">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:.2s]" />
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:.4s]" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={botMessagesEndRef} />
                </div>

                {/* Quick chips */}
                <div className="flex gap-1.5 px-3 pb-2 pt-1.5 overflow-x-auto shrink-0 bg-[#faf9f8]">
                  {quickReplies.map((q, i) => (
                    <button key={i} onClick={() => handleAISend(lang === 'bn' ? q.bn : q.en)}
                      className="px-2.5 py-1.5 bg-white border border-gray-200 hover:border-[#ff6b35] text-gray-600 hover:text-[#ff6b35] text-[10px] font-bold rounded-xl shrink-0 transition-all cursor-pointer whitespace-nowrap">
                      {lang === 'bn' ? q.bn : q.en}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <form onSubmit={e => { e.preventDefault(); handleAISend(aiInput); }}
                  className="bg-white border-t border-gray-100 px-3 py-2.5 flex items-center gap-2 shrink-0">
                  <input type="text" value={aiInput} onChange={e => setAiInput(e.target.value)}
                    placeholder={lang === 'bn' ? 'প্রশ্ন করুন...' : 'Ask anything...'}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#ff6b35] text-gray-800" />
                  <button type="submit" disabled={!aiInput.trim()}
                    className="w-8 h-8 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-sm cursor-pointer active:scale-90 transition-all disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#ff6b35,#ff8c5a)' }}>
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}

            {/* ━━ SCREEN: END SESSION (Rating) ━━ */}
            {activeScreen === 'end-session' && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
                {/* End session robot */}
                <div className="relative">
                  <RobotAvatar size={80} />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                    <X size={12} className="text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">
                    {lang === 'bn' ? 'চ্যাট সেশন শেষ করুন' : 'End Session'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {lang === 'bn' ? 'আমাদের সার্ভিস কেমন লেগেছে? রেটিং দিন' : 'Rate your experience before ending'}
                  </p>
                </div>

                {/* Star rating */}
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setStarRating(star)}
                      className={`transition-all cursor-pointer ${starRating >= star ? 'scale-110' : 'scale-100'}`}>
                      <Star
                        size={28}
                        className={starRating >= star ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
                      />
                    </button>
                  ))}
                </div>

                <textarea value={comment} onChange={e => setComment(e.target.value)}
                  placeholder={lang === 'bn' ? 'মতামত লিখুন (ঐচ্ছিক)...' : 'Leave a comment (optional)...'}
                  className="w-full border border-gray-200 rounded-2xl p-3 text-xs focus:outline-none focus:border-[#ff6b35] h-20 resize-none text-gray-700 bg-white" />

                <div className="flex gap-2.5 w-full">
                  <button onClick={() => setActiveScreen('live-thread')}
                    className="flex-1 py-3 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 font-bold text-xs rounded-2xl cursor-pointer transition-all">
                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button onClick={submitFeedback} disabled={!starRating}
                    className="flex-1 py-3 text-white font-extrabold text-xs rounded-2xl shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#ff6b35,#ff8c5a)' }}>
                    {lang === 'bn' ? 'সাবমিট' : 'Submit'}
                  </button>
                </div>
              </div>
            )}

            {/* ━━ SCREEN: FEEDBACK DONE ━━ */}
            {activeScreen === 'feedback-done' && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check size={32} className="text-emerald-500" />
                </div>
                <h3 className="font-extrabold text-gray-900 text-base">
                  {lang === 'bn' ? 'ধন্যবাদ!' : 'Thank You!'}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {lang === 'bn' ? 'আপনার মূল্যবান মতামতের জন্য ধন্যবাদ। শীঘ্রই আবার আসুন!' : 'Thanks for your feedback. See you again soon!'}
                </p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── FLOATING BUTTON ── */}
      <button
        onClick={() => { setIsOpen(!isOpen); setUnreadCount(0); }}
        aria-label="Chat Support"
        className="relative w-14 h-14 rounded-full text-white flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #ff6b35, #ff8c5a)' }}
      >
        {/* Pulse ring */}
        {!isOpen && <span className="absolute inset-0 rounded-full bg-[#ff6b35] animate-ping opacity-25" />}

        {/* Unread badge */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow">
            {unreadCount}
          </span>
        )}

        {isOpen ? <X size={22} className="drop-shadow" /> : <MessageCircle size={24} className="drop-shadow" />}
      </button>
    </div>
  );
}

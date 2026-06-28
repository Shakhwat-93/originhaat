'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  MessageCircle, X, Send, Paperclip, Smile, Mic, 
  ChevronRight, Volume2, Search, Check, CheckCheck, ThumbsUp, ThumbsDown,
  ChevronLeft, Bot, MessageSquare, Sparkles
} from 'lucide-react';
import { formatBDTNumeric } from '@/lib/utils';
import { showSuccessAlert, showErrorAlert } from '@/lib/alerts';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatWidgetProps {
  whatsappNumber: string;
}

interface BotMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export function ChatWidget({ whatsappNumber }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'menu' | 'live-onboard' | 'live-thread' | 'ai-bot' | 'feedback'>('menu');
  
  // Visitor Info & Settings
  const [visitorId, setVisitorId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Support');
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  const [facebookUrl, setFacebookUrl] = useState('');
  
  // Live Chat Session states
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [visitorMeta, setVisitorMeta] = useState<any>(null);
  
  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  
  // Feedback
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  // AI Chatbot states (Migrated from WhatsAppButton)
  const [aiBotMessages, setAiBotMessages] = useState<BotMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'আসসালামু আলাইকুম! আমি Origin Haat এর এআই অ্যাসিস্ট্যান্ট। আমি আপনাকে কীভাবে সাহায্য করতে পারি? নিচের যেকোনো একটি প্রশ্ন সিলেক্ট করতে পারেন:',
      timestamp: new Date(),
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const botMessagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch social settings and visitor info
  useEffect(() => {
    // Generate or fetch visitor ID from localStorage
    let storedId = localStorage.getItem('oh_visitor_id');
    if (!storedId) {
      storedId = 'visitor_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('oh_visitor_id', storedId);
    }
    setVisitorId(storedId);

    // Fetch visitor IP/Geo details
    fetch('/api/ip-info')
      .then(res => res.json())
      .then(data => setVisitorMeta(data))
      .catch(err => console.error(err));

    // Fetch facebook url
    supabase.from('oh_settings').select('facebook_url').eq('id', 1).single()
      .then(({ data }) => {
        if (data?.facebook_url) setFacebookUrl(data.facebook_url);
      });

    // Check if previously onboarded
    const savedName = localStorage.getItem('oh_visitor_name');
    const savedPhone = localStorage.getItem('oh_visitor_phone');
    if (savedName && savedPhone) {
      setName(savedName);
      setPhone(savedPhone);
      reconnectPreviousChat(storedId);
    }
  }, []);

  // Scroll logic
  useEffect(() => {
    if (activeScreen === 'live-thread') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (activeScreen === 'ai-bot') {
      botMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, aiBotMessages, activeScreen]);

  // Subscribe to real-time agent messages
  useEffect(() => {
    if (!activeChat) return;

    const channel = supabase
      .channel(`chat-customer-${activeChat.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'oh_chat_messages', filter: `chat_id=eq.${activeChat.id}` },
        (payload) => {
          const newMsg = payload.new;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'oh_chat_messages', filter: `chat_id=eq.${activeChat.id}` },
        (payload) => {
          const updatedMsg = payload.new;
          setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat]);

  const reconnectPreviousChat = async (vId: string) => {
    const { data: previousChats } = await supabase
      .from('oh_chats')
      .select('*')
      .eq('visitor_id', vId)
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (previousChats && previousChats.length > 0) {
      const activeSes = previousChats[0];
      setActiveChat(activeSes);
      loadMessages(activeSes.id);
    }
  };

  const loadMessages = async (chatId: string) => {
    const { data } = await supabase
      .from('oh_chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
  };

  // Onboard visitor
  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    localStorage.setItem('oh_visitor_name', name);
    localStorage.setItem('oh_visitor_phone', phone);

    // Create chat session in database
    const { data: newChat, error } = await supabase
      .from('oh_chats')
      .insert({
        visitor_id: visitorId,
        customer_name: name,
        customer_phone: phone,
        department: department,
        status: 'pending',
        ip: visitorMeta?.ip || null,
        country: visitorMeta?.country || null,
        city: visitorMeta?.city || null,
        device: visitorMeta?.device || null,
        browser: visitorMeta?.browser || null,
        os: visitorMeta?.os || null,
        landing_page: window.location.origin + window.location.pathname,
        current_page: window.location.pathname,
        session_duration: 0,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      showErrorAlert('Error', 'Failed to connect support. Please try again.');
      return;
    }

    if (newChat) {
      setActiveChat(newChat);
      await supabase.from('oh_chat_messages').insert({
        chat_id: newChat.id,
        sender_role: 'system',
        sender_name: 'System',
        body: `Joined conversation in "${department}" department.`,
      });
      loadMessages(newChat.id);
      setActiveScreen('live-thread');
    }
  };

  // Send standard message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !activeChat) return;

    const body = messageInput;
    setMessageInput('');

    await supabase.from('oh_chat_messages').insert({
      chat_id: activeChat.id,
      sender_role: 'customer',
      sender_name: name,
      body: body,
    });

    if (body.toLowerCase().startsWith('order ') || body.toLowerCase().includes('অর্ডার ট্র্যাকিং')) {
      const match = body.match(/\d+/);
      const orderId = match ? match[0] : '';
      simulateOrderTrackingBot(orderId);
    }
  };

  // Geolocation Order Tracking chatbot
  const simulateOrderTrackingBot = async (orderId: string) => {
    if (!orderId) {
      setTimeout(async () => {
        await supabase.from('oh_chat_messages').insert({
          chat_id: activeChat.id,
          sender_role: 'system',
          sender_name: 'Chatbot',
          body: 'দয়া করে "Order [Order-Number]" ফরম্যাটে লিখুন। উদাহরণস্বরূপঃ Order 1782354',
        });
      }, 1000);
      return;
    }

    const { data: order } = await supabase
      .from('oh_orders')
      .select('*')
      .or(`order_number.eq.${orderId},id.like.%${orderId}%`)
      .limit(1);

    setTimeout(async () => {
      if (order && order.length > 0) {
        const ord = order[0];
        await supabase.from('oh_chat_messages').insert({
          chat_id: activeChat.id,
          sender_role: 'system',
          sender_name: 'Chatbot',
          body: `🤖 অর্ডার ট্র্যাকিং আপডেটঃ\n\n📌 অর্ডার আইডিঃ ${ord.order_number || ord.id.substring(0, 8)}\n👤 কাস্টমারঃ ${ord.customer_name}\n📦 স্ট্যাটাসঃ ${ord.status || 'অপেক্ষমান'}\n💰 মোট বিলঃ ${formatBDTNumeric(ord.total_price)}`,
        });
      } else {
        await supabase.from('oh_chat_messages').insert({
          chat_id: activeChat.id,
          sender_role: 'system',
          sender_name: 'Chatbot',
          body: `❌ দুঃখিত, অর্ডার আইডি "${orderId}" দিয়ে কোনো অর্ডার পাওয়া যায়নি। দয়া করে সঠিক আইডি প্রদান করুন।`,
        });
      }
    }, 1200);
  };

  // Upload attachment file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${activeChat.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('oh_chat_attachments')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('oh_chat_attachments')
        .getPublicUrl(fileName);

      const fileType = file.type.startsWith('image/') 
        ? 'image' 
        : file.type.startsWith('video/') 
        ? 'video' 
        : file.type.startsWith('audio/') 
        ? 'voice' 
        : 'pdf';

      await supabase.from('oh_chat_messages').insert({
        chat_id: activeChat.id,
        sender_role: 'customer',
        sender_name: name,
        attachments: [{ url: urlData.publicUrl, name: file.name, type: fileType }],
      });

    } catch (err: any) {
      console.error(err);
      showErrorAlert('Upload Failed', 'Unable to upload your attachment file.');
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const fileName = `${activeChat.id}/voice-${Date.now()}.webm`;
        const { data, error } = await supabase.storage
          .from('oh_chat_attachments')
          .upload(fileName, audioBlob, { contentType: 'audio/webm' });

        if (!error) {
          const { data: urlData } = supabase.storage
            .from('oh_chat_attachments')
            .getPublicUrl(fileName);

          await supabase.from('oh_chat_messages').insert({
            chat_id: activeChat.id,
            sender_role: 'customer',
            sender_name: name,
            attachments: [{ url: urlData.publicUrl, name: 'Voice Note.webm', type: 'voice' }],
          });
        }
      };

      setAudioChunks([]);
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Recording permission failed:', err);
      showErrorAlert('Permission Denied', 'Please grant microphone access to record voice notes.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Submit Feedback Rating
  const submitFeedback = async () => {
    if (!activeChat || rating === null) return;

    await supabase
      .from('oh_chats')
      .update({
        rating: rating,
        rating_comment: comment,
        status: 'resolved'
      })
      .eq('id', activeChat.id);

    showSuccessAlert('ধন্যবাদ!', 'আপনার মূল্যবান মতামত সাবমিট করার জন্য ধন্যবাদ।');
    setActiveScreen('menu');
    setActiveChat(null);
    setMessages([]);
    setRating(null);
    setComment('');
  };

  // --- AI Chatbot Helpers (WhatsAppButton port) ---
  const handleSendAiMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: BotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    setAiBotMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setAiTyping(true);

    setTimeout(() => {
      setAiTyping(false);
      let replyText = '';
      const cleanText = text.toLowerCase();

      if (cleanText.includes('ডেলিভারি') || cleanText.includes('delivery') || cleanText.includes('সময়') || cleanText.includes('খরচ')) {
        replyText = 'Origin Haat-এ ডেলিভারি চার্জ ঢাকায় ৬০ টাকা এবং ঢাকার বাইরে ১২০ টাকা। ঢাকায় আমরা ২৪ ঘণ্টার মধ্যে এবং ঢাকার বাইরে ২-৩ দিনের মধ্যে ডেলিভারি সম্পন্ন করে থাকি। এছাড়া ৯৯৯ টাকা বা তার বেশি অর্ডারে ডেলিভারি চার্জ সম্পূর্ণ ফ্রি!';
      } else if (cleanText.includes('পেমেন্ট') || cleanText.includes('টাকা') || cleanText.includes('payment') || cleanText.includes('বিকাশ')) {
        replyText = 'আমরা মূলত ক্যাশ অন ডেলিভারি (Cash on Delivery) সুবিধা দিয়ে থাকি। অর্থাৎ প্রোডাক্ট হাতে পেয়ে, দেখে তারপর মূল্য পরিশোধ করবেন। এছাড়া আপনি চাইলে বিকাশ বা রকেটেও পেমেন্ট করতে পারেন।';
      } else if (cleanText.includes('ট্র্যাক') || cleanText.includes('অবস্থা') || cleanText.includes('track') || cleanText.includes('অর্ডার')) {
        replyText = 'আপনার অর্ডারের বর্তমান অবস্থা জানতে আমাদের চ্যাট হাবের "লাইভ কাস্টমার চ্যাট" অপশনে গিয়ে সরাসরি সাহায্য চাইতে পারেন অথবা অর্ডার ট্র্যাক মেনুতে অর্ডার নম্বর দিতে পারেন।';
      } else if (cleanText.includes('যোগাযোগ') || cleanText.includes('ফোন') || cleanText.includes('নাম্বার') || cleanText.includes('কাস্টমার')) {
        replyText = `আমাদের কাস্টমার রিপ্রেজেন্টেティブের সাথে সরাসরি কথা বলতে চ্যাট হাবের "WhatsApp চ্যাট" বাটনে ক্লিক করুন অথবা সরাসরি লাইভ চ্যাটে নক দিন।`;
      } else {
        replyText = 'ধন্যবাদ আপনার মেসেজের জন্য! আমাদের কাস্টমার রিপ্রেজেন্টেティブ খুব শীঘ্রই লাইভ চ্যাটে রেসপন্স করবেন। যেকোনো তথ্যের জন্য সরাসরি হোয়াটসঅ্যাপেও যোগাযোগ করতে পারেন।';
      }

      const botMsg: BotMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: replyText,
        timestamp: new Date(),
      };
      setAiBotMessages(prev => [...prev, botMsg]);
    }, 1000);
  };

  const getMessengerUrl = () => {
    if (!facebookUrl) return 'https://m.me';
    try {
      const url = new URL(facebookUrl);
      const path = url.pathname.replace(/^\/|\/$/g, '');
      if (path) return `https://m.me/${path}`;
    } catch (e) {}
    return facebookUrl || 'https://m.me';
  };

  const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('হ্যালো! আমি Origin Haat থেকে কাস্টমার সাপোর্ট চাই।')}`;

  const quickReplies = [
    { text: '🚚 ডেলিভারি চার্জ ও সময়', value: 'ডেলিভারি চার্জ ও সময় কত?' },
    { text: '💳 পেমেন্ট পদ্ধতি', value: 'পেমেন্ট কীভাবে করব?' },
    { text: '📦 অর্ডার ট্র্যাক করার নিয়ম', value: 'অর্ডার কীভাবে ট্র্যাক করব?' },
    { text: '📞 সাপোর্ট এজেন্টের নাম্বার', value: 'যোগাযোগের মোবাইল নাম্বার কত?' },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans text-black flex flex-col items-end">
      
      {/* 1. Support Hub Popup Box */}
      {isOpen && (
        <div className="bg-white w-80 md:w-96 h-[500px] rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden mb-4 transition-all duration-300">
          
          {/* Header */}
          <div className="bg-[#ff6b35] text-white p-4 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2">
              {activeScreen !== 'menu' && (
                <button 
                  onClick={() => setActiveScreen('menu')}
                  className="text-white hover:text-orange-100 mr-1.5"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
              <div>
                <h4 className="font-bold text-sm">
                  {activeScreen === 'menu' && 'Origin Haat Support Hub'}
                  {activeScreen === 'live-onboard' && 'লাইভ চ্যাট অনবোর্ডিং'}
                  {activeScreen === 'live-thread' && 'কাস্টমার কেয়ার চ্যাট'}
                  {activeScreen === 'ai-bot' && 'AI অ্যাসিস্ট্যান্ট বট'}
                  {activeScreen === 'feedback' && 'ফিডব্যাক ও রেটিং'}
                </h4>
                <p className="text-[10px] opacity-90">আমরা সর্বদা সহায়তায় আছি</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setLang(l => l === 'bn' ? 'en' : 'bn')}
                className="bg-black/10 hover:bg-black/20 px-2 py-0.5 rounded text-[10px] font-bold"
              >
                {lang === 'bn' ? 'EN' : 'বাং'}
              </button>
              <button onClick={() => setIsOpen(false)} className="text-white hover:text-orange-100">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Screen Routing */}
          <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">
            
            {/* SCREEN 1: SUPPORT MENU */}
            {activeScreen === 'menu' && (
              <div className="p-5 flex-1 flex flex-col justify-center space-y-4">
                <div className="text-center space-y-1.5 mb-2">
                  <h3 className="font-black text-gray-800 text-base">
                    {lang === 'bn' ? 'কীভাবে আমরা আপনাকে সাহায্য করতে পারি?' : 'How can we help you today?'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {lang === 'bn' ? 'যেকোনো একটি সাপোর্ট চ্যানেল নির্বাচন করুন' : 'Select a support channel to proceed'}
                  </p>
                </div>

                <div className="space-y-2.5">
                  {/* Option A: Live Chat */}
                  <button
                    onClick={() => {
                      if (activeChat) {
                        setActiveScreen('live-thread');
                      } else {
                        setActiveScreen('live-onboard');
                      }
                    }}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-orange-50/50 border border-gray-100 hover:border-orange-200 rounded-2xl shadow-xs transition-all active:scale-98 text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 bg-orange-100 text-[#ff6b35] rounded-xl flex items-center justify-center font-bold">
                        <MessageSquare size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-gray-800">
                          {lang === 'bn' ? 'লাইভ কাস্টমার সাপোর্ট চ্যাট' : 'Live Agent Support'}
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {lang === 'bn' ? 'আমাদের এজেন্টের সাথে সরাসরি চ্যাট করুন' : 'Chat directly with our support team'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-[#ff6b35] transition-colors" />
                  </button>

                  {/* Option B: WhatsApp */}
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-green-50/50 border border-gray-100 hover:border-green-200 rounded-2xl shadow-xs transition-all active:scale-98 text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 bg-green-100 text-[#25D366] rounded-xl flex items-center justify-center font-bold">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-gray-800">
                          {lang === 'bn' ? 'হোয়াটসঅ্যাপ চ্যাট সাপোর্ট' : 'WhatsApp Support'}
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {lang === 'bn' ? 'সরাসরি হোয়াটসঅ্যাপে টেক্সট দিন' : 'Open WhatsApp conversation instantly'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-[#25D366] transition-colors" />
                  </a>

                  {/* Option C: Messenger */}
                  <a
                    href={getMessengerUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-blue-50/50 border border-gray-100 hover:border-blue-200 rounded-2xl shadow-xs transition-all active:scale-98 text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 bg-blue-100 text-[#006AFF] rounded-xl flex items-center justify-center font-bold">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                          <path d="M12 2C6.48 2 2 6.14 2 11.25c0 2.91 1.45 5.51 3.75 7.18.2.14.32.37.32.61l.01 2.2c0 .48.53.79.96.57l2.45-1.28c.2-.1.43-.13.65-.07 1.22.35 2.52.54 3.86.54 5.52 0 10-4.14 10-9.25S17.52 2 12 2zm1.09 11.45l-1.89-2.02-3.69 2.02c-.38.21-.83-.2-.68-.6l2.03-3.69-1.89-2.02c-.28-.3-.07-.79.33-.79l3.69.01 1.89 2.02 3.69-2.02c.38-.21.83.2.68.6l-2.03 3.69 1.89 2.02c.28.3.07.79-.33.79l-3.69-.01z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-gray-800">
                          {lang === 'bn' ? 'ফেসবুক মেসেঞ্জার চ্যাট' : 'Messenger Chat'}
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {lang === 'bn' ? 'মেসেঞ্জারে সরাসরি যোগাযোগ করুন' : 'Connect via Facebook Messenger'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-[#006AFF] transition-colors" />
                  </a>

                  {/* Option D: AI Chatbot */}
                  <button
                    onClick={() => setActiveScreen('ai-bot')}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-violet-50/50 border border-gray-100 hover:border-violet-200 rounded-2xl shadow-xs transition-all active:scale-98 text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center font-bold">
                        <Bot size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-gray-800 flex items-center gap-1">
                          {lang === 'bn' ? 'এআই কাস্টমার অ্যাসিস্ট্যান্ট' : 'AI Support Assistant'}
                          <Sparkles size={11} className="text-amber-500 animate-pulse" />
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {lang === 'bn' ? '২৪/৭ ইনস্ট্যান্ট অটোমেটেড সাপোর্ট' : 'Automated instant help available 24/7'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-violet-600 transition-colors" />
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN 2: LIVE CHAT ONBOARDING */}
            {activeScreen === 'live-onboard' && (
              <form onSubmit={handleOnboard} className="p-6 space-y-4 my-auto">
                <div className="text-center space-y-1 mb-4">
                  <h3 className="font-bold text-gray-800 text-sm">
                    {lang === 'bn' ? 'আমাদের সাথে সরাসরি চ্যাট করুন' : 'Chat Live with Us'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {lang === 'bn' ? 'শুরু করতে নিচের তথ্যগুলো পূরণ করুন' : 'Fill details below to start chating'}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">
                    {lang === 'bn' ? 'আপনার নাম *' : 'Your Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="নাম লিখুন"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#ff6b35] text-black bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">
                    {lang === 'bn' ? 'মোবাইল নাম্বার *' : 'Mobile Number *'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="০১৭XXXXXXXX"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#ff6b35] text-black bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">
                    {lang === 'bn' ? 'ডিপার্টমেন্ট সিলেক্ট করুন' : 'Select Department'}
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#ff6b35] text-black bg-white cursor-pointer"
                  >
                    <option value="Sales">Sales Support (বিক্রয় সহায়তা)</option>
                    <option value="Support">General Support (সাধারণ জিজ্ঞাসা)</option>
                    <option value="Payment">Payment / Delivery (পেমেন্ট/ডেলিভারি)</option>
                    <option value="Refund">Return & Refund (রিটার্ন ও এক্সচেঞ্জ)</option>
                    <option value="Technical">Technical Help (টেকনিক্যাল সাপোর্ট)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#ff6b35] hover:bg-[#e55520] text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer mt-4"
                >
                  {lang === 'bn' ? 'চ্যাট শুরু করুন' : 'Start Conversation'}
                </button>
              </form>
            )}

            {/* SCREEN 3: LIVE CHAT MESSAGING THREAD */}
            {activeScreen === 'live-thread' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((m) => {
                    const isCustomer = m.sender_role === 'customer';
                    const isSystem = m.sender_role === 'system';

                    if (isSystem) {
                      return (
                        <div key={m.id} className="flex justify-center my-1.5">
                          <span className="text-[10px] bg-gray-200 text-gray-500 font-semibold px-3 py-0.5 rounded-full text-center whitespace-pre-line leading-relaxed">
                            {m.body}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={m.id} className={`flex gap-2 max-w-[80%] ${isCustomer ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                        <div className="space-y-0.5">
                          <div className={`p-3 rounded-2xl text-xs ${
                            isCustomer 
                              ? 'bg-[#ff6b35] text-white rounded-tr-none shadow-sm' 
                              : 'bg-white text-gray-800 border border-gray-200/50 shadow-sm rounded-tl-none'
                          }`}>
                            {m.body && <p className="leading-relaxed whitespace-pre-line">{m.body}</p>}
                            {m.attachments && m.attachments.length > 0 && (
                              <div className="space-y-1.5 mt-1.5">
                                {m.attachments.map((file: any, idx: number) => (
                                  <div key={idx} className="border border-gray-200/10 p-1.5 rounded-xl bg-black/5 flex items-center gap-1.5">
                                    <Volume2 size={12} />
                                    <a href={file.url} target="_blank" rel="noreferrer" className="underline truncate max-w-[120px] block">
                                      {file.name}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick replies for chatbot simulations */}
                {messages.length <= 2 && (
                  <div className="p-3 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto shrink-0 select-none">
                    {[
                      { bn: '🔍 অর্ডার ট্র্যাক করুন', en: '🔍 Track Order' },
                      { bn: '🚚 Delivery চার্জ কত?', en: '🚚 Delivery Info' },
                      { bn: '🤝 এজেন্টের সাথে চ্যাট', en: '🤝 Agent Chat' }
                    ].map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const val = lang === 'bn' ? opt.bn : opt.en;
                          setMessageInput(val);
                        }}
                        className="px-3 py-1.5 bg-gray-50 border border-gray-100 hover:bg-orange-50 hover:border-orange-200 text-[#ff6b35] text-[10px] font-bold rounded-xl shrink-0 transition-all cursor-pointer"
                      >
                        {lang === 'bn' ? opt.bn : opt.en}
                      </button>
                    ))}
                  </div>
                )}

                {/* Entry form */}
                <form onSubmit={handleSendMessage} className="border-t border-gray-100 bg-white p-3 flex items-center gap-2 shrink-0">
                  <label className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer shrink-0">
                    <Paperclip size={18} />
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>

                  <button
                    type="button"
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={`p-2 rounded-lg shrink-0 cursor-pointer transition-all ${
                      isRecording ? 'bg-red-500 text-white animate-ping' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Mic size={18} />
                  </button>

                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={lang === 'bn' ? 'বার্তা লিখুন...' : 'Type a message...'}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#ff6b35] text-black bg-white"
                  />

                  {messages.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setActiveScreen('feedback')}
                      className="p-2 text-gray-400 hover:text-red-500 shrink-0 cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  )}

                  <button
                    type="submit"
                    className="p-2.5 bg-[#ff6b35] hover:bg-[#e55520] text-white rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}

            {/* SCREEN 4: AI CHATBOT (WhatsAppButton Port) */}
            {activeScreen === 'ai-bot' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                  {aiBotMessages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'bot' && (
                        <div className="w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center shrink-0">
                          <Bot size={13} />
                        </div>
                      )}
                      <div className="max-w-[75%]">
                        <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          msg.sender === 'user'
                            ? 'bg-[#ff6b35] text-white rounded-tr-none'
                            : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  ))}

                  {aiTyping && (
                    <div className="flex items-end gap-2 justify-start">
                      <div className="w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center shrink-0 animate-pulse">
                        <Bot size={13} />
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
                  <div ref={botMessagesEndRef} />
                </div>

                {/* Quick replies */}
                <div className="px-3 py-2 border-t border-slate-100 bg-white flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                  {quickReplies.map((qr, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendAiMessage(qr.value)}
                      className="inline-block border border-slate-200 hover:border-[#ff6b35] hover:text-[#ff6b35] text-slate-600 text-[10px] font-semibold px-2.5 py-1.5 rounded-full transition-colors cursor-pointer bg-slate-50"
                    >
                      {qr.text}
                    </button>
                  ))}
                </div>

                {/* Send AI chat form */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAiMessage(aiInput);
                  }}
                  className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="প্রশ্নটি এখানে লিখুন..."
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:border-[#ff6b35] focus:outline-none text-black bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!aiInput.trim()}
                    className="w-8 h-8 bg-[#ff6b35] hover:bg-[#e55520] disabled:bg-slate-200 text-white rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-sm cursor-pointer"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}

            {/* SCREEN 5: FEEDBACK & RATING */}
            {activeScreen === 'feedback' && (
              <div className="p-6 space-y-4 my-auto text-center">
                <h3 className="font-bold text-gray-800 text-sm">
                  {lang === 'bn' ? 'আমাদের চ্যাট সাপোর্ট কেমন লেগেছে?' : 'How was your support experience?'}
                </h3>
                <p className="text-xs text-gray-400">
                  {lang === 'bn' ? 'আপনার রেটিংটি চ্যাট সম্পন্ন করতে সাহায্য করবে' : 'Your feedback will close this chat'}
                </p>

                <div className="flex justify-center gap-4 py-2">
                  <button
                    onClick={() => setRating(5)}
                    className={`p-3 border rounded-2xl transition-all ${
                      rating === 5 ? 'bg-orange-100 border-[#ff6b35] text-[#ff6b35]' : 'bg-white border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <ThumbsUp size={28} />
                    <span className="block text-[10px] font-bold mt-1">Excellent</span>
                  </button>

                  <button
                    onClick={() => setRating(1)}
                    className={`p-3 border rounded-2xl transition-all ${
                      rating === 1 ? 'bg-red-50 border-red-500 text-red-500' : 'bg-white border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <ThumbsDown size={28} />
                    <span className="block text-[10px] font-bold mt-1">Bad</span>
                  </button>
                </div>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={lang === 'bn' ? 'মতামত লিখুন (ঐচ্ছিক)' : 'Feedback comment (optional)'}
                  className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-[#ff6b35] h-20 text-black bg-white"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveScreen('live-thread')}
                    className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 font-semibold text-xs py-2.5 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitFeedback}
                    className="flex-1 bg-[#ff6b35] hover:bg-[#e55520] text-white font-bold text-xs py-2.5 rounded-xl shadow-md cursor-pointer"
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 2. Unified orange bubble button with glow ring effect */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#ff6b35] hover:bg-[#e55520] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#ff6b35]/30 transition-all hover:scale-105 active:scale-95 cursor-pointer relative"
        aria-label="চ্যাট করুন"
      >
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
            >
              <MessageCircle size={26} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}

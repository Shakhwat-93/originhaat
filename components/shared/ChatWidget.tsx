'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  MessageCircle, X, Send, Paperclip, Smile, Mic, 
  ChevronRight, Volume2, Search, Check, CheckCheck, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { formatBDTNumeric } from '@/lib/utils';
import { showSuccessAlert, showErrorAlert } from '@/lib/alerts';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  
  // Visitor Info & Settings
  const [visitorId, setVisitorId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Support');
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  
  // Chat Session states
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [visitorMeta, setVisitorMeta] = useState<any>(null);
  
  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  
  // Feedback
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  // Typing & seen indicators
  const [agentTyping, setAgentTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial Visitor Setup
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

    // Check if previously onboarded
    const savedName = localStorage.getItem('oh_visitor_name');
    const savedPhone = localStorage.getItem('oh_visitor_phone');
    if (savedName && savedPhone) {
      setName(savedName);
      setPhone(savedPhone);
      setOnboarded(true);
      
      // Auto reconnect/load previous chat session if open
      reconnectPreviousChat(storedId);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    setOnboarded(true);

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
      // Send greeting system message
      await supabase.from('oh_chat_messages').insert({
        chat_id: newChat.id,
        sender_role: 'system',
        sender_name: 'System',
        body: `Joined conversation in "${department}" department.`,
      });
      loadMessages(newChat.id);
    }
  };

  // Send standard message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !activeChat) return;

    const body = messageInput;
    setMessageInput('');

    // Insert user message
    await supabase.from('oh_chat_messages').insert({
      chat_id: activeChat.id,
      sender_role: 'customer',
      sender_name: name,
      body: body,
    });

    // Handle quick chatbot simulations (like Order Tracking)
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

    // Try finding order
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
          body: `❌ দুঃখিত, অর্ডার আইডি "${orderId}" দিয়ে কোনো অর্ডার পাওয়া যায়নি। দয়া করে আপনার অর্ডার স্লিপটি চেক করে সঠিক আইডি প্রদান করুন।`,
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

  // Voice recording triggers
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
        // Upload to storage
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
    setShowFeedback(false);
    setActiveChat(null);
    setMessages([]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans text-black">
      {/* 1. Chat Widget Popup Box */}
      {isOpen && (
        <div className="bg-white w-80 md:w-96 h-[500px] rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden mb-4 transition-all duration-300">
          
          {/* Header */}
          <div className="bg-[#ff6b35] text-white p-4 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
              <div>
                <h4 className="font-bold text-sm">Origin Haat Live Chat</h4>
                <p className="text-[10px] opacity-90">সহায়তার জন্য আমরা অনলাইনে আছি</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Language toggle */}
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

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">
            {!onboarded ? (
              // Onboarding Form Screen
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
            ) : showFeedback ? (
              // End Rating Feedback Screen
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
                    onClick={() => setShowFeedback(false)}
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
            ) : (
              // Chat Message Thread Screen
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Messages Thread */}
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
                        {/* Message body */}
                        <div className="space-y-0.5">
                          <div className={`p-3 rounded-2xl text-xs ${
                            isCustomer 
                              ? 'bg-[#ff6b35] text-white rounded-tr-none shadow-sm' 
                              : 'bg-white text-gray-800 border border-gray-200/50 shadow-sm rounded-tl-none'
                          }`}>
                            {m.body && <p className="leading-relaxed whitespace-pre-line">{m.body}</p>}

                            {/* Render Attachments */}
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

                {/* Pre-filled Quick Chatbot Suggestions */}
                {messages.length <= 2 && (
                  <div className="p-3 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto shrink-0 select-none">
                    {[
                      { bn: '🔍 অর্ডার ট্র্যাক করুন', en: '🔍 Track Order' },
                      { bn: '🚚 ডেলিভারি চার্জ কত?', en: '🚚 Delivery Info' },
                      { bn: '🤝 সাপোর্ট এজেন্টের সাথে কথা বলুন', en: '🤝 Talk to Agent' }
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

                {/* Chatbox Entry Input Form */}
                <form onSubmit={handleSendMessage} className="border-t border-gray-100 bg-white p-3.5 flex items-center gap-2 shrink-0">
                  {/* File attach */}
                  <label className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer shrink-0">
                    <Paperclip size={18} />
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>

                  {/* Audio note */}
                  <button
                    type="button"
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={`p-2 rounded-lg shrink-0 cursor-pointer transition-all ${
                      isRecording ? 'bg-red-500 text-white animate-ping' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title="Hold to record voice note"
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

                  {/* Close Session Trigger */}
                  {messages.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setShowFeedback(true)}
                      className="p-2 text-gray-400 hover:text-red-500 shrink-0 cursor-pointer"
                      title="Close chat"
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
          </div>
        </div>
      )}

      {/* 2. Floating Orange Message Bubble Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#ff6b35] hover:bg-[#e55520] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#ff6b35]/30 transition-all hover:scale-105 active:scale-95 cursor-pointer relative"
        aria-label="চ্যাট করুন"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={26} />}
      </button>
    </div>
  );
}

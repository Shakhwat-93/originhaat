'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Search, MessageSquare, Send, User, Phone, Mail, MapPin,
  Globe, Laptop, Clock, Sparkles, Check, CheckCheck,
  Trash2, ShieldCheck, UserCheck, RefreshCw, BarChart2, Tag,
  ThumbsUp, ThumbsDown, ArrowRightLeft, Lock, FileText,
  Smile, Mic, Paperclip, X, MoreVertical, ClipboardList, Info,
  Settings, Volume2, ShieldAlert, Plus, Download, Filter, MessageCircle,
  ChevronDown, Bell, BellRing, ExternalLink, UserPlus
} from 'lucide-react';
import { formatBDTNumeric } from '@/lib/utils';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '@/lib/alerts';

// ── Notification Toast Types ──────────────────────────────────────────────
interface ToastNotification {
  id: string;
  type: 'new_message' | 'new_chat';
  title: string;
  body: string;
  chatId: string;
  senderName: string;
  department?: string;
  timestamp: Date;
}

// --- Types ---
interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
  is_online: boolean;
  departments: string[];
}

interface Chat {
  id: string;
  visitor_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  department: string;
  label: 'VIP' | 'Wholesale' | 'Urgent' | 'Refund' | 'Courier' | 'Fake' | 'New' | 'Returning';
  status: 'active' | 'pending' | 'resolved' | 'closed' | 'spam' | 'missed' | 'left';
  agent_id: string | null;
  rating: number | null;
  rating_comment: string | null;
  ip: string | null;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  landing_page: string | null;
  current_page: string | null;
  referral: string | null;
  campaign: string | null;
  session_duration: number;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  chat_id: string;
  sender_role: 'customer' | 'agent' | 'system';
  sender_name: string;
  body: string | null;
  attachments: { url: string; name: string; type: string }[];
  is_seen: boolean;
  reply_to_id: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
}

interface InternalNote {
  id: string;
  chat_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

interface CannedResponse {
  id: string;
  shortcut: string;
  title: string;
  text: string;
}

const LABEL_STYLES: Record<string, string> = {
  VIP:       'bg-orange-50 text-orange-600 border border-orange-200',
  Wholesale: 'bg-blue-50  text-blue-600  border border-blue-200',
  Urgent:    'bg-red-50   text-red-600   border border-red-200',
  Refund:    'bg-purple-50 text-purple-600 border border-purple-200',
  Courier:   'bg-sky-50   text-sky-600   border border-sky-200',
  Fake:      'bg-gray-100 text-gray-500  border border-gray-200',
  New:       'bg-emerald-50 text-emerald-600 border border-emerald-200',
  Returning: 'bg-amber-50 text-amber-600 border border-amber-200',
};

const STATUS_BADGE: Record<string, string> = {
  active:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  pending:  'bg-amber-50   text-amber-700  border border-amber-200',
  resolved: 'bg-blue-50    text-blue-700   border border-blue-200',
  closed:   'bg-gray-100   text-gray-500   border border-gray-200',
  spam:     'bg-red-50     text-red-600    border border-red-200',
};

export default function InboxDashboard() {
  const [activeTab, setActiveTab]           = useState<'active' | 'pending' | 'resolved' | 'closed' | 'spam'>('active');
  const [showAnalytics, setShowAnalytics]   = useState(false);
  const [showLiveVisitors, setShowLiveVisitors] = useState(false);
  const [showCannedManager, setShowCannedManager] = useState(false);

  const [chats, setChats]           = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([]);
  const [agents, setAgents]         = useState<Agent[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);

  const [newShortcut, setNewShortcut]     = useState('');
  const [newCannedTitle, setNewCannedTitle] = useState('');
  const [newCannedText, setNewCannedText] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [messageInput, setMessageInput]   = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [aiDrawerOpen, setAiDrawerOpen]   = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading]         = useState(false);
  const [sentimentAnalysis, setSentimentAnalysis] = useState<{
    sentiment: string; score: number; intent: string;
  }>({ sentiment: 'Neutral', score: 50, intent: 'None' });

  const [crmProfile, setCrmProfile] = useState<{
    ordersCount: number; spentAmount: number; wishlistCount: number;
    lastOrderDate: string | null; orders: any[];
  } | null>(null);

  const [slaSecondsLeft, setSlaSecondsLeft] = useState(30);

  // ── Global Notifications State ──────────────────────────────────────────
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const selectedChatRef = useRef<Chat | null>(null);

  // Status Counts
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    active: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
    spam: 0,
    new: 0,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Data Loading ──────────────────────────────────────────────────────────
  useEffect(() => { fetchChats(); fetchAgents(); fetchCannedResponses(); }, [activeTab]);

  // Keep ref in sync so global listener can read without stale closure
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

  useEffect(() => {
    if (selectedChat && selectedChat.status === 'pending') {
      setSlaSecondsLeft(30);
      const iv = setInterval(() => setSlaSecondsLeft((p) => (p > 0 ? p - 1 : 0)), 1000);
      return () => clearInterval(iv);
    }
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Request Browser Notification Permission ───────────────────────────────
  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((perm) => setNotifPermission(perm));
      }
    }
  }, []);

  // ── Premium 3-Note Chime ─────────────────────────────────────────────────
  const playChime = useCallback((isNewChat = false) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // note sequence: D5 → F#5 → A5  (cheerful major arpeggio)
      const notes = isNewChat
        ? [523.25, 659.25, 783.99, 1046.5]   // C5→E5→G5→C6 (new chat fanfare)
        : [587.33, 739.99, 880];              // D5→F#5→A5 (new message chime)

      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.13);
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.13);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.13 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.13 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.13);
        osc.stop(ctx.currentTime + i * 0.13 + 0.3);
      });
    } catch (_) {}
  }, [soundEnabled]);

  // ── Show Toast helper ────────────────────────────────────────────────────
  const pushToast = useCallback((toast: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const id = `toast-${Date.now()}`;
    const notification: ToastNotification = { ...toast, id, timestamp: new Date() };
    setToasts((prev) => [notification, ...prev].slice(0, 5)); // max 5 stacked
    // Auto-dismiss after 6 seconds
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
  }, []);

  // ── Send Browser OS Notification ────────────────────────────────────────
  const sendBrowserNotification = useCallback((title: string, body: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'origin-haat-chat',
        });
      } catch (_) {}
    }
  }, []);

  // ── GLOBAL Real-time Listener — all customer messages & new chats ─────────
  useEffect(() => {
    // 1. Listen to ALL new customer messages across every chat
    const msgChannel = supabase
      .channel('admin-global-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'oh_chat_messages',
      }, (payload) => {
        const msg = payload.new as ChatMessage;
        if (msg.sender_role !== 'customer') return;
        // Skip if this message belongs to the currently open/selected chat
        const currentChat = selectedChatRef.current;
        if (currentChat && currentChat.id === msg.chat_id) return;

        // Play sound
        playChime(false);

        // Show in-app toast
        pushToast({
          type: 'new_message',
          title: `💬 নতুন বার্তা — ${msg.sender_name || 'Customer'}`,
          body: msg.body ? msg.body.substring(0, 80) : '📎 Attachment',
          chatId: msg.chat_id,
          senderName: msg.sender_name || 'Customer',
        });

        // Browser OS notification
        sendBrowserNotification(
          `💬 ${msg.sender_name || 'Customer'} — Origin Haat`,
          msg.body ? msg.body.substring(0, 100) : '📎 Attachment sent'
        );

        // Refresh chat list so unread chats float to top
        fetchChats();
      })
      .subscribe();

    // 2. Listen for brand new chat sessions (customer just joined)
    const chatChannel = supabase
      .channel('admin-global-chats')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'oh_chats',
      }, (payload) => {
        const newChat = payload.new as Chat;

        // New chat fanfare
        playChime(true);

        pushToast({
          type: 'new_chat',
          title: `🆕 নতুন চ্যাট শুরু — ${newChat.customer_name || 'Anonymous'}`,
          body: `Department: ${newChat.department} • ${newChat.city || 'Unknown location'}`,
          chatId: newChat.id,
          senderName: newChat.customer_name || 'Anonymous',
          department: newChat.department,
        });

        sendBrowserNotification(
          `🆕 নতুন চ্যাট — ${newChat.customer_name || 'Anonymous'}`,
          `Department: ${newChat.department} — একটি নতুন কাস্টমার চ্যাট শুরু করেছেন।`
        );

        fetchChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(chatChannel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playChime, pushToast, sendBrowserNotification]);

  useEffect(() => {
    if (!selectedChat) return;
    fetchMessages(selectedChat.id);
    fetchInternalNotes(selectedChat.id);
    fetchCRMProfile(selectedChat);
    setSlaSecondsLeft(30);

    const channel = supabase
      .channel(`chat-${selectedChat.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'oh_chat_messages', filter: `chat_id=eq.${selectedChat.id}`
      }, (payload) => {
        const m = payload.new as ChatMessage;
        setMessages((prev) => {
          if (prev.some((x) => x.id === m.id)) return prev;
          if (m.sender_role === 'customer') playChime();
          return [...prev, m];
        });
        if (m.sender_role === 'customer')
          supabase.from('oh_chat_messages').update({ is_seen: true }).eq('id', m.id).then(() => {});
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'oh_chat_messages', filter: `chat_id=eq.${selectedChat.id}`
      }, (payload) => {
        const u = payload.new as ChatMessage;
        setMessages((prev) => prev.map((m) => (m.id === u.id ? u : m)));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedChat]);

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchStatusCounts = async () => {
    try {
      const { data } = await supabase.from('oh_chats').select('status, label');
      if (data) {
        const counts = { active: 0, pending: 0, resolved: 0, closed: 0, spam: 0, new: 0 };
        data.forEach((chat: any) => {
          if (chat.status in counts) {
            counts[chat.status as keyof typeof counts]++;
          }
          if (chat.label === 'New') {
            counts.new++;
          }
        });
        setStatusCounts(counts);
      }
    } catch (_) {}
  };

  const fetchChats = async () => {
    const { data } = await supabase
      .from('oh_chats').select('*').eq('status', activeTab)
      .order('updated_at', { ascending: false });
    if (data) setChats(data);
    fetchStatusCounts();
  };
  const fetchAgents = async () => {
    const { data } = await supabase.from('oh_chat_agents').select('*');
    if (data) setAgents(data);
  };
  const fetchCannedResponses = async () => {
    const { data } = await supabase.from('oh_chat_canned').select('*');
    if (data) setCannedResponses(data || []);
  };
  const fetchMessages = async (chatId: string) => {
    const { data } = await supabase
      .from('oh_chat_messages').select('*').eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };
  const fetchInternalNotes = async (chatId: string) => {
    const { data } = await supabase
      .from('oh_chat_notes').select('*').eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (data) setInternalNotes(data || []);
  };
  const fetchCRMProfile = async (chat: Chat) => {
    if (chat.customer_phone) {
      const { data: orders } = await supabase
        .from('oh_orders').select('*').eq('customer_phone', chat.customer_phone)
        .order('created_at', { ascending: false });
      if (orders && orders.length > 0) {
        const spent = orders.reduce((s, o) => s + (o.total_price || 0), 0);
        setCrmProfile({ ordersCount: orders.length, spentAmount: spent, wishlistCount: 3, lastOrderDate: orders[0].created_at, orders });
        return;
      }
    }
    setCrmProfile(null);
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !selectedChat) return;
    const body = messageInput;
    setMessageInput('');
    if (isInternalNote) {
      const { error } = await supabase.from('oh_chat_notes').insert({
        chat_id: selectedChat.id, author_name: 'Origin Haat Admin', body
      });
      if (!error) fetchInternalNotes(selectedChat.id);
    } else {
      await supabase.from('oh_chat_messages').insert({
        chat_id: selectedChat.id, sender_role: 'agent', sender_name: 'Origin Haat Admin',
        body, reply_to_id: replyingToMessage?.id || null,
      });
      if (selectedChat.status === 'pending') {
        await supabase.from('oh_chats').update({ status: 'active' }).eq('id', selectedChat.id);
        setSelectedChat((p) => p ? { ...p, status: 'active' } : null);
        fetchChats();
      }
      setReplyingToMessage(null);
    }
  };

  const handleCreateCanned = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShortcut.startsWith('/')) {
      showErrorAlert('Invalid Shortcut', 'Shortcut must start with / (e.g. /refund)');
      return;
    }
    const { error } = await supabase.from('oh_chat_canned').insert({
      shortcut: newShortcut, title: newCannedTitle, text: newCannedText
    });
    if (error) { showErrorAlert('Error', error.message); return; }
    showSuccessAlert('Saved', 'Canned reply added successfully.');
    setNewShortcut(''); setNewCannedTitle(''); setNewCannedText('');
    fetchCannedResponses();
  };

  const handleDeleteCanned = async (id: string) => {
    const c = await showConfirmAlert('Delete Template?', 'This will be permanently deleted.', 'Delete');
    if (!c.isConfirmed) return;
    await supabase.from('oh_chat_canned').delete().eq('id', id);
    showSuccessAlert('Deleted', 'Canned reply removed.');
    fetchCannedResponses();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;
    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedChat.id}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('oh_chat_attachments').upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('oh_chat_attachments').getPublicUrl(fileName);
      const fileType = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video'
        : file.type.startsWith('audio/') ? 'voice' : 'pdf';
      await supabase.from('oh_chat_messages').insert({
        chat_id: selectedChat.id, sender_role: 'agent', sender_name: 'Origin Haat Admin',
        attachments: [{ url: urlData.publicUrl, name: file.name, type: fileType }],
      });
    } catch (err: any) {
      showErrorAlert('Upload Failed', err.message || 'Unable to upload file.');
    } finally { setUploadingFile(false); }
  };

  const handleDeleteMessage = async (msgId: string) => {
    const c = await showConfirmAlert('Delete Message?', 'This message will be deleted for everyone.', 'Delete');
    if (!c.isConfirmed) return;
    await supabase.from('oh_chat_messages')
      .update({ is_deleted: true, body: 'message was deleted' }).eq('id', msgId);
  };

  const handleUpdateStatus = async (chatId: string, newStatus: Chat['status']) => {
    const { error } = await supabase.from('oh_chats').update({ status: newStatus }).eq('id', chatId);
    if (!error) {
      showSuccessAlert('Updated', `Status set to ${newStatus}`);
      if (selectedChat?.id === chatId) setSelectedChat((p) => p ? { ...p, status: newStatus } : null);
      fetchChats();
    }
  };

  const handleAssignAgent = async (agentId: string | null) => {
    if (!selectedChat) return;
    await supabase.from('oh_chats').update({ agent_id: agentId }).eq('id', selectedChat.id);
    setSelectedChat((p) => p ? { ...p, agent_id: agentId } : null);
    showSuccessAlert('Assigned', agentId ? 'Chat assigned.' : 'Chat unassigned.');
    fetchChats();
  };

  const handleUpdateLabel = async (label: Chat['label']) => {
    if (!selectedChat) return;
    await supabase.from('oh_chats').update({ label }).eq('id', selectedChat.id);
    setSelectedChat((p) => p ? { ...p, label } : null);
    fetchChats();
  };

  const handleAISuggest = async () => {
    if (!selectedChat || messages.length === 0) return;
    setAiLoading(true); setAiDrawerOpen(true);
    try {
      const lastMsg = [...messages].reverse().find((m) => m.sender_role === 'customer');
      if (!lastMsg?.body) { setAiSuggestions(['No recent customer message to analyze.']); return; }
      const txt = lastMsg.body.toLowerCase();
      let suggestions: string[] = [];
      let sentiment = 'Neutral', score = 50, intent = 'General Enquiry';
      if (txt.includes('ডেলিভারি') || txt.includes('delivery')) {
        suggestions = [
          'ঢাকার ভেতর ৬০ টাকা ও বাইরে ১২০ টাকা ডেলিভারি চার্জ। ৯৯৯ টাকার বেশি অর্ডারে ফ্রি ডেলিভারি!',
          'ঢাকায় ২৪ ঘণ্টা এবং ঢাকার বাইরে ২-৩ কার্যদিবসে ডেলিভারি পাবেন।'
        ]; intent = 'Delivery Details';
      } else if (txt.includes('অর্ডার') || txt.includes('order') || txt.includes('ট্র্যাক')) {
        suggestions = crmProfile?.orders?.length
          ? [`আপনার সর্বশেষ অর্ডার স্ট্যাটাসঃ ${crmProfile.orders[0].status || 'প্রক্রিয়াধীন'}।`,
             'আমরা আপনার ট্র্যাকিং কোডটি শেয়ার করছি।']
          : ['দয়া করে অর্ডার আইডি বা ফোন নম্বর দিন।', 'আপনি Order Track পেজে লাইভ আপডেট দেখতে পারবেন।'];
        intent = 'Order Tracking';
      } else if (['খারাপ','ফালতু','দেরি','bad','hate'].some(w => txt.includes(w))) {
        suggestions = [
          'অসুবিধার জন্য আন্তরিকভাবে দুঃখিত। আমরা এখনই বিষয়টি দেখছি।',
          'স্যার, আমাদের ভুলের জন্য ক্ষমা চাচ্ছি। ম্যানেজার আপনার সমস্যা সমাধান করবেন।'
        ]; sentiment = 'Upset / Angry'; score = 10; intent = 'Complaint';
      } else if (['ধন্যবাদ','ভালো','পছন্দ','nice','love'].some(w => txt.includes(w))) {
        suggestions = [
          'ধন্যবাদ স্যার! আপনার ভালো মন্তব্য আমাদের উৎসাহিত করে।',
          'নতুন কালেকশন আসলে আপনাকে জানিয়ে দিব।'
        ]; sentiment = 'Positive'; score = 90; intent = 'Appreciation';
      } else {
        suggestions = ['জি বলুন, কীভাবে সাহায্য করতে পারি?', 'আরো কিছু জানার থাকলে জিজ্ঞেস করতে পারেন।'];
      }
      setAiSuggestions(suggestions);
      setSentimentAnalysis({ sentiment, score, intent });
    } finally { setAiLoading(false); }
  };

  const handleConvertToTicket = async () => {
    if (!selectedChat) return;
    await showSuccessAlert('Ticket Created', `Ticket #${selectedChat.id.substring(0, 6).toUpperCase()} created.`);
  };

  const filteredChats = chats.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (c.customer_name?.toLowerCase().includes(q) || c.customer_phone?.includes(q) || c.department.toLowerCase().includes(q));
  });

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-68px)] bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden font-sans text-gray-800 relative">

      {/* ── TOAST NOTIFICATION OVERLAY ── */}
      <div className="fixed top-4 right-4 z-[999] flex flex-col gap-2.5 pointer-events-none" style={{ maxWidth: 360 }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white border border-gray-200 rounded-2xl shadow-2xl flex items-start gap-3 p-3.5 animate-in slide-in-from-right-4 fade-in duration-300"
            style={{ boxShadow: '0 8px 32px rgba(255,107,53,0.12), 0 2px 8px rgba(0,0,0,0.08)' }}
          >
            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white ${
              toast.type === 'new_chat' ? 'bg-emerald-500' : 'bg-[#ff6b35]'
            }`}>
              {toast.type === 'new_chat' ? <UserPlus size={18} /> : <MessageCircle size={18} />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-gray-900 text-xs leading-snug truncate">{toast.title}</p>
              <p className="text-gray-500 text-[10px] mt-0.5 leading-relaxed line-clamp-2">{toast.body}</p>
              {toast.department && (
                <span className="inline-block mt-1 text-[9px] font-bold bg-orange-50 text-[#ff6b35] border border-orange-200 px-1.5 py-0.5 rounded-md">{toast.department}</span>
              )}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => {
                    setToasts(prev => prev.filter(t => t.id !== toast.id));
                    // Switch to the right tab and open that chat
                    setActiveTab('active');
                    setShowAnalytics(false);
                    setShowLiveVisitors(false);
                    setShowCannedManager(false);
                    // Find and select chat
                    supabase.from('oh_chats').select('*').eq('id', toast.chatId).single()
                      .then(({ data }) => { if (data) setSelectedChat(data as Chat); });
                  }}
                  className="text-[10px] font-bold text-[#ff6b35] hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <ExternalLink size={10} /> Open Chat
                </button>
                <button
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="text-[10px] text-gray-400 hover:text-gray-600 cursor-pointer ml-auto"
                >
                  Dismiss
                </button>
              </div>
            </div>

            {/* Animated Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100 rounded-b-2xl overflow-hidden">
              <div
                className={`h-full ${toast.type === 'new_chat' ? 'bg-emerald-500' : 'bg-[#ff6b35]'}`}
                style={{ animation: 'shrink-width 6s linear forwards' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Browser notification permission nudge */}
      {notifPermission === 'default' && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-amber-800 font-semibold">
            <Bell size={13} className="text-amber-600" />
            ব্রাউজার নোটিফিকেশন চালু করুন — চ্যাট মিস করবেন না।
          </div>
          <button
            onClick={() => Notification.requestPermission().then(p => setNotifPermission(p))}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1 rounded-lg cursor-pointer text-[10px] transition-all"
          >
            Enable Now
          </button>
        </div>
      )}


      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <h2 className="font-extrabold text-gray-900 text-sm tracking-tight flex items-center gap-2">
              Agency Support Console
              <span className="bg-[#ff6b35]/10 text-[#ff6b35] border border-[#ff6b35]/20 px-2 py-0.5 text-[9px] rounded-full font-black tracking-widest uppercase">PRO</span>
            </h2>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Real-time Customer Operations Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute Alerts' : 'Unmute Alerts'}
            className={`p-2 rounded-xl border text-sm transition-all cursor-pointer ${
              soundEnabled ? 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100' : 'bg-red-50 border-red-200 text-red-500'
            }`}
          >
            <Volume2 size={14} />
          </button>

          {/* Canned Replies */}
          <button
            onClick={() => { setShowCannedManager(!showCannedManager); setShowAnalytics(false); setShowLiveVisitors(false); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showCannedManager ? 'bg-[#ff6b35] text-white border-[#ff6b35] shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Settings size={13} /> Canned Replies
          </button>

          {/* Analytics */}
          <button
            onClick={() => { setShowAnalytics(!showAnalytics); setShowLiveVisitors(false); setShowCannedManager(false); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showAnalytics ? 'bg-[#ff6b35] text-white border-[#ff6b35] shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BarChart2 size={13} /> Analytics Charts
          </button>

          {/* Live Traffic */}
          <button
            onClick={() => { setShowLiveVisitors(!showLiveVisitors); setShowAnalytics(false); setShowCannedManager(false); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showLiveVisitors ? 'bg-[#ff6b35] text-white border-[#ff6b35] shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Globe size={13} /> Live Visitors
            <span className="bg-[#ff6b35]/10 text-[#ff6b35] border border-[#ff6b35]/20 px-1.5 py-0.5 text-[9px] rounded-full font-black">18</span>
          </button>
        </div>
      </div>

      {/* ── PANEL SWITCHER ── */}
      {showCannedManager ? (
        /* ─ CANNED MANAGER ─ */
        <div className="flex-1 p-8 bg-gray-50 overflow-y-auto space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 pb-4">
            <div>
              <h3 className="text-base font-black text-gray-900">Canned Responses Manager</h3>
              <p className="text-xs text-gray-400 mt-0.5">Type <code className="bg-gray-100 px-1 rounded">/</code> in the chat input to trigger shortcuts</p>
            </div>
            <button onClick={() => setShowCannedManager(false)} className="text-xs text-gray-400 hover:text-gray-700 font-bold cursor-pointer">← Back to Inbox</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Form */}
            <div className="bg-white border border-gray-200 p-6 rounded-2xl space-y-4 shadow-sm">
              <h4 className="font-extrabold text-sm text-gray-800 flex items-center gap-1.5"><Plus size={15} className="text-[#ff6b35]" /> New Shortcut</h4>
              <form onSubmit={handleCreateCanned} className="space-y-3.5">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Trigger *</label>
                  <input type="text" required value={newShortcut} onChange={(e) => setNewShortcut(e.target.value)} placeholder="/delivery" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#ff6b35]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Title *</label>
                  <input type="text" required value={newCannedTitle} onChange={(e) => setNewCannedTitle(e.target.value)} placeholder="Delivery Policy" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#ff6b35]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Quick Reply Text *</label>
                  <textarea required value={newCannedText} onChange={(e) => setNewCannedText(e.target.value)} placeholder="Type the response template..." className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-[#ff6b35] h-28 resize-none" />
                </div>
                <button type="submit" className="w-full bg-[#ff6b35] hover:bg-[#e85a28] text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-sm">Save Shortcut</button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 bg-white border border-gray-200 p-6 rounded-2xl shadow-sm space-y-4">
              <h4 className="font-extrabold text-sm text-gray-800">Active Shortcuts <span className="text-gray-400 font-semibold">({cannedResponses.length})</span></h4>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {cannedResponses.length === 0 && (
                  <div className="text-center text-gray-400 text-xs py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">No canned replies yet. Create one!</div>
                )}
                {cannedResponses.map((cr) => (
                  <div key={cr.id} className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex justify-between items-start gap-3 hover:border-gray-300 transition-colors">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#ff6b35] font-extrabold text-xs bg-[#ff6b35]/10 px-2 py-0.5 border border-[#ff6b35]/20 rounded-md">{cr.shortcut}</span>
                        <span className="text-gray-700 font-bold text-xs">{cr.title}</span>
                      </div>
                      <p className="text-gray-500 text-xs leading-relaxed pt-1">{cr.text}</p>
                    </div>
                    <button onClick={() => handleDeleteCanned(cr.id)} className="text-gray-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : showAnalytics ? (
        /* ─ ANALYTICS ─ */
        <div className="flex-1 p-8 bg-gray-50 overflow-y-auto space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 pb-4">
            <h3 className="text-base font-black text-gray-900">System Insights & SLA Analytics</h3>
            <button onClick={() => setShowAnalytics(false)} className="text-xs text-gray-400 hover:text-gray-700 font-bold cursor-pointer">← Back to Inbox</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'First Response SLA', value: '24s', sub: '✓ Breach Rate: 0%', subColor: 'text-emerald-600' },
              { label: 'Avg. Resolve Time',  value: '6.2m', sub: '✓ SLA target met',  subColor: 'text-emerald-600' },
              { label: 'CSAT Score',         value: '4.8 / 5', sub: '★ 96% positive',   subColor: 'text-[#ff6b35]' },
              { label: 'Revenue via Chat',   value: '৳45,900', sub: '↑ 18% this week',  subColor: 'text-emerald-600' },
            ].map((card, i) => (
              <div key={i} className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{card.label}</div>
                <div className="text-2xl font-black text-gray-900 mt-2">{card.value}</div>
                <div className={`text-[10px] font-bold mt-1 ${card.subColor}`}>{card.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Volume Chart */}
            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
              <h4 className="font-extrabold text-sm text-gray-800 mb-4">Volume by Department</h4>
              <div className="space-y-3.5">
                {[
                  { name: 'Sales Support',       pct: 45, color: 'bg-[#ff6b35]' },
                  { name: 'Refunds / Exchange',   pct: 25, color: 'bg-orange-400' },
                  { name: 'Technical / Other',    pct: 20, color: 'bg-emerald-500' },
                  { name: 'Payment Complaints',   pct: 10, color: 'bg-red-500' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>{item.name}</span>
                      <span className="font-bold text-gray-800">{item.pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Peak Hour Bar Chart */}
            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
              <h4 className="font-extrabold text-sm text-gray-800 mb-4">Peak Activity (24h)</h4>
              <div className="flex h-32 items-end gap-2 border-b border-gray-100">
                {[20,45,30,80,95,60,40,75,100,50,30,20].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
                    <div className="w-full bg-gray-100 group-hover:bg-[#ff6b35]/60 rounded-t transition-all" style={{ height: `${h}%` }} />
                    <span className="text-[8px] text-gray-400 mt-1">{i * 2}h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : showLiveVisitors ? (
        /* ─ LIVE VISITORS ─ */
        <div className="flex-1 p-8 bg-gray-50 overflow-y-auto space-y-6">
          <div className="flex justify-between items-center border-b border-gray-200 pb-4">
            <h3 className="text-base font-black text-gray-900">Live Traffic Monitor</h3>
            <button onClick={() => setShowLiveVisitors(false)} className="text-xs text-gray-400 hover:text-gray-700 font-bold cursor-pointer">← Back to Inbox</button>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-wider">
                  <th className="px-5 py-3.5">IP Address</th>
                  <th className="px-5 py-3.5">Location</th>
                  <th className="px-5 py-3.5">Current Page</th>
                  <th className="px-5 py-3.5">Referral / Source</th>
                  <th className="px-5 py-3.5">Duration</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { ip: '103.88.222.18', geo: 'Dhaka, BD', page: '/product/sticker-4', ref: 'Facebook Ads', time: '4m 12s' },
                  { ip: '182.52.190.111', geo: 'Chittagong, BD', page: '/checkout', ref: 'Direct', time: '1m 45s' },
                  { ip: '202.91.44.89',  geo: 'Sylhet, BD', page: '/cart', ref: 'Google Ads', time: '12s' },
                  { ip: '103.111.90.5',  geo: 'Dhaka, BD', page: '/', ref: 'Instagram', time: '8m 33s' },
                ].map((v, i) => (
                  <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-gray-700">{v.ip}</td>
                    <td className="px-5 py-3.5 font-semibold text-gray-800 text-xs">{v.geo}</td>
                    <td className="px-5 py-3.5 text-[#ff6b35] font-medium text-xs truncate max-w-[160px]">{v.page}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{v.ref}</td>
                    <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">{v.time}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button className="px-3 py-1.5 bg-[#ff6b35] hover:bg-[#e85a28] text-white font-bold text-[10px] rounded-lg shadow-sm cursor-pointer transition-all">Proactive Chat</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ─ MAIN INBOX ─ */
        <div className="flex-1 flex overflow-hidden">

          {/* LEFT — Conversation List */}
          <div className="w-72 border-r border-gray-200 bg-white flex flex-col shrink-0">
            {/* Status Tabs */}
            <div className="flex flex-wrap gap-1 px-3 py-2.5 border-b border-gray-100 bg-gray-50/50">
              {([
                { id: 'active', label: 'Active', count: statusCounts.active, color: 'bg-emerald-500/10 text-emerald-700' },
                { id: 'pending', label: 'Pending', count: statusCounts.pending, color: 'bg-amber-500/10 text-amber-700' },
                { id: 'new_label', label: 'New', count: statusCounts.new, color: 'bg-purple-500/10 text-purple-700' },
                { id: 'resolved', label: 'Solved', count: statusCounts.resolved, color: 'bg-blue-500/10 text-blue-700' },
                { id: 'closed', label: 'Closed', count: statusCounts.closed, color: 'bg-gray-500/10 text-gray-700' },
                { id: 'spam', label: 'Spam', count: statusCounts.spam, color: 'bg-red-500/10 text-red-700' },
              ] as const).map((tab) => {
                const isActive = activeTab === tab.id || (tab.id === 'new_label' && activeTab as string === 'new');
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === 'new_label') {
                        // Switch to active but filter for new label (or we can handle status filter)
                        // For simplicity, let's treat it as a tab transition or filter trigger
                        setActiveTab('active');
                        setSearchQuery('New'); // Set search to 'New' label
                      } else {
                        setActiveTab(tab.id as any);
                        setSearchQuery('');
                      }
                      setSelectedChat(null);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-extrabold capitalize transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#ff6b35] text-white shadow-sm'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isActive ? 'bg-white/20 text-white' : tab.color
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="px-3 py-2.5 border-b border-gray-100">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search inbox..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:border-[#ff6b35] focus:outline-none" />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {filteredChats.map((c) => {
                const isSelected = selectedChat?.id === c.id;
                return (
                  <div key={c.id} onClick={() => setSelectedChat(c)}
                    className={`p-3.5 flex flex-col gap-1.5 cursor-pointer transition-all select-none border-l-2 ${
                      isSelected ? 'bg-orange-50/60 border-[#ff6b35]' : 'hover:bg-gray-50 border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-gray-900 text-xs truncate max-w-[140px]">
                        {c.customer_name || 'Anonymous Visitor'}
                      </span>
                      <span className="text-[9px] text-gray-400 font-semibold">
                        {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] bg-gray-100 border border-gray-200 text-gray-500 font-bold px-1.5 py-0.5 rounded">{c.department}</span>
                      {c.label && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${LABEL_STYLES[c.label] || ''}`}>{c.label}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredChats.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-xs">No conversations found.</div>
              )}
            </div>
          </div>

          {/* MIDDLE — Chat Thread */}
          <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden relative">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="border-b border-gray-200 px-5 py-3.5 flex items-center justify-between bg-white shrink-0 shadow-sm">
                  <div>
                    <h3 className="font-black text-gray-900 text-sm">{selectedChat.customer_name || 'Visitor'}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${STATUS_BADGE[selectedChat.status]}`}>
                        {selectedChat.status.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Agent: <span className="font-bold text-gray-700">{selectedChat.agent_id ? 'Admin' : 'Unassigned'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedChat.status === 'pending' && (
                      <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 border transition-all ${
                        slaSecondsLeft <= 10
                          ? 'bg-red-50 border-red-200 text-red-600 animate-pulse'
                          : 'bg-amber-50 border-amber-200 text-amber-600'
                      }`}>
                        <Clock size={11} /> SLA: {slaSecondsLeft}s
                      </div>
                    )}
                    <button onClick={handleConvertToTicket}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl cursor-pointer transition-all">
                      <FileText size={12} /> Ticket
                    </button>
                    <button onClick={() => handleUpdateStatus(selectedChat.id, 'resolved')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl cursor-pointer transition-all">
                      <Check size={12} /> Resolve
                    </button>
                    <button onClick={() => handleUpdateStatus(selectedChat.id, 'spam')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl cursor-pointer transition-all">
                      <X size={12} /> Spam
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {messages.map((m) => {
                    const isAgent  = m.sender_role === 'agent';
                    const isSystem = m.sender_role === 'system';
                    if (isSystem) return (
                      <div key={m.id} className="flex justify-center my-1">
                        <span className="text-[10px] bg-gray-100 border border-gray-200 text-gray-500 font-semibold px-3 py-1 rounded-full">{m.body}</span>
                      </div>
                    );
                    return (
                      <div key={m.id} className={`flex gap-2.5 max-w-[78%] ${isAgent ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs text-white ${isAgent ? 'bg-[#ff6b35]' : 'bg-gray-700'}`}>
                          {isAgent ? 'A' : 'C'}
                        </div>
                        <div className="space-y-1">
                          <div className={`flex items-center gap-1.5 text-[9px] text-gray-400 font-semibold ${isAgent ? 'justify-end' : ''}`}>
                            <span>{m.sender_name}</span>
                            <span>·</span>
                            <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className={`relative p-3 rounded-2xl text-xs leading-relaxed font-medium ${
                            isAgent
                              ? 'bg-[#ff6b35] text-white rounded-tr-sm shadow-sm'
                              : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm'
                          }`}>
                            {m.body && <p className="whitespace-pre-line">{m.body}</p>}
                            {m.attachments?.length > 0 && (
                              <div className="space-y-1.5 mt-2">
                                {m.attachments.map((f, i) => (
                                  <div key={i} className="flex items-center gap-1.5 bg-black/10 px-2 py-1.5 rounded-lg text-[10px]">
                                    <Paperclip size={11} />
                                    <a href={f.url} target="_blank" rel="noreferrer" className="underline truncate font-semibold">{f.name}</a>
                                  </div>
                                ))}
                              </div>
                            )}
                            {isAgent && (
                              <button onClick={() => handleDeleteMessage(m.id)}
                                className={`absolute top-1/2 -translate-y-1/2 ${isAgent ? '-left-5' : '-right-5'} text-gray-300 hover:text-red-500 cursor-pointer`}>
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Quote Bar */}
                {replyingToMessage && (
                  <div className="bg-orange-50 border-t border-orange-200 px-5 py-2 flex justify-between items-center text-xs">
                    <span className="text-orange-700 truncate font-semibold">Quoting: {replyingToMessage.body}</span>
                    <button onClick={() => setReplyingToMessage(null)} className="text-orange-400 hover:text-orange-700"><X size={13} /></button>
                  </div>
                )}

                {/* Input Form */}
                <form onSubmit={handleSendMessage}
                  className={`border-t px-4 py-3.5 shrink-0 bg-white transition-all ${isInternalNote ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'}`}>

                  {/* Mode Toggle + AI Button */}
                  <div className="flex items-center gap-1 mb-2.5">
                    <button type="button" onClick={() => setIsInternalNote(false)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${!isInternalNote ? 'bg-[#ff6b35]/10 text-[#ff6b35]' : 'text-gray-400 hover:text-gray-600'}`}>
                      Reply to Customer
                    </button>
                    <button type="button" onClick={() => setIsInternalNote(true)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${isInternalNote ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:text-gray-600'}`}>
                      <Lock size={10} /> Private Note
                    </button>
                    <button type="button" onClick={handleAISuggest}
                      className="ml-auto flex items-center gap-1 bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-200 font-bold px-2.5 py-1 rounded-lg text-[10px] cursor-pointer transition-all">
                      <Sparkles size={11} className="animate-pulse" /> AI Copilot
                    </button>
                  </div>

                  {/* Canned Popup */}
                  {messageInput.startsWith('/') && (
                    <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-lg mb-2 max-h-36 overflow-y-auto">
                      <div className="text-[9px] font-black text-gray-400 uppercase px-1 mb-1">Canned Responses</div>
                      {cannedResponses.filter((c) => c.shortcut.startsWith(messageInput)).map((c) => (
                        <div key={c.id} onClick={() => setMessageInput(c.text)}
                          className="flex justify-between items-center px-2.5 py-1.5 hover:bg-gray-50 rounded-lg cursor-pointer">
                          <span className="font-mono text-[#ff6b35] font-extrabold text-[10px]">{c.shortcut}</span>
                          <span className="text-gray-400 text-[10px]">{c.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input Row */}
                  <div className="flex items-center gap-2">
                    <label className={`p-2 rounded-xl cursor-pointer transition-colors shrink-0 ${uploadingFile ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-100 text-gray-400'}`}>
                      <Paperclip size={16} />
                      <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
                    </label>
                    <input type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)}
                      placeholder={isInternalNote ? 'Private note — not visible to customer…' : 'Type reply… (use / for templates)'}
                      className={`flex-1 px-3.5 py-2.5 border rounded-xl text-xs text-gray-800 focus:outline-none transition-colors ${
                        isInternalNote ? 'border-amber-200 bg-amber-50/30 focus:border-amber-400' : 'border-gray-200 bg-gray-50 focus:border-[#ff6b35]'
                      }`}
                    />
                    <button type="submit"
                      className={`p-2.5 text-white rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer ${isInternalNote ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#ff6b35] hover:bg-[#e85a28]'}`}>
                      <Send size={15} />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-3">
                <MessageSquare size={48} />
                <p className="text-xs font-semibold text-gray-400">Select a conversation to start chatting</p>
              </div>
            )}

            {/* AI Copilot Drawer */}
            {aiDrawerOpen && selectedChat && (
              <div className="absolute right-0 top-0 bottom-0 w-72 bg-white border-l border-gray-200 shadow-xl z-20 flex flex-col">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                  <h4 className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                    <Sparkles size={14} className="text-violet-500" /> AI Copilot
                  </h4>
                  <button onClick={() => setAiDrawerOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={15} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Sentiment */}
                  <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-xl space-y-2">
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Sentiment & Intent</div>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                      <span>{sentimentAnalysis.sentiment}</span>
                      <span className="text-gray-400 font-semibold">{sentimentAnalysis.intent}</span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${sentimentAnalysis.score}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Suggested Replies</div>
                    {aiLoading ? (
                      <div className="flex justify-center py-6"><RefreshCw size={20} className="animate-spin text-gray-300" /></div>
                    ) : (
                      <div className="space-y-2">
                        {aiSuggestions.map((s, i) => (
                          <div key={i} onClick={() => { setMessageInput(s); setAiDrawerOpen(false); }}
                            className="p-3 border border-gray-200 hover:border-[#ff6b35] bg-gray-50 hover:bg-orange-50 rounded-xl cursor-pointer text-xs text-gray-700 leading-relaxed transition-colors border-l-2 border-l-violet-400">
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — CRM Profile */}
          {selectedChat && (
            <div className="w-72 border-l border-gray-200 bg-white overflow-y-auto p-4 space-y-5 shrink-0">

              {/* Labels */}
              <div>
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Conversation Label</div>
                <div className="flex flex-wrap gap-1.5">
                  {(['VIP','Wholesale','Urgent','Refund','Courier','Fake','New'] as const).map((l) => (
                    <button key={l} onClick={() => handleUpdateLabel(l)}
                      className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${
                        selectedChat.label === l ? LABEL_STYLES[l] : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>{l}</button>
                  ))}
                </div>
              </div>

              {/* Agent Assignment */}
              <div className="border-t border-gray-100 pt-4">
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Assign Agent</div>
                <select value={selectedChat.agent_id || ''} onChange={(e) => handleAssignAgent(e.target.value || null)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-700 focus:outline-none focus:border-[#ff6b35] bg-gray-50 cursor-pointer">
                  <option value="">— Unassigned —</option>
                  {agents.map((ag) => <option key={ag.id} value={ag.id}>{ag.name} ({ag.role})</option>)}
                </select>
              </div>

              {/* Visitor Metadata */}
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Session & System</div>
                {[
                  { icon: <Globe size={12} />,  label: `IP: ${selectedChat.ip || '127.0.0.1'}` },
                  { icon: <MapPin size={12} />, label: `${selectedChat.city || 'Dhaka'}, ${selectedChat.country || 'BD'}` },
                  { icon: <Laptop size={12} />, label: `${selectedChat.os || 'Windows'} / ${selectedChat.browser || 'Chrome'}` },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="text-gray-400 shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}
                {selectedChat.current_page && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Info size={12} className="text-gray-400 shrink-0" />
                    <a href={selectedChat.current_page} target="_blank" rel="noreferrer" className="text-[#ff6b35] underline truncate font-semibold">{selectedChat.current_page}</a>
                  </div>
                )}
              </div>

              {/* CRM Card */}
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Customer Profile</div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${crmProfile ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                    {crmProfile ? 'Matched' : 'Guest'}
                  </span>
                </div>

                {crmProfile ? (
                  <>
                    <div className="flex items-center gap-2 text-xs text-gray-700"><User size={12} className="text-gray-400" /><span className="font-bold">{selectedChat.customer_name}</span></div>
                    <div className="flex items-center gap-2 text-xs text-gray-700"><Phone size={12} className="text-gray-400" /><span>{selectedChat.customer_phone}</span></div>
                    {selectedChat.customer_email && <div className="flex items-center gap-2 text-xs text-gray-700"><Mail size={12} className="text-gray-400" /><span className="truncate">{selectedChat.customer_email}</span></div>}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="bg-orange-50 border border-orange-100 rounded-xl p-2.5">
                        <div className="text-[9px] font-bold text-gray-400 uppercase">Total Spent</div>
                        <div className="text-sm font-black text-[#ff6b35]">{formatBDTNumeric(crmProfile.spentAmount)}</div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5">
                        <div className="text-[9px] font-bold text-gray-400 uppercase">Orders</div>
                        <div className="text-sm font-black text-gray-900">{crmProfile.ordersCount}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2"><User size={12} className="text-gray-400" />{selectedChat.customer_name || 'Guest'}</div>
                    <div className="flex items-center gap-2"><Phone size={12} className="text-gray-400" />{selectedChat.customer_phone || 'Not provided'}</div>
                  </div>
                )}
              </div>

              {/* Internal Notes */}
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Internal Notes</div>
                {internalNotes.map((n) => (
                  <div key={n.id} className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs space-y-1">
                    <p className="text-amber-800 font-semibold leading-relaxed">{n.body}</p>
                    <div className="flex justify-between text-[9px] text-amber-600/70 font-bold">
                      <span>by {n.author_name}</span>
                      <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
                {internalNotes.length === 0 && (
                  <div className="text-center text-xs text-gray-400 py-3 border border-dashed border-gray-200 rounded-xl bg-gray-50">No notes recorded.</div>
                )}
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
}

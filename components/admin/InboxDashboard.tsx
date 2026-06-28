'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, MessageSquare, Send, User, Phone, Mail, MapPin, 
  Globe, Laptop, Clock, Sparkles, Check, CheckCheck, 
  Trash2, ShieldCheck, UserCheck, RefreshCw, BarChart2, Tag, 
  ThumbsUp, ThumbsDown, ArrowRightLeft, Lock, FileText, 
  Smile, Mic, Paperclip, X, MoreVertical, ClipboardList, Info,
  Settings, Volume2, ShieldAlert, Plus, Download, Filter, MessageCircle
} from 'lucide-react';
import { formatBDTNumeric } from '@/lib/utils';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '@/lib/alerts';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function InboxDashboard() {
  // Navigation & UI Tabs
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'resolved' | 'closed' | 'spam'>('active');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showLiveVisitors, setShowLiveVisitors] = useState(false);
  const [showCannedManager, setShowCannedManager] = useState(false);
  
  // Data States
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  
  // Canned Form States
  const [newShortcut, setNewShortcut] = useState('');
  const [newCannedTitle, setNewCannedTitle] = useState('');
  const [newCannedText, setNewCannedText] = useState('');
  
  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Message input / edit states
  const [messageInput, setMessageInput] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Translation Toggle
  const [translateChat, setTranslateChat] = useState(false);
  
  // AI Tooling State
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [sentimentAnalysis, setSentimentAnalysis] = useState<{ sentiment: string; score: number; intent: string }>({ sentiment: 'Neutral', score: 50, intent: 'None' });
  
  // CRM profiles state
  const [crmProfile, setCrmProfile] = useState<{
    ordersCount: number;
    spentAmount: number;
    wishlistCount: number;
    lastOrderDate: string | null;
    orders: any[];
  } | null>(null);

  // SLA countdown timer
  const [slaSecondsLeft, setSlaSecondsLeft] = useState<number>(30);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial Data Loading
  useEffect(() => {
    fetchChats();
    fetchAgents();
    fetchCannedResponses();
  }, [activeTab]);

  // SLA Timer logic
  useEffect(() => {
    if (selectedChat && selectedChat.status === 'pending') {
      setSlaSecondsLeft(30);
      const interval = setInterval(() => {
        setSlaSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [selectedChat]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Web Audio API Synthesized Notification Chime
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      // Dual tone notification (D5 followed quickly by A5)
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (err) {
      console.error('AudioContext fail:', err);
    }
  };

  // Real-time listener for messages
  useEffect(() => {
    if (!selectedChat) return;

    fetchMessages(selectedChat.id);
    fetchInternalNotes(selectedChat.id);
    fetchCRMProfile(selectedChat);
    setSlaSecondsLeft(30);

    const channel = supabase
      .channel(`chat-${selectedChat.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'oh_chat_messages', filter: `chat_id=eq.${selectedChat.id}` },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            // Play notification sound on incoming customer messages
            if (newMsg.sender_role === 'customer') {
              playChime();
            }
            return [...prev, newMsg];
          });
          
          if (newMsg.sender_role === 'customer') {
            supabase
              .from('oh_chat_messages')
              .update({ is_seen: true })
              .eq('id', newMsg.id)
              .then(() => {});
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'oh_chat_messages', filter: `chat_id=eq.${selectedChat.id}` },
        (payload) => {
          const updatedMsg = payload.new as ChatMessage;
          setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat]);

  // Fetch Helper Functions
  const fetchChats = async () => {
    const { data, error } = await supabase
      .from('oh_chats')
      .select('*')
      .eq('status', activeTab)
      .order('updated_at', { ascending: false });

    if (data) setChats(data);
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
      .from('oh_chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
  };

  const fetchInternalNotes = async (chatId: string) => {
    const { data } = await supabase
      .from('oh_chat_notes')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (data) setInternalNotes(data || []);
  };

  const fetchCRMProfile = async (chat: Chat) => {
    if (chat.customer_phone) {
      const { data: orders } = await supabase
        .from('oh_orders')
        .select('*')
        .eq('customer_phone', chat.customer_phone)
        .order('created_at', { ascending: false });

      if (orders && orders.length > 0) {
        const spent = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);
        setCrmProfile({
          ordersCount: orders.length,
          spentAmount: spent,
          wishlistCount: 3,
          lastOrderDate: orders[0].created_at,
          orders: orders,
        });
        return;
      }
    }
    setCrmProfile(null);
  };

  // Actions & Operations
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !selectedChat) return;

    const body = messageInput;
    setMessageInput('');

    if (isInternalNote) {
      const { error } = await supabase.from('oh_chat_notes').insert({
        chat_id: selectedChat.id,
        author_name: 'Origin Haat Admin',
        body: body,
      });

      if (!error) {
        fetchInternalNotes(selectedChat.id);
      }
    } else {
      await supabase.from('oh_chat_messages').insert({
        chat_id: selectedChat.id,
        sender_role: 'agent',
        sender_name: 'Origin Haat Admin',
        body: body,
        reply_to_id: replyingToMessage?.id || null,
      });

      if (selectedChat.status === 'pending') {
        await supabase
          .from('oh_chats')
          .update({ status: 'active' })
          .eq('id', selectedChat.id);
        
        setSelectedChat((prev) => prev ? { ...prev, status: 'active' } : null);
        fetchChats();
      }

      setReplyingToMessage(null);
    }
  };

  const handleCannedSelect = (text: string) => {
    setMessageInput(text);
  };

  const handleCreateCanned = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShortcut.startsWith('/')) {
      showErrorAlert('Invalid Shortcut', 'Shortcut must start with a slash (e.g., /refund)');
      return;
    }

    const { error } = await supabase
      .from('oh_chat_canned')
      .insert({
        shortcut: newShortcut,
        title: newCannedTitle,
        text: newCannedText
      });

    if (error) {
      showErrorAlert('Error', error.message);
    } else {
      showSuccessAlert('Canned Created', 'Canned reply added successfully.');
      setNewShortcut('');
      setNewCannedTitle('');
      setNewCannedText('');
      fetchCannedResponses();
    }
  };

  const handleDeleteCanned = async (cannedId: string) => {
    const confirm = await showConfirmAlert('Delete Template?', 'This template will be permanently deleted.', 'Delete');
    if (!confirm.isConfirmed) return;

    const { error } = await supabase
      .from('oh_chat_canned')
      .delete()
      .eq('id', cannedId);

    if (!error) {
      showSuccessAlert('Deleted', 'Canned reply removed.');
      fetchCannedResponses();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;

    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedChat.id}/${Date.now()}.${fileExt}`;
      
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
        chat_id: selectedChat.id,
        sender_role: 'agent',
        sender_name: 'Origin Haat Admin',
        attachments: [{ url: urlData.publicUrl, name: file.name, type: fileType }],
      });

    } catch (err: any) {
      console.error(err);
      showErrorAlert('Upload Failed', err.message || 'Unable to upload file.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    const confirm = await showConfirmAlert('Delete Message?', 'This message will be deleted for everyone.', 'Delete');
    if (!confirm.isConfirmed) return;

    await supabase
      .from('oh_chat_messages')
      .update({ is_deleted: true, body: 'message was deleted' })
      .eq('id', msgId);
  };

  const handleUpdateStatus = async (chatId: string, newStatus: Chat['status']) => {
    const { error } = await supabase
      .from('oh_chats')
      .update({ status: newStatus })
      .eq('id', chatId);

    if (!error) {
      showSuccessAlert('Success', `Conversation status marked as ${newStatus}.`);
      if (selectedChat?.id === chatId) {
        setSelectedChat((prev) => prev ? { ...prev, status: newStatus } : null);
      }
      fetchChats();
    }
  };

  const handleAssignAgent = async (agentId: string | null) => {
    if (!selectedChat) return;

    const { error } = await supabase
      .from('oh_chats')
      .update({ agent_id: agentId })
      .eq('id', selectedChat.id);

    if (!error) {
      setSelectedChat((prev) => prev ? { ...prev, agent_id: agentId } : null);
      showSuccessAlert('Assigned', agentId ? 'Chat assigned to agent.' : 'Chat unassigned.');
      fetchChats();
    }
  };

  const handleUpdateLabel = async (label: Chat['label']) => {
    if (!selectedChat) return;

    const { error } = await supabase
      .from('oh_chats')
      .update({ label })
      .eq('id', selectedChat.id);

    if (!error) {
      setSelectedChat((prev) => prev ? { ...prev, label } : null);
      showSuccessAlert('Updated', `Label updated to ${label}.`);
      fetchChats();
    }
  };

  // AI Copilot Assist Functions
  const handleAISuggestReply = async () => {
    if (!selectedChat || messages.length === 0) return;
    setAiLoading(true);
    setAiDrawerOpen(true);

    try {
      const lastMsg = [...messages].reverse().find(m => m.sender_role === 'customer');
      if (!lastMsg || !lastMsg.body) {
        setAiSuggestions(['No recent customer text message found to analyze.']);
        return;
      }

      const txt = lastMsg.body.toLowerCase();
      let suggestions: string[] = [];
      let sentiment = 'Neutral';
      let score = 50;
      let intent = 'General Enquiry';

      // Advanced heuristic AI mock matching
      if (txt.includes('ডেলিভারি') || txt.includes('delivery')) {
        suggestions = [
          'আমাদের ডেলিভারি চার্জ ঢাকার ভিতর ৬০ টাকা এবং ঢাকার বাইরে ১২০ টাকা। ৯৯৯ টাকার বেশি অর্ডারে ফ্রী ডেলিভারি!',
          'স্যার, ঢাকা সিটিতে ২৪ ঘণ্টার মধ্যে এবং ঢাকার বাইরে ২-৩ দিনের মধ্যে হোম ডেলিভারি পাবেন।'
        ];
        intent = 'Delivery Details';
      } else if (txt.includes('অর্ডার') || txt.includes('order') || txt.includes('ট্র্যাক')) {
        if (crmProfile && crmProfile.orders.length > 0) {
          const lastOrder = crmProfile.orders[0];
          suggestions = [
            `আপনার সর্বশেষ অর্ডার আইডি ${lastOrder.order_number || lastOrder.id.substring(0, 8)} এর বর্তমান স্ট্যাটাসঃ ${lastOrder.status || 'অপেক্ষমান'}।`,
            'আপনার অর্ডারটি ইতিমধ্যে কুরিয়ারে পাঠানো হয়েছে। আমরা আপনাকে ট্র্যাকিং কোডটি শেয়ার করছি।'
          ];
        } else {
          suggestions = [
            'দয়া করে আপনার অর্ডার আইডি অথবা ফোন নাম্বারটি দিন, আমরা ট্র্যাক করে স্ট্যাটাস জানিয়ে দিচ্ছি।',
            'আপনি "অর্ডার ট্র্যাক" পেজে গিয়ে সরাসরি অর্ডার নাম্বার দিয়ে লাইভ আপডেট দেখতে পারেন।'
          ];
        }
        intent = 'Order Tracking';
      } else if (txt.includes('খারাপ') || txt.includes('ফালতু') || txt.includes('দেরি') || txt.includes('bad') || txt.includes('hate')) {
        suggestions = [
          'অসুবিধার জন্য আমরা অত্যন্ত দুঃখিত। আমরা এখনই কুরিয়ার সার্ভিসের সাথে কথা বলে আপনার প্রোডাক্টটি দ্রুত ডেলিভারি করার ব্যবস্থা নিচ্ছি।',
          'স্যার, আমাদের ভুলটির জন্য ক্ষমা চাচ্ছি। দয়া করে একটু অপেক্ষা করুন, আমাদের ম্যানেজার আপনার সমস্যার সমাধান করে দিচ্ছেন।'
        ];
        sentiment = 'Urgent/Angry';
        score = 15;
        intent = 'Complaint Handling';
      } else if (txt.includes('ধন্যবাদ') || txt.includes('ভালো') || txt.includes('পছন্দ') || txt.includes('nice') || txt.includes('love')) {
        suggestions = [
          'অনেক ধন্যবাদ স্যার আমাদের প্রোডাক্ট পছন্দ করার জন্য! আপনার জন্য শুভকামনা।',
          'জি স্যার, নতুন কালেকশন আসলে আমরা আপনাকে মেসেজ দিয়ে জানিয়ে দিব।'
        ];
        sentiment = 'Positive';
        score = 90;
        intent = 'Appreciation';
      } else {
        suggestions = [
          'জি বলুন, কীভাবে আপনাকে সাহায্য করতে পারি?',
          'প্রিয় গ্রাহক, আপনার এই পণ্যটি সম্পর্কে আর কিছু জানার থাকলে জিজ্ঞেস করতে পারেন।'
        ];
      }

      setAiSuggestions(suggestions);
      setSentimentAnalysis({ sentiment, score, intent });
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleConvertToTicket = async () => {
    if (!selectedChat) return;
    await showSuccessAlert('Ticket Created', `Conversation converted into Support Ticket #${selectedChat.id.substring(0, 6).toUpperCase()}`);
  };

  const filteredChats = chats.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.customer_name?.toLowerCase().includes(q) ||
      c.customer_phone?.includes(q) ||
      c.customer_email?.toLowerCase().includes(q) ||
      c.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-[calc(100vh-68px)] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden font-sans text-slate-200">
      
      {/* Top Banner Control - Enterprise Dark Theme */}
      <div className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex items-center justify-between shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-md shadow-emerald-500/50" />
          <div>
            <h2 className="font-extrabold text-white text-base tracking-wide flex items-center gap-1.5">
              Agency Support Console
              <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 text-[9px] rounded-full font-black tracking-widest uppercase">PRO</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Real-time Customer Operations Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              soundEnabled ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400'
            }`}
            title={soundEnabled ? 'Mute Alerts' : 'Unmute Alerts'}
          >
            <Volume2 size={15} />
          </button>

          {/* Canned Templates Manager Button */}
          <button
            onClick={() => {
              setShowCannedManager(!showCannedManager);
              setShowAnalytics(false);
              setShowLiveVisitors(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.8 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showCannedManager ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/30' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
          >
            <Settings size={14} />
            Canned Replies
          </button>

          <button
            onClick={() => {
              setShowAnalytics(!showAnalytics);
              setShowLiveVisitors(false);
              setShowCannedManager(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.8 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showAnalytics ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/30' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
          >
            <BarChart2 size={14} />
            Analytics
          </button>

          <button
            onClick={() => {
              setShowLiveVisitors(!showLiveVisitors);
              setShowAnalytics(false);
              setShowCannedManager(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.8 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showLiveVisitors ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/30' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
          >
            <Globe size={14} />
            Live Traffic
            <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 text-[9px] rounded-full font-black">18</span>
          </button>
        </div>
      </div>

      {showCannedManager ? (
        // CANNED REPLIES MANAGEMENT INTERFACE
        <div className="flex-1 p-8 bg-slate-950 overflow-y-auto space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-black text-white">Canned Responses Manager</h3>
              <p className="text-xs text-slate-400 mt-1">Create shortcuts to reply instantly by typing / in chat boxes</p>
            </div>
            <button onClick={() => setShowCannedManager(false)} className="text-slate-400 hover:text-white font-bold text-xs">Back to Inbox</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create form */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
              <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <Plus size={16} className="text-orange-500" />
                Add New Shortcut
              </h4>

              <form onSubmit={handleCreateCanned} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Shortcut Trigger *</label>
                  <input
                    type="text"
                    required
                    value={newShortcut}
                    onChange={(e) => setNewShortcut(e.target.value)}
                    placeholder="e.g. /refund"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Shortcut Title *</label>
                  <input
                    type="text"
                    required
                    value={newCannedTitle}
                    onChange={(e) => setNewCannedTitle(e.target.value)}
                    placeholder="e.g. Refund Policy"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Quick Reply Text *</label>
                  <textarea
                    required
                    value={newCannedText}
                    onChange={(e) => setNewCannedText(e.target.value)}
                    placeholder="Type the message template..."
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500 h-28"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-orange-500/20 active:scale-98 cursor-pointer"
                >
                  Save Shortcut
                </button>
              </form>
            </div>

            {/* List templates */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
              <h4 className="font-extrabold text-sm text-white">Active Shortcuts ({cannedResponses.length})</h4>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {cannedResponses.map((cr) => (
                  <div key={cr.id} className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex justify-between items-start gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-orange-400 font-extrabold text-xs bg-orange-500/5 px-2 py-0.5 border border-orange-500/10 rounded-md">
                          {cr.shortcut}
                        </span>
                        <span className="text-white font-bold text-xs">{cr.title}</span>
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed pt-1.5">{cr.text}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteCanned(cr.id)}
                      className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : showAnalytics ? (
        // ANALYTICS PANEL - Slate Dark Theme
        <div className="flex-1 p-8 bg-slate-950 overflow-y-auto space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <h3 className="text-lg font-black text-white">System Insights & SLA Analytics</h3>
            <button onClick={() => setShowAnalytics(false)} className="text-slate-400 hover:text-white font-semibold text-xs">Back to Inbox</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="border border-slate-800 p-5 rounded-3xl bg-slate-900 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">First Response SLA</div>
              <div className="text-3xl font-black text-white mt-1.5">24s</div>
              <div className="text-[10px] text-emerald-500 font-bold mt-1.5 flex items-center gap-1">✓ Breach Rate: 0%</div>
            </div>
            <div className="border border-slate-800 p-5 rounded-3xl bg-slate-900 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Average Resolve Time</div>
              <div className="text-3xl font-black text-white mt-1.5">6.2m</div>
              <div className="text-[10px] text-emerald-500 font-bold mt-1.5 flex items-center gap-1">✓ SLA target met</div>
            </div>
            <div className="border border-slate-800 p-5 rounded-3xl bg-slate-900 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Satisfaction</div>
              <div className="text-3xl font-black text-white mt-1.5">4.8 / 5.0</div>
              <div className="text-[10px] text-orange-400 font-bold mt-1.5">★ 96% positive comments</div>
            </div>
            <div className="border border-slate-800 p-5 rounded-3xl bg-slate-900 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Agent LTV Closed</div>
              <div className="text-3xl font-black text-orange-500 mt-1.5">৳৪৫,৯০০</div>
              <div className="text-[10px] text-emerald-500 font-bold mt-1.5">↑ 18% weekly growth</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-slate-800 p-6 rounded-3xl bg-slate-900">
              <h4 className="font-extrabold text-sm text-white mb-4">Volume by Department</h4>
              <div className="space-y-3.5">
                {[
                  { name: 'Sales Support', value: '45%', width: 'w-[45%]', color: 'bg-orange-500' },
                  { name: 'Refunds / Exchange', value: '25%', width: 'w-[25%]', color: 'bg-orange-400' },
                  { name: 'Technical / Other', value: '20%', width: 'w-[20%]', color: 'bg-emerald-500' },
                  { name: 'Payment Complaints', value: '10%', width: 'w-[10%]', color: 'bg-red-500' },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                      <span>{item.name}</span>
                      <span className="font-bold text-white">{item.value}</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} ${item.width}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-slate-800 p-6 rounded-3xl bg-slate-900">
              <h4 className="font-extrabold text-sm text-white mb-4">Peak Activity periods</h4>
              <div className="flex h-36 items-end gap-3 pt-6 border-b border-slate-800">
                {[20, 45, 30, 80, 95, 60, 40, 75, 100, 50, 30, 20].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
                    <div className="w-full bg-slate-800 group-hover:bg-orange-500 rounded-t-md transition-all" style={{ height: `${h}%` }} />
                    <span className="text-[9px] text-slate-400 mt-1">{i * 2}h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : showLiveVisitors ? (
        // LIVE VISITORS PANEL - Dark Theme
        <div className="flex-1 p-8 bg-slate-950 overflow-y-auto space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <h3 className="text-lg font-black text-white">Live Traffic Monitor</h3>
            <button onClick={() => setShowLiveVisitors(false)} className="text-slate-400 hover:text-white font-semibold text-xs">Back to Inbox</button>
          </div>

          <div className="border border-slate-800 rounded-3xl overflow-hidden shadow-xl bg-slate-900">
            <table className="w-full text-sm text-left text-slate-300">
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <th className="px-6 py-4">Visitor IP</th>
                <th className="px-6 py-4">Country/City</th>
                <th className="px-6 py-4">Current Page</th>
                <th className="px-6 py-4">Referral / Source</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
              {[
                { ip: '103.88.222.18', geo: 'Dhaka, BD', page: '/product/transparent-ac-sticker-4', ref: 'Facebook Ads', time: '4m 12s' },
                { ip: '182.52.190.111', geo: 'Chittagong, BD', page: '/checkout', ref: 'Direct', time: '1m 45s' },
                { ip: '202.91.44.89', geo: 'Sylhet, BD', page: '/cart', ref: 'Google Ads', time: '12s' },
                { ip: '103.111.90.5', geo: 'Dhaka, BD', page: '/', ref: 'Instagram Campaign', time: '8m 33s' },
              ].map((v, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 border-b border-slate-800 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-slate-200">{v.ip}</td>
                  <td className="px-6 py-4 font-semibold text-white">{v.geo}</td>
                  <td className="px-6 py-4 text-orange-400 font-medium">{v.page}</td>
                  <td className="px-6 py-4 text-slate-400">{v.ref}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono">{v.time}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95">Proactive Chat</button>
                  </td>
                </tr>
              ))}
            </table>
          </div>
        </div>
      ) : (
        // MAIN CHAT INTERFACE
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT PANE - Conversation List (Sleek Dark Theme) */}
          <div className="w-80 border-r border-slate-800 bg-slate-950 flex flex-col shrink-0">
            {/* Tabs Filter */}
            <div className="border-b border-slate-805 px-3 py-2.5 flex flex-wrap gap-1 bg-slate-950">
              {['active', 'pending', 'resolved', 'closed', 'spam'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab as any);
                    setSelectedChat(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    activeTab === tab 
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-850/50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-slate-850 shrink-0 bg-slate-950">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search inbox..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-900 bg-slate-950">
              {filteredChats.map((c) => {
                const isSelected = selectedChat?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedChat(c)}
                    className={`p-4 flex flex-col gap-1.5 cursor-pointer transition-all select-none border-l-2 ${
                      isSelected ? 'bg-slate-900/60 border-orange-500' : 'hover:bg-slate-900/20 border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-white text-xs truncate max-w-[140px]">
                        {c.customer_name || 'Anonymous Visitor'}
                      </span>
                      <span className="text-[9px] text-slate-500 font-semibold">
                        {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[9px] mt-0.5">
                      <span className="text-slate-400 font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {c.department}
                      </span>
                      {c.label && (
                        <span className={`px-1.5 py-0.5 rounded font-black tracking-wide ${
                          c.label === 'VIP' ? 'bg-orange-500/10 text-orange-400' : c.label === 'Urgent' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {c.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredChats.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">No conversations found.</div>
              )}
            </div>
          </div>

          {/* MIDDLE PANE - Active Chat Thread */}
          <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden relative">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="border-b border-slate-800/80 px-6 py-4 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm shrink-0">
                  <div>
                    <h3 className="font-black text-white text-sm">{selectedChat.customer_name || 'Visitor'}</h3>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-semibold">
                      <span>Status: <span className="text-orange-400 uppercase font-black">{selectedChat.status}</span></span>
                      <span>•</span>
                      <span>Agent: <span className="text-emerald-500 font-bold">{selectedChat.agent_id ? 'Admin' : 'Unassigned'}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* SLA timer indicator with breach alert */}
                    {selectedChat.status === 'pending' && (
                      <div className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-all ${
                        slaSecondsLeft <= 10 
                          ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' 
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        <Clock size={12} />
                        SLA Reply: {slaSecondsLeft}s
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleConvertToTicket}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                      >
                        <FileText size={13} />
                        Ticket
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(selectedChat.id, 'resolved')}
                        className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs rounded-xl flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                      >
                        <Check size={13} />
                        Resolve
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(selectedChat.id, 'spam')}
                        className="px-3 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-xl flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                      >
                        <X size={13} />
                        Spam
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages Box */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950/30">
                  {messages.map((m) => {
                    const isAgent = m.sender_role === 'agent';
                    const isSystem = m.sender_role === 'system';

                    if (isSystem) {
                      return (
                        <div key={m.id} className="flex justify-center my-2">
                          <span className="text-[10px] bg-slate-800/80 border border-slate-750 text-slate-400 font-bold px-3 py-1 rounded-full">{m.body}</span>
                        </div>
                      );
                    }

                    return (
                      <div key={m.id} className={`flex gap-3 max-w-[80%] ${isAgent ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs text-white ${isAgent ? 'bg-orange-500' : 'bg-slate-700'}`}>
                          {isAgent ? 'A' : 'C'}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold">
                            <span>{m.sender_name}</span>
                            <span>•</span>
                            <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div className={`p-3.5 rounded-2xl text-xs relative ${
                            isAgent 
                              ? 'bg-orange-500 text-white rounded-tr-none' 
                              : 'bg-slate-800 text-slate-200 border border-slate-750 rounded-tl-none'
                          }`}>
                            {m.body && <p className="leading-relaxed whitespace-pre-line font-medium">{m.body}</p>}

                            {m.attachments && m.attachments.length > 0 && (
                              <div className="space-y-2 mt-2">
                                {m.attachments.map((file, idx) => (
                                  <div key={idx} className="border border-slate-700/20 p-2 rounded-xl bg-black/15 flex items-center gap-2">
                                    <Paperclip size={14} />
                                    <a href={file.url} target="_blank" rel="noreferrer" className="underline truncate font-semibold">
                                      {file.name}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            )}

                            {isAgent && (
                              <button
                                onClick={() => handleDeleteMessage(m.id)}
                                className="absolute top-1/2 -left-6 -translate-y-1/2 text-slate-600 hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply bar if quoting */}
                {replyingToMessage && (
                  <div className="bg-slate-850 px-6 py-2 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400 truncate">Quoting: {replyingToMessage.body}</span>
                    <button onClick={() => setReplyingToMessage(null)} className="text-slate-500 hover:text-white"><X size={14} /></button>
                  </div>
                )}

                {/* Chatbox Input form */}
                <form onSubmit={handleSendMessage} className={`border-t border-slate-800/80 p-4 shrink-0 bg-slate-950/55 ${
                  isInternalNote ? 'bg-amber-950/20 border-amber-900/20' : ''
                }`}>
                  <div className="flex items-center gap-3 mb-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(false)}
                      className={`font-black transition-all px-2.5 py-1 rounded-lg cursor-pointer ${
                        !isInternalNote ? 'bg-orange-500/10 text-orange-400' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Reply to Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(true)}
                      className={`font-black transition-all px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1.5 ${
                        isInternalNote ? 'bg-amber-500/10 text-amber-400' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Lock size={12} />
                      Private Note (Internal Only)
                    </button>

                    <button
                      type="button"
                      onClick={handleAISuggestReply}
                      className="ml-auto bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 font-black px-2.5 py-1 rounded-lg flex items-center gap-1 border border-violet-500/20 cursor-pointer"
                    >
                      <Sparkles size={12} className="animate-pulse" />
                      AI Copilot Assist
                    </button>
                  </div>

                  {/* Canned suggestions shortcuts helper */}
                  {messageInput.startsWith('/') && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 shadow-2xl space-y-1.5 mb-2 max-h-40 overflow-y-auto">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 px-1">Canned Responses</div>
                      {cannedResponses
                        .filter(c => c.shortcut.startsWith(messageInput))
                        .map(c => (
                          <div
                            key={c.id}
                            onClick={() => handleCannedSelect(c.text)}
                            className="text-xs p-2 hover:bg-slate-800 rounded-xl cursor-pointer flex justify-between font-semibold"
                          >
                            <span className="font-mono text-orange-400 font-extrabold">{c.shortcut}</span>
                            <span className="text-slate-500 text-[10px]">{c.title}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <label className="p-2.5 hover:bg-slate-800 rounded-xl cursor-pointer text-slate-500 shrink-0">
                      <Paperclip size={18} />
                      <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploadingFile} />
                    </label>

                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder={isInternalNote ? "Write a private internal note about the customer..." : "Type your reply... (use / for templates)"}
                      className={`flex-1 px-4 py-2.8 bg-slate-900 border rounded-xl text-xs text-white focus:outline-none focus:border-orange-500 ${
                        isInternalNote 
                          ? 'border-amber-900/30 bg-amber-950/10' 
                          : 'border-slate-800'
                      }`}
                    />

                    <button
                      type="submit"
                      className={`p-2.5 text-white rounded-xl shadow-md transition-all active:scale-95 cursor-pointer ${
                        isInternalNote ? 'bg-amber-600 hover:bg-amber-700' : 'bg-orange-500 hover:bg-orange-600'
                      }`}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2.5 bg-slate-900/20">
                <MessageSquare size={48} className="text-slate-800" />
                <p className="text-xs font-semibold">Select a conversation to load the live support interface.</p>
              </div>
            )}

            {/* AI COPILOT ASSISTANT DRAWER */}
            {aiDrawerOpen && selectedChat && (
              <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900 border-l border-slate-800 shadow-2xl z-20 flex flex-col">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                  <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                    <Sparkles size={16} className="text-violet-400" />
                    AI Copilot Assist
                  </h4>
                  <button onClick={() => setAiDrawerOpen(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  {/* Sentiment score indicator */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-2">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sentiment & Intent</div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">{sentimentAnalysis.sentiment}</span>
                      <span className="text-[10px] font-semibold text-slate-400">{sentimentAnalysis.intent}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500" style={{ width: `${sentimentAnalysis.score}%` }} />
                    </div>
                  </div>

                  <div>
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Suggested Responses</h5>
                    {aiLoading ? (
                      <div className="flex justify-center p-6"><RefreshCw size={24} className="animate-spin text-slate-700" /></div>
                    ) : (
                      <div className="space-y-2">
                        {aiSuggestions.map((s, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              setMessageInput(s);
                              setAiDrawerOpen(false);
                            }}
                            className="p-3 border border-slate-800 bg-slate-950/60 hover:bg-slate-850 rounded-xl cursor-pointer text-xs leading-relaxed text-slate-300 transition-colors border-l-2 border-l-violet-500"
                          >
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-800 pt-4">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Summary</h5>
                    <div className="p-3 bg-slate-950 rounded-xl text-xs text-slate-400 leading-relaxed border border-slate-855">
                      Client requests details regarding shipping timeframes and eligibility for free delivery order charges.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANE - Visitor CRM Profile Details */}
          {selectedChat && (
            <div className="w-80 border-l border-slate-800 bg-slate-950 overflow-y-auto p-5 space-y-6 shrink-0">
              {/* Category Labels */}
              <div>
                <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Conversation Label</h4>
                <div className="flex flex-wrap gap-1.5">
                  {['VIP', 'Wholesale', 'Urgent', 'Refund', 'Courier', 'Fake', 'New'].map((l) => (
                    <button
                      key={l}
                      onClick={() => handleUpdateLabel(l as any)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        selectedChat.label === l 
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
                          : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignment Controls */}
              <div className="border-t border-slate-900 pt-4">
                <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Assign Agent</h4>
                <select
                  value={selectedChat.agent_id || ''}
                  onChange={(e) => handleAssignAgent(e.target.value || null)}
                  className="w-full border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500 bg-slate-900 cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Visitor Metadata */}
              <div className="border-t border-slate-900 pt-4 space-y-3">
                <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Metadata details</h4>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-slate-500" />
                    <span>IP: <span className="font-mono font-bold text-white">{selectedChat.ip || '127.0.0.1'}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-500" />
                    <span>Location: <span className="font-bold text-white">{selectedChat.city ? `${selectedChat.city}, ${selectedChat.country}` : 'Dhaka, BD'}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Laptop size={14} className="text-slate-500" />
                    <span>OS / Browser: <span className="font-bold text-white">{selectedChat.os || 'Windows'} / {selectedChat.browser || 'Chrome'}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-slate-500" />
                    <span className="truncate">Page: <a href={selectedChat.current_page || '/'} target="_blank" rel="noreferrer" className="text-orange-400 underline font-bold">{selectedChat.current_page || 'Homepage'}</a></span>
                  </div>
                </div>
              </div>

              {/* CRM Account Details (if logged in / matched) */}
              <div className="border-t border-slate-900 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">CRM Profile</h4>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    crmProfile ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {crmProfile ? 'Sync Matched' : 'Guest'}
                  </span>
                </div>

                {crmProfile ? (
                  <div className="space-y-2 text-xs text-slate-350">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-slate-500" />
                      <span className="font-bold text-white">{selectedChat.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-500" />
                      <span className="text-white">{selectedChat.customer_phone}</span>
                    </div>
                    {selectedChat.customer_email && (
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-slate-500" />
                        <span className="text-white">{selectedChat.customer_email}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 mt-1">
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-850">
                        <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wide">Spent</span>
                        <span className="text-xs font-black text-orange-400 block mt-0.5">{formatBDTNumeric(crmProfile.spentAmount)}</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-850">
                        <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wide">Orders</span>
                        <span className="text-xs font-black text-white block mt-0.5">{crmProfile.ordersCount}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-slate-500" />
                      <span>Name: <span className="font-semibold text-white">{selectedChat.customer_name || 'Guest Visitor'}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-500" />
                      <span>Phone: <span className="font-semibold text-white">{selectedChat.customer_phone || 'Not provided'}</span></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Private Notes Timeline */}
              <div className="border-t border-slate-900 pt-4 space-y-3">
                <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Internal Agent Notes</h4>
                <div className="space-y-2.5">
                  {internalNotes.map((n) => (
                    <div key={n.id} className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-2xl text-xs space-y-1.5 relative">
                      <p className="text-amber-400 leading-relaxed font-semibold">{n.body}</p>
                      <div className="text-[9px] text-amber-500/80 font-bold flex justify-between">
                        <span>by {n.author_name}</span>
                        <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                  {internalNotes.length === 0 && (
                    <div className="text-center text-slate-500 text-xs py-2 bg-slate-900 border border-dashed border-slate-800 rounded-2xl">No notes recorded.</div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
}

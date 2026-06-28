'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, MessageSquare, Send, User, Phone, Mail, MapPin, 
  Globe, Laptop, Clock, AlertCircle, Sparkles, Check, CheckCheck, 
  Trash2, ShieldCheck, UserCheck, RefreshCw, BarChart2, Tag, 
  HelpCircle, ThumbsUp, ThumbsDown, ArrowRightLeft, Lock, FileText, 
  Smile, Mic, Paperclip, X, MoreVertical, ClipboardList, Info
} from 'lucide-react';
import { formatBDTNumeric } from '@/lib/utils';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '@/lib/alerts';

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
  
  // Data States
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  
  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  
  // Message input / edit states
  const [messageInput, setMessageInput] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // AI Tooling State
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Live typing simulations
  const [visitorTyping, setVisitorTyping] = useState(false);
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null);
  
  // CRM profiles mock data (for synced logged in profiles)
  const [crmProfile, setCrmProfile] = useState<{
    ordersCount: number;
    spentAmount: number;
    wishlistCount: number;
    lastOrderDate: string | null;
    orders: any[];
  } | null>(null);

  // Chatbot human takeover state
  const [chatbotActive, setChatbotActive] = useState(true);

  // SLA countdown timer
  const [slaSecondsLeft, setSlaSecondsLeft] = useState<number>(30); // SLA response countdown

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial Data Loading
  useEffect(() => {
    fetchChats();
    fetchAgents();
    fetchCannedResponses();
  }, [activeTab]);

  // SLA Timer logic
  useEffect(() => {
    if (selectedChat && selectedChat.status === 'pending') {
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

  // Real-time listener for messages
  useEffect(() => {
    if (!selectedChat) return;

    // Load initial messages
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
            return [...prev, newMsg];
          });
          // Mark seen
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

  // 2. Fetch Helper Functions
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
    if (data) setCannedResponses(data);
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
    // If the customer phone is available, query actual orders
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
          wishlistCount: 2, // Mocked
          lastOrderDate: orders[0].created_at,
          orders: orders,
        });
        return;
      }
    }
    setCrmProfile(null);
  };

  // 3. Actions & Operations
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !selectedChat) return;

    const body = messageInput;
    setMessageInput('');

    if (isInternalNote) {
      // Add Private note
      const { error } = await supabase.from('oh_chat_notes').insert({
        chat_id: selectedChat.id,
        author_name: 'Origin Haat Admin',
        body: body,
      });

      if (!error) {
        fetchInternalNotes(selectedChat.id);
      }
    } else {
      // Send Agent message
      await supabase.from('oh_chat_messages').insert({
        chat_id: selectedChat.id,
        sender_role: 'agent',
        sender_name: 'Origin Haat Admin',
        body: body,
        reply_to_id: replyingToMessage?.id || null,
      });

      // Update status to Active if it was pending
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

      // Get public URL
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

      // Insert message with attachments
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

  // 4. AI Copilot Assist Functions
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

      // Mocking AI Engine analysis based on keywords
      const txt = lastMsg.body.toLowerCase();
      let suggestions: string[] = [];

      if (txt.includes('ডেলিভারি') || txt.includes('delivery')) {
        suggestions = [
          'আমাদের ডেলিভারি চার্জ ঢাকার ভিতর ৬০ টাকা এবং ঢাকার বাইরে ১২০ টাকা। ৯৯৯ টাকার বেশি অর্ডারে ফ্রী ডেলিভারি!',
          'স্যার, ঢাকা সিটিতে ২৪ ঘণ্টার মধ্যে এবং ঢাকার বাইরে ২-৩ দিনের মধ্যে হোম ডেলিভারি পাবেন।'
        ];
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
      } else {
        suggestions = [
          'জি বলুন, কীভাবে আপনাকে সাহায্য করতে পারি?',
          'প্রিয় গ্রাহক, আপনার এই পণ্যটি সম্পর্কে আর কিছু জানার থাকলে জিজ্ঞেস করতে পারেন।'
        ];
      }

      setAiSuggestions(suggestions);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  // Convert Chat to Support Ticket
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
    <div className="flex flex-col h-[calc(100vh-68px)] bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden font-sans">
      {/* Top Banner Control */}
      <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="font-bold text-gray-800 text-base">Agency Support Console</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowAnalytics(!showAnalytics);
              setShowLiveVisitors(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              showAnalytics ? 'bg-[#ff6b35] text-white border-[#ff6b35]' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'
            }`}
          >
            <BarChart2 size={14} />
            Analytics Charts
          </button>

          <button
            onClick={() => {
              setShowLiveVisitors(!showLiveVisitors);
              setShowAnalytics(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              showLiveVisitors ? 'bg-[#ff6b35] text-white border-[#ff6b35]' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'
            }`}
          >
            <Globe size={14} />
            Live Visitors
            <span className="bg-orange-100 text-[#ff6b35] px-1.5 py-0.5 text-[10px] rounded-full font-bold">18</span>
          </button>
        </div>
      </div>

      {showAnalytics ? (
        // ANALYTICS PANEL
        <div className="flex-1 p-6 bg-white overflow-y-auto space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Analytics & Insights</h3>
            <button onClick={() => setShowAnalytics(false)} className="text-gray-400 hover:text-gray-600 font-semibold text-xs">Back to Chats</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border border-gray-100 p-5 rounded-2xl bg-gray-50">
              <div className="text-xs font-bold text-gray-400 uppercase">First Response Time</div>
              <div className="text-2xl font-black text-gray-800 mt-1">24 seconds</div>
              <div className="text-xs text-emerald-600 font-semibold mt-1">✓ SLA Compliant (&lt;30s)</div>
            </div>
            <div className="border border-gray-100 p-5 rounded-2xl bg-gray-50">
              <div className="text-xs font-bold text-gray-400 uppercase">Average Resolve Time</div>
              <div className="text-2xl font-black text-gray-800 mt-1">6.2 mins</div>
              <div className="text-xs text-emerald-600 font-semibold mt-1">✓ SLA Compliant (&lt;10m)</div>
            </div>
            <div className="border border-gray-100 p-5 rounded-2xl bg-gray-50">
              <div className="text-xs font-bold text-gray-400 uppercase">Customer Satisfaction</div>
              <div className="text-2xl font-black text-gray-800 mt-1">4.8 / 5.0</div>
              <div className="text-xs text-orange-500 font-semibold mt-1">★ 96% Excellent Rating</div>
            </div>
            <div className="border border-gray-100 p-5 rounded-2xl bg-gray-50">
              <div className="text-xs font-bold text-gray-400 uppercase">Total Conversion Value</div>
              <div className="text-2xl font-black text-[#ff6b35] mt-1">৳৪৫,৯০০</div>
              <div className="text-xs text-emerald-600 font-semibold mt-1">↑ 18% increase this week</div>
            </div>
          </div>

          {/* Simple CSS simulated charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="border border-gray-100 p-6 rounded-2xl bg-gray-50/50">
              <h4 className="font-bold text-sm text-gray-800 mb-4">Volume by Department</h4>
              <div className="space-y-3">
                {[
                  { name: 'Sales Support', value: '45%', width: 'w-[45%]', color: 'bg-[#ff6b35]' },
                  { name: 'Refunds / Exchange', value: '25%', width: 'w-[25%]', color: 'bg-orange-400' },
                  { name: 'Technical / Other', value: '20%', width: 'w-[20%]', color: 'bg-emerald-500' },
                  { name: 'Payment Complaints', value: '10%', width: 'w-[10%]', color: 'bg-red-500' },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{item.name}</span>
                      <span className="font-bold text-gray-800">{item.value}</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} ${item.width}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-gray-100 p-6 rounded-2xl bg-gray-50/50">
              <h4 className="font-bold text-sm text-gray-800 mb-4">Peak Hours Chats Activity</h4>
              <div className="flex h-36 items-end gap-3 pt-6 border-b border-gray-200">
                {[20, 45, 30, 80, 95, 60, 40, 75, 100, 50, 30, 20].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
                    <div className="w-full bg-orange-100 hover:bg-[#ff6b35] rounded-t transition-all" style={{ height: `${h}%` }} />
                    <span className="text-[9px] text-gray-400 mt-1">{i * 2}h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : showLiveVisitors ? (
        // LIVE VISITORS PANEL
        <div className="flex-1 p-6 bg-white overflow-y-auto space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Live Traffic Monitor</h3>
            <button onClick={() => setShowLiveVisitors(false)} className="text-gray-400 hover:text-gray-600 font-semibold text-xs">Back to Chats</button>
          </div>

          <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left text-black">
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold text-xs uppercase">
                <th className="px-6 py-4">Visitor IP</th>
                <th className="px-6 py-4">Country/City</th>
                <th className="px-6 py-4">Current Page</th>
                <th className="px-6 py-4">Referral / Source</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
              {[
                { ip: '103.88.222.18', geo: 'Dhaka, BD', page: '/product/transparent-ac-sticker-4', ref: 'Facebook Ads', time: '4m 12s', label: 'VIP returning' },
                { ip: '182.52.190.111', geo: 'Chittagong, BD', page: '/checkout', ref: 'Direct', time: '1m 45s', label: 'checkout cart' },
                { ip: '202.91.44.89', geo: 'Sylhet, BD', page: '/cart', ref: 'Google Ads', time: '12s', label: 'new session' },
                { ip: '103.111.90.5', geo: 'Dhaka, BD', page: '/', ref: 'Instagram Campaign', time: '8m 33s', label: 'shopping homepage' },
              ].map((v, idx) => (
                <tr key={idx} className="hover:bg-gray-50 border-b border-gray-100 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-gray-700">{v.ip}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{v.geo}</td>
                  <td className="px-6 py-4 text-blue-600 font-medium">{v.page}</td>
                  <td className="px-6 py-4 text-gray-500">{v.ref}</td>
                  <td className="px-6 py-4 text-gray-500 font-mono">{v.time}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="px-3 py-1 bg-[#ff6b35] hover:bg-[#e55520] text-white font-bold text-xs rounded-lg shadow-md cursor-pointer transition-all active:scale-95">Proactive Chat</button>
                  </td>
                </tr>
              ))}
            </table>
          </div>
        </div>
      ) : (
        // MAIN CHAT INTERFACE
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT PANE - Conversation List */}
          <div className="w-80 border-r border-gray-200 bg-white flex flex-col shrink-0">
            {/* Tabs Filter */}
            <div className="border-b border-gray-200 px-3 py-2 flex flex-wrap gap-1 bg-gray-50">
              {['active', 'pending', 'resolved', 'closed', 'spam'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab as any);
                    setSelectedChat(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    activeTab === tab 
                      ? 'bg-white text-gray-800 shadow-sm border border-gray-200' 
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-gray-100 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search name, phone, etc..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:border-[#ff6b35] focus:outline-none text-black"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {filteredChats.map((c) => {
                const isSelected = selectedChat?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedChat(c)}
                    className={`p-3.5 flex flex-col gap-1 cursor-pointer transition-colors select-none ${
                      isSelected ? 'bg-[#fff3ef]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900 text-xs truncate max-w-[140px]">
                        {c.customer_name || 'Anonymous Visitor'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] mt-0.5">
                      <span className="text-gray-500 font-semibold px-1.5 py-0.5 rounded bg-gray-100">
                        {c.department}
                      </span>
                      {c.label && (
                        <span className={`px-1.5 py-0.5 rounded font-extrabold ${
                          c.label === 'VIP' ? 'bg-orange-100 text-[#ff6b35]' : c.label === 'Urgent' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {c.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredChats.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-xs">No conversations.</div>
              )}
            </div>
          </div>

          {/* MIDDLE PANE - Active Chat Thread */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{selectedChat.customer_name || 'Visitor'}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <span>Status: <span className="font-bold text-orange-500 capitalize">{selectedChat.status}</span></span>
                      <span>•</span>
                      <span>Assigned to: <span className="font-bold text-emerald-600">{selectedChat.agent_id ? 'Admin' : 'None'}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* SLA alert indicator */}
                    {selectedChat.status === 'pending' && (
                      <div className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                        slaSecondsLeft <= 10 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-amber-50 text-amber-700'
                      }`}>
                        <Clock size={12} />
                        SLA Reply Countdown: {slaSecondsLeft}s
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleConvertToTicket}
                        className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        <FileText size={13} />
                        Ticket
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(selectedChat.id, 'resolved')}
                        className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        <Check size={13} />
                        Resolve
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(selectedChat.id, 'spam')}
                        className="px-2.5 py-1.5 bg-red-50 border border-red-100 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        <X size={13} />
                        Spam
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages Box */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                  {messages.map((m) => {
                    const isAgent = m.sender_role === 'agent';
                    const isSystem = m.sender_role === 'system';

                    if (isSystem) {
                      return (
                        <div key={m.id} className="flex justify-center my-2">
                          <span className="text-[10px] bg-gray-100 text-gray-400 font-bold px-3 py-1 rounded-full">{m.body}</span>
                        </div>
                      );
                    }

                    return (
                      <div key={m.id} className={`flex gap-3 max-w-[80%] ${isAgent ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xs ${isAgent ? 'bg-[#ff6b35]' : 'bg-gray-400'}`}>
                          {isAgent ? 'A' : 'C'}
                        </div>

                        {/* Content */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                            <span className="font-bold">{m.sender_name}</span>
                            <span>•</span>
                            <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div className={`p-3 rounded-2xl text-xs relative ${
                            isAgent 
                              ? 'bg-[#ff6b35] text-white rounded-tr-none' 
                              : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-none'
                          }`}>
                            {m.body && <p className="leading-relaxed whitespace-pre-line">{m.body}</p>}

                            {/* Render Attachments */}
                            {m.attachments && m.attachments.length > 0 && (
                              <div className="space-y-2 mt-2">
                                {m.attachments.map((file, idx) => (
                                  <div key={idx} className="border border-gray-200/20 p-2 rounded-xl bg-black/5 flex items-center gap-2">
                                    <Paperclip size={14} />
                                    <a href={file.url} target="_blank" rel="noreferrer" className="underline truncate font-semibold">
                                      {file.name}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Options popup */}
                            {isAgent && (
                              <button
                                onClick={() => handleDeleteMessage(m.id)}
                                className="absolute top-1/2 -left-6 -translate-y-1/2 text-gray-300 hover:text-red-500"
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
                  <div className="bg-orange-50/50 px-6 py-2 border-t border-orange-100 flex justify-between items-center text-xs">
                    <span className="text-gray-500 truncate">Quoting: {replyingToMessage.body}</span>
                    <button onClick={() => setReplyingToMessage(null)} className="text-gray-400"><X size={14} /></button>
                  </div>
                )}

                {/* Chatbox Input form */}
                <form onSubmit={handleSendMessage} className={`border-t border-gray-200 p-4 shrink-0 transition-all ${
                  isInternalNote ? 'bg-amber-50/50 border-amber-200' : 'bg-white'
                }`}>
                  <div className="flex items-center gap-3 mb-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(false)}
                      className={`font-bold transition-all px-2.5 py-1 rounded-lg cursor-pointer ${
                        !isInternalNote ? 'bg-orange-100 text-[#ff6b35]' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      Reply to Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(true)}
                      className={`font-bold transition-all px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1.5 ${
                        isInternalNote ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <Lock size={12} />
                      Private Note (Internal Only)
                    </button>

                    <button
                      type="button"
                      onClick={handleAISuggestReply}
                      className="ml-auto bg-violet-50 text-violet-700 hover:bg-violet-100 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-violet-100 cursor-pointer"
                    >
                      <Sparkles size={12} className="animate-pulse" />
                      AI Copilot Assist
                    </button>
                  </div>

                  {/* Canned suggestions shortcuts helper */}
                  {messageInput.startsWith('/') && (
                    <div className="bg-white border border-gray-200 rounded-xl p-2.5 shadow-lg space-y-1.5 mb-2 max-h-40 overflow-y-auto">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">Canned Responses</div>
                      {cannedResponses
                        .filter(c => c.shortcut.startsWith(messageInput))
                        .map(c => (
                          <div
                            key={c.id}
                            onClick={() => handleCannedSelect(c.text)}
                            className="text-xs p-1.5 hover:bg-orange-50 rounded-lg cursor-pointer flex justify-between font-medium"
                          >
                            <span className="font-mono text-[#ff6b35] font-bold">{c.shortcut}</span>
                            <span className="text-gray-400 text-[10px]">{c.title}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {/* Attachment file uploader */}
                    <label className="p-2.5 hover:bg-gray-100 rounded-xl cursor-pointer text-gray-400 shrink-0">
                      <Paperclip size={18} />
                      <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploadingFile} />
                    </label>

                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder={isInternalNote ? "Write a private internal note about the customer..." : "Type your reply... (use / for shortcuts)"}
                      className={`flex-1 px-4 py-2.5 border rounded-xl text-xs focus:outline-none text-black ${
                        isInternalNote 
                          ? 'bg-amber-50 focus:border-amber-400 border-amber-200' 
                          : 'bg-white focus:border-[#ff6b35] border-gray-200'
                      }`}
                    />

                    <button
                      type="submit"
                      className={`p-2.5 text-white rounded-xl shadow-md transition-all active:scale-95 cursor-pointer ${
                        isInternalNote ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#ff6b35] hover:bg-[#e55520]'
                      }`}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                <MessageSquare size={48} className="text-gray-300" />
                <p className="text-xs font-semibold">Select a conversation to start chat.</p>
              </div>
            )}

            {/* AI COPILOT ASSISTANT DRAWER */}
            {aiDrawerOpen && selectedChat && (
              <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-2xl z-20 flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <h4 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                    <Sparkles size={16} className="text-violet-600" />
                    AI Copilot Suggestions
                  </h4>
                  <button onClick={() => setAiDrawerOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div>
                    <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Suggested Responses</h5>
                    {aiLoading ? (
                      <div className="flex justify-center p-6"><RefreshCw size={24} className="animate-spin text-gray-300" /></div>
                    ) : (
                      <div className="space-y-2">
                        {aiSuggestions.map((s, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              setMessageInput(s);
                              setAiDrawerOpen(false);
                            }}
                            className="p-3 border border-violet-100 hover:bg-violet-50/50 rounded-xl cursor-pointer text-xs leading-relaxed text-gray-700 transition-colors"
                          >
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Chat Summary</h5>
                    <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 leading-relaxed">
                      Customer is asking about the delivery timeframe and wishes to verify if free delivery is eligible for their order.
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Customer Intent & Sentiment</h5>
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">Intent: Delivery query</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">Sentiment: Neutral</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANE - Visitor CRM Profile Details */}
          {selectedChat && (
            <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto p-5 space-y-6 shrink-0 text-black">
              {/* Category Labels */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Conversation Label</h4>
                <div className="flex flex-wrap gap-1.5">
                  {['VIP', 'Wholesale', 'Urgent', 'Refund', 'Courier', 'Fake', 'New'].map((l) => (
                    <button
                      key={l}
                      onClick={() => handleUpdateLabel(l as any)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        selectedChat.label === l 
                          ? 'bg-orange-100 text-[#ff6b35] border-[#ff6b35]' 
                          : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignment Controls */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Assign Support Agent</h4>
                <select
                  value={selectedChat.agent_id || ''}
                  onChange={(e) => handleAssignAgent(e.target.value || null)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-400 text-black bg-white cursor-pointer"
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
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Session & System Details</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-gray-400" />
                    <span>IP: <span className="font-mono font-semibold">{selectedChat.ip || '127.0.0.1'}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    <span>Location: <span className="font-semibold">{selectedChat.city ? `${selectedChat.city}, ${selectedChat.country}` : 'Dhaka, Bangladesh'}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Laptop size={14} className="text-gray-400" />
                    <span>OS / Browser: <span className="font-semibold">{selectedChat.os || 'Windows'} / {selectedChat.browser || 'Chrome'}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-gray-400" />
                    <span className="truncate">Page: <a href={selectedChat.current_page || '/'} target="_blank" rel="noreferrer" className="text-blue-500 underline font-semibold">{selectedChat.current_page || 'Homepage'}</a></span>
                  </div>
                </div>
              </div>

              {/* CRM Account Details (if logged in / matched) */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer Profile (CRM)</h4>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    crmProfile ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {crmProfile ? 'Sync Matched' : 'Guest'}
                  </span>
                </div>

                {crmProfile ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span className="font-bold">{selectedChat.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-gray-400" />
                      <span>{selectedChat.customer_phone}</span>
                    </div>
                    {selectedChat.customer_email && (
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-gray-400" />
                        <span>{selectedChat.customer_email}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 mt-1">
                      <div className="bg-gray-50 p-2 rounded-xl">
                        <span className="text-[9px] font-bold text-gray-400 block uppercase">Spent Value</span>
                        <span className="text-sm font-black text-[#ff6b35] block">{formatBDTNumeric(crmProfile.spentAmount)}</span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-xl">
                        <span className="text-[9px] font-bold text-gray-400 block uppercase">Total Orders</span>
                        <span className="text-sm font-black text-gray-800 block">{crmProfile.ordersCount}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span>Name: <span className="font-semibold">{selectedChat.customer_name || 'Guest Visitor'}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-gray-400" />
                      <span>Phone: <span className="font-semibold">{selectedChat.customer_phone || 'Not provided'}</span></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Private Notes Timeline */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Internal Agent Notes</h4>
                <div className="space-y-2">
                  {internalNotes.map((n) => (
                    <div key={n.id} className="bg-amber-50 border border-amber-100 p-2.5 rounded-xl text-xs space-y-1 relative">
                      <p className="text-amber-900 leading-relaxed">{n.body}</p>
                      <div className="text-[9px] text-amber-500 font-bold flex justify-between">
                        <span>by {n.author_name}</span>
                        <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                  {internalNotes.length === 0 && (
                    <div className="text-center text-gray-400 text-xs py-2 bg-gray-50 rounded-xl border border-dashed border-gray-200">No notes written.</div>
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

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Search, Edit2, Trash2, KeyRound, ShieldAlert, ShieldCheck, X, RefreshCw, Eye, EyeOff, Save, CheckSquare, Square
} from 'lucide-react';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '@/lib/alerts';

interface AdminUser {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'moderator';
  permissions: string[];
  created_at: string;
}

const AVAILABLE_PERMISSIONS = [
  { key: 'dashboard', label: 'Overview Dashboard (ড্যাশবোর্ড)', desc: 'অনুমতি দিলে হোম পেজ ওভারভিউ স্ট্যাট দেখতে পারবে' },
  { key: 'products', label: 'Product Catalog (প্রোডাক্ট লিস্ট)', desc: 'প্রোডাক্ট অ্যাড, এডিট ও ডিলিট করার সুবিধা' },
  { key: 'categories', label: 'Categories (ক্যাটাগরি)', desc: 'ক্যাটাগরি তৈরি ও সাজানোর অনুমতি' },
  { key: 'banners', label: 'Banners (ব্যানার)', desc: 'হোম পেজ স্লাইডার ব্যানার সেটিংস' },
  { key: 'orders', label: 'Orders Management (অর্ডার লিস্ট)', desc: 'অর্ডার ভিউ, কল স্ট্যাটাস ও ডিটেইলস এডিটিং' },
  { key: 'reviews', label: 'Reviews (রিভিউ)', desc: 'গ্রাহকদের রিভিউ অ্যাপ্রুভ বা রিজেক্ট করা' },
  { key: 'settings', label: 'Site Settings (সাইট সেটিংস)', desc: 'ডেলিভারি চার্জ, হটলাইন, পিক্সেল আইডি পরিবর্তন' },
  { key: 'pages', label: 'Dynamic Pages (ডাইনামিক পেজ)', desc: 'টার্মস অ্যান্ড কন্ডিশনস, প্রাইভেসি পলিসি পেজ এডিটিং' },
  { key: 'inventory', label: 'Inventory Stock (ইনভেন্টরি)', desc: 'স্টক ইন/আউট ট্রানজেকশন এন্ট্রি এবং লগ ভিউ' },
  { key: 'delete_orders', label: 'Delete Orders (অর্ডার ডিলেট)', desc: '⚠️ ক্রিটিকাল অ্যাকশন: অর্ডার ট্র্যাশে পাঠানো ও চিরতরে ডিলেট করা' },
  { key: 'website_changes', label: 'Website Changes (ক্রিটিকাল এডিট)', desc: '⚠️ ক্রিটিকাল অ্যাকশন: ব্যানার এডিট বা পিক্সেল সেটিং পরিবর্তন করা' },
  { key: 'manage_users', label: 'Manage Admin Users (ইউজার ম্যানেজমেন্ট)', desc: '⚠️ ক্রিটিকাল অ্যাকশন: সাব-এডমিন বা মডারেটরদের অ্যাড/এডিট করা' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Current logged in user info (to restrict actions)
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modal State
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [roleInput, setRoleInput] = useState<'admin' | 'moderator'>('moderator');
  const [permissionsInput, setPermissionsInput] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin123';
      const res = await fetch('/api/admin/users', {
        headers: {
          'x-admin-key': adminKey
        }
      });

      if (!res.ok) {
        throw new Error('Failed to load users');
      }

      const data = await res.json();
      setUsers(data || []);
    } catch (err) {
      console.error(err);
      showErrorAlert('ত্রুটি', 'ইউজারদের তালিকা লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('admin_user');
      if (userStr) {
        try {
          setCurrentUser(JSON.parse(userStr));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const handleOpenAddModal = () => {
    setSelectedUser(null);
    setUsernameInput('');
    setPasswordInput('');
    setRoleInput('moderator');
    setPermissionsInput(['dashboard', 'orders']);
    setShowModal(true);
  };

  const handleOpenEditModal = (user: AdminUser) => {
    setSelectedUser(user);
    setUsernameInput(user.username);
    setPasswordInput(user.password || '');
    setRoleInput(user.role);
    setPermissionsInput(user.permissions || []);
    setShowModal(true);
  };

  const handleTogglePermission = (key: string) => {
    setPermissionsInput(prev => 
      prev.includes(key) 
        ? prev.filter(p => p !== key) 
        : [...prev, key]
    );
  };

  const handleSelectAllPermissions = () => {
    if (permissionsInput.length === AVAILABLE_PERMISSIONS.length) {
      setPermissionsInput([]);
    } else {
      setPermissionsInput(AVAILABLE_PERMISSIONS.map(p => p.key));
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) {
      showErrorAlert('ত্রুটি', 'ইউজারনেম আবশ্যক');
      return;
    }
    if (!selectedUser && !passwordInput.trim()) {
      showErrorAlert('ত্রুটি', 'পাসওয়ার্ড আবশ্যক');
      return;
    }

    setSaving(true);
    try {
      const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin123';
      const body = {
        id: selectedUser?.id,
        username: usernameInput.trim().toLowerCase(),
        password: passwordInput.trim(),
        role: roleInput,
        permissions: roleInput === 'admin' ? AVAILABLE_PERMISSIONS.map(p => p.key) : permissionsInput,
      };

      const method = selectedUser ? 'PATCH' : 'POST';
      const res = await fetch('/api/admin/users', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
          'x-admin-username': currentUser?.username || 'admin'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save user');
      }

      showSuccessAlert('সফল!', selectedUser ? 'ইউজার সফলভাবে আপডেট করা হয়েছে।' : 'নতুন ইউজার সফলভাবে তৈরি করা হয়েছে।');
      setShowModal(false);
      fetchUsers(true);
    } catch (err: any) {
      console.error(err);
      showErrorAlert('সংরক্ষণ ব্যর্থ', err.message || 'ইউজার তথ্য সংরক্ষণ করা যায়নি।');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (user.username === 'admin') {
      showErrorAlert('ত্রুটি', 'মাস্টার এডমিন ইউজার ডিলেট করা সম্ভব নয়।');
      return;
    }

    const confirm = await showConfirmAlert(
      'ইউজার ডিলেট করতে চান?',
      `আপনি কি নিশ্চিত যে ইউজার "${user.username}" ডিলেট করতে চান? এই কাজ আর ফেরত আনা যাবে না।`,
      'হ্যাঁ, ডিলেট করুন'
    );

    if (!confirm.isConfirmed) return;

    try {
      const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin123';
      const res = await fetch(`/api/admin/users?id=${user.id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminKey,
          'x-admin-username': currentUser?.username || 'admin'
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      showSuccessAlert('ডিলেট হয়েছে!', 'ইউজার সফলভাবে মুছে ফেলা হয়েছে।');
      fetchUsers(true);
    } catch (err: any) {
      console.error(err);
      showErrorAlert('ডিলেট ব্যর্থ', err.message || 'ইউজার ডিলেট করা সম্ভব হয়নি।');
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-black font-sans">
      
      {/* Title Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-[#ff6b35]" /> Admin Users & Permissions
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            মডারেটর ও সাব-এডমিন তৈরি করুন, এবং কাকে কোন ফিচারের এক্সেস দিবেন তা সুনির্দিষ্ট করুন।
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchUsers(true)}
            disabled={refreshing}
            className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={16} className={`text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-[#ff6b35] hover:bg-[#e55520] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Plus size={14} /> Add Staff Account
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative bg-white p-3 rounded-2xl border border-gray-200/80 shadow-xs">
        <Search className="absolute left-6.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search staff members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] focus:bg-white transition-all text-black"
        />
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-2xl space-y-3">
          <RefreshCw className="animate-spin text-[#ff6b35]" size={30} />
          <span className="text-xs text-gray-500 font-medium">Loading user list...</span>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Security Role</th>
                  <th className="px-6 py-4">Allowed Permissions</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredUsers.map((user) => {
                  const isMaster = user.username === 'admin';

                  return (
                    <tr key={user.id} className="hover:bg-gray-50/50">
                      
                      {/* Username */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-gray-900 block">{user.username}</span>
                          {isMaster && (
                            <span className="bg-amber-50 text-amber-700 border border-amber-100 font-bold text-[9px] px-1.5 py-0.5 rounded-full shrink-0">
                              Master Account
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Security Role */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                          user.role === 'admin' 
                            ? 'bg-purple-50 text-purple-700 border-purple-100'
                            : 'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                          {user.role}
                        </span>
                      </td>

                      {/* Permissions List */}
                      <td className="px-6 py-4 max-w-sm">
                        {user.role === 'admin' ? (
                          <span className="text-gray-400 italic">সুপার এডমিন (সব ফিচারের সম্পূর্ণ এক্সেস)</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {user.permissions && user.permissions.length > 0 ? (
                              user.permissions.map(p => (
                                <span key={p} className="bg-gray-50 text-gray-600 border border-gray-150 px-1.5 py-0.5 rounded-lg text-[9px] font-bold">
                                  {p}
                                </span>
                              ))
                            ) : (
                              <span className="text-rose-500 italic font-medium">কোনো পারমিশন দেওয়া নেই</span>
                            )}
                          </div>
                        )}
                      </td>



                      {/* Action buttons */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-[#ff6b35] transition-all cursor-pointer"
                            title="Edit permissions"
                          >
                            <Edit2 size={14} />
                          </button>
                          {!isMaster && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-all cursor-pointer"
                              title="Delete account"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                      No staff accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* USER FORM MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-xl overflow-hidden shadow-2xl relative text-black">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {selectedUser ? 'Edit Staff Account (একাউন্ট এডিট)' : 'Add Staff Account (নতুন স্টাফ যুক্ত করুন)'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">মডারেটরদের নির্দিষ্ট ফিচারে অ্যাক্সেস কন্ট্রোল করুন</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveUser}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
                
                {/* Username & Password Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Username (ইউজারনেম)</label>
                    <input
                      type="text"
                      placeholder="e.g. rohim_mod"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      disabled={!!selectedUser && selectedUser.username === 'admin'}
                      className="w-full text-xs font-semibold text-gray-900 bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#ff6b35]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Password (পাসওয়ার্ড)</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={selectedUser ? 'পরিবর্তন না চাইলে ফাঁকা রাখুন' : '••••••••'}
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full text-xs font-semibold text-gray-900 bg-white border border-gray-200 rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:border-[#ff6b35]"
                        required={!selectedUser}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Role Selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Security Role (অ্যাকাউন্ট টাইপ)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRoleInput('moderator')}
                      disabled={!!selectedUser && selectedUser.username === 'admin'}
                      className={`py-3.5 px-4 text-center rounded-xl border-2 font-bold transition-all text-xs cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        roleInput === 'moderator'
                          ? 'border-[#ff6b35] bg-[#ff6b35]/5 text-[#ff6b35]'
                          : 'border-gray-200 text-gray-700 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="text-sm">Moderator (মডারেটর)</span>
                      <span className="text-[9px] font-medium opacity-80">সীমাবদ্ধ পারমিশন (রেস্ট্রিক্টেড ভিউ)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleInput('admin')}
                      disabled={!!selectedUser && selectedUser.username === 'admin'}
                      className={`py-3.5 px-4 text-center rounded-xl border-2 font-bold transition-all text-xs cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        roleInput === 'admin'
                          ? 'border-[#ff6b35] bg-[#ff6b35]/5 text-[#ff6b35]'
                          : 'border-gray-200 text-gray-700 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="text-sm">Admin (সহকারী এডমিন)</span>
                      <span className="text-[9px] font-medium opacity-80">সমস্ত ফিচার ও সেটিংসে সম্পূর্ণ অ্যাক্সেস</span>
                    </button>
                  </div>
                </div>

                {/* Permissions Selector Grid */}
                {roleInput === 'moderator' && (
                  <div className="space-y-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-wider">
                        Set Allowed Permissions (মডারেটর পারমিশন সেট করুন)
                      </label>
                      <button
                        type="button"
                        onClick={handleSelectAllPermissions}
                        className="text-[10px] font-black text-[#ff6b35] hover:text-[#ff5517] cursor-pointer"
                      >
                        {permissionsInput.length === AVAILABLE_PERMISSIONS.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {AVAILABLE_PERMISSIONS.map((perm) => {
                        const checked = permissionsInput.includes(perm.key);
                        const isCritical = perm.key === 'delete_orders' || perm.key === 'website_changes' || perm.key === 'manage_users';

                        return (
                          <div 
                            key={perm.key}
                            onClick={() => handleTogglePermission(perm.key)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                              checked 
                                ? isCritical 
                                  ? 'border-rose-300 bg-rose-50/20' 
                                  : 'border-amber-300 bg-amber-50/10'
                                : 'border-gray-150 bg-gray-50/20 hover:border-gray-300'
                            }`}
                          >
                            <button
                              type="button"
                              className={`shrink-0 mt-0.5 ${checked ? 'text-[#ff6b35]' : 'text-gray-300'}`}
                            >
                              {checked ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                            <div className="min-w-0">
                              <span className={`text-[11px] font-extrabold block ${isCritical ? 'text-rose-700' : 'text-gray-900'}`}>
                                {perm.label}
                              </span>
                              <span className="text-[9px] text-gray-400 font-medium block mt-0.5 leading-snug">
                                {perm.desc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* Actions Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#ff6b35] hover:bg-[#e55520] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <><RefreshCw size={14} className="animate-spin" /><span>Saving...</span></>
                  ) : (
                    <><Save size={14} /><span>Save Staff Settings</span></>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

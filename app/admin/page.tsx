'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'ভুল ইউজারনেম অথবা পাসওয়ার্ড');
      }

      const data = await res.json();
      if (data.success) {
        localStorage.setItem('admin_authenticated', 'true');
        localStorage.setItem('admin_user', JSON.stringify(data.user));
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'লগইন করতে ব্যর্থ হয়েছে');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4 relative overflow-hidden font-sans">
      
      {/* Soft warm radial brand glow (Top-Right) */}
      <div 
        className="absolute top-[-30%] right-[-15%] w-[800px] h-[800px] pointer-events-none opacity-40 select-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(255,107,53,0.12) 0%, rgba(255,255,255,0) 70%)',
          transform: 'rotate(-15deg) scaleY(0.7)'
        }}
      />
      
      {/* Additional soft bottom-left glow */}
      <div 
        className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] pointer-events-none opacity-20 select-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(255,107,53,0.05) 0%, rgba(255,255,255,0) 75%)',
        }}
      />
      
      {/* Frosted Light Glassmorphism Card */}
      <div className="w-full max-w-sm bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_24px_60px_rgba(0,0,0,0.05)] rounded-3xl p-8 relative z-10 animate-fade-in text-black">
        
        {/* Mockup Dot-Circle Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-gray-200 text-[#ff6b35] mb-4 shadow-sm">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current">
              <circle cx="12" cy="12" r="9" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="12" cy="12" r="5" strokeWidth="1.5" strokeDasharray="1.5 1.5" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-wide">Sign In</h1>
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
            Please enter your username and password to access the control panel.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2.5">
              Username / ইউজারনেম
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 font-bold text-xs">
                👤
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 text-sm focus:border-[#ff6b35] focus:outline-none focus:ring-1 focus:ring-[#ff6b35]/20 transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2.5">
              Security Password / পাসওয়ার্ড
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                <KeyRound size={16} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 text-sm focus:border-[#ff6b35] focus:outline-none focus:ring-1 focus:ring-[#ff6b35]/20 transition-all"
                required
              />
            </div>
            
            {error && (
              <div className="flex items-start gap-2 text-rose-600 text-xs mt-2 bg-rose-50 border border-rose-100 p-3 rounded-xl">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Primary Tactile Orange Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-b from-[#ff804e] to-[#ff6b35] hover:from-[#ff9268] hover:to-[#ff733d] text-white font-bold py-3.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(255,107,53,0.15)] active:scale-[0.98]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : 'Sign in'}
          </button>

        </form>
      </div>
    </div>
  );
}

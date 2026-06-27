'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, AlertCircle } from 'lucide-react';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('admin_authenticated', 'true');
      router.push('/admin/dashboard');
    } else {
      setError('ভুল পাসওয়ার্ড। আবার চেষ্টা করুন।');
      setLoading(false);
    }
  };

  const handleQuickLogin = () => {
    setLoading(true);
    setPassword(ADMIN_PASSWORD);
    localStorage.setItem('admin_authenticated', 'true');
    setTimeout(() => {
      router.push('/admin/dashboard');
    }, 800);
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
      <div className="w-full max-w-sm bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_24px_60px_rgba(0,0,0,0.05)] rounded-3xl p-8 relative z-10 animate-fade-in">
        
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
            Please enter your password to access the Origin Haat control panel.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2.5">
              Security Password
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

          {/* OR Divider */}
          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">OR</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Quick Login button styled like Google Sign-In (Tactile Light) */}
          <button
            type="button"
            onClick={handleQuickLogin}
            disabled={loading}
            className="w-full bg-gradient-to-b from-white to-[#f5f7fa] hover:from-white hover:to-[#edf0f5] border border-[#e2e4e8] text-gray-700 py-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 shrink-0" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Quick Admin Login</span>
          </button>

          <div className="text-center pt-2">
            <span className="text-[10px] text-gray-500 block">
              Demo credentials: <b>admin123</b>
            </span>
          </div>

        </form>
      </div>
    </div>
  );
}

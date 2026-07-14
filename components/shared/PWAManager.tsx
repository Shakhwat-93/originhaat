'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

declare global {
  interface Window {
    deferredPrompt: any;
  }
}

export default function PWAManager() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 1. Service Worker Handling
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
       window.location.hostname === '127.0.0.1' ||
       window.location.hostname.startsWith('192.168.'));

    if (isLocalhost) {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (let registration of registrations) {
            registration.unregister().then((success) => {
              if (success) console.log('Localhost Service Worker successfully unregistered for faster dev reloads.');
            });
          }
        });
      }
    } else {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('PWA Service Worker registered:', reg.scope))
          .catch((err) => console.error('PWA Service Worker registration failed:', err));
      }
    }

    // 2. Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setIsInstallable(true);
      window.dispatchEvent(new CustomEvent('pwa-installable'));
      
      // Auto-show banner if they haven't dismissed it in this session
      const dismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    const handleAppInstalled = () => {
      window.deferredPrompt = null;
      setIsInstallable(false);
      setShowBanner(false);
      window.dispatchEvent(new CustomEvent('pwa-installable'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Initial check (in case event fired before mount)
    if (window.deferredPrompt) {
      setIsInstallable(true);
      const dismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
      if (!dismissed) {
        setShowBanner(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = window.deferredPrompt;
    if (!promptEvent) return;

    // Show prompt
    promptEvent.prompt();
    
    // Wait for response
    const { outcome } = await promptEvent.userChoice;
    console.log(`PWA installation user response: ${outcome}`);
    
    // Clear prompt event
    window.deferredPrompt = null;
    setIsInstallable(false);
    setShowBanner(false);
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  };

  const handleClose = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  // Listen to custom installation events triggered from other buttons (e.g. headers, sidebars)
  useEffect(() => {
    const handleTriggerPrompt = () => {
      handleInstallClick();
    };

    window.addEventListener('trigger-pwa-install', handleTriggerPrompt);
    return () => {
      window.removeEventListener('trigger-pwa-install', handleTriggerPrompt);
    };
  }, []);

  if (!showBanner || !isInstallable) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:w-96 bg-gray-900 border border-gray-800 text-white rounded-2xl p-4.5 shadow-[0_16px_40px_rgba(0,0,0,0.3)] z-50 flex items-start gap-3.5 animate-slide-in">
      <div className="w-10 h-10 rounded-xl bg-[#ff6b35] flex items-center justify-center shrink-0 shadow-lg shadow-[#ff6b35]/20">
        <Download size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold tracking-tight">Origin Haat App ইনস্টল করুন</h4>
        <p className="text-xs text-gray-400 mt-0.5 leading-normal font-sans">
          সহজে কেনাকাটা ও দ্রুত অ্যাক্সেসের জন্য আমাদের অফিসিয়াল অ্যাপ ডাউনলোড করুন।
        </p>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleInstallClick}
            className="px-4 py-2 bg-[#ff6b35] hover:bg-[#e55520] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            ইনস্টল করুন
          </button>
          <button
            onClick={handleClose}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            পরে করুন
          </button>
        </div>
      </div>
      <button
        onClick={handleClose}
        className="p-1 hover:bg-gray-800 text-gray-500 hover:text-gray-300 rounded-lg transition-colors cursor-pointer shrink-0"
      >
        <X size={15} />
      </button>
    </div>
  );
}

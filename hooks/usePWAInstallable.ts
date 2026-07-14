'use client';

import { useState, useEffect } from 'react';

export function usePWAInstallable() {
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const checkPrompt = () => {
      setIsInstallable(!!(typeof window !== 'undefined' && window.deferredPrompt));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', checkPrompt);
      window.addEventListener('appinstalled', checkPrompt);
      window.addEventListener('pwa-installable', checkPrompt);
      
      // Initial check
      checkPrompt();
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeinstallprompt', checkPrompt);
        window.removeEventListener('appinstalled', checkPrompt);
        window.removeEventListener('pwa-installable', checkPrompt);
      }
    };
  }, []);

  const installApp = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('trigger-pwa-install'));
    }
  };

  return { isInstallable, installApp };
}

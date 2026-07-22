'use client';

import dynamic from 'next/dynamic';

const MobileBottomNav = dynamic(
  () => import('@/components/shared/MobileBottomNav').then((mod) => mod.MobileBottomNav),
  { ssr: false }
);

const FloatingCartWidget = dynamic(
  () => import('@/components/shared/FloatingCartWidget').then((mod) => mod.FloatingCartWidget),
  { ssr: false }
);

const ChatWidget = dynamic(
  () => import('@/components/shared/ChatWidget').then((mod) => mod.ChatWidget),
  { ssr: false }
);

import { useEffect } from 'react';

interface ClientWidgetsProps {
  whatsappNumber: string;
  hotlineNumber: string;
  isLiveChatActive?: boolean;
  whatsappDefaultMessage?: string;
}

export function ClientWidgets({ whatsappNumber, hotlineNumber, isLiveChatActive = true, whatsappDefaultMessage }: ClientWidgetsProps) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get('utm_source');
      const utmMedium = urlParams.get('utm_medium');
      const utmCampaign = urlParams.get('utm_campaign');

      if (utmSource) {
        sessionStorage.setItem('utm_source', utmSource);
        if (utmMedium) sessionStorage.setItem('utm_medium', utmMedium);
        if (utmCampaign) sessionStorage.setItem('utm_campaign', utmCampaign);
      }
    }
  }, []);

  return (
    <>
      <MobileBottomNav />
      <FloatingCartWidget />
      {isLiveChatActive && <ChatWidget whatsappNumber={whatsappNumber} hotlineNumber={hotlineNumber} whatsappDefaultMessage={whatsappDefaultMessage} />}
    </>
  );
}

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

interface ClientWidgetsProps {
  whatsappNumber: string;
}

export function ClientWidgets({ whatsappNumber }: ClientWidgetsProps) {
  return (
    <>
      <MobileBottomNav />
      <FloatingCartWidget />
      <ChatWidget whatsappNumber={whatsappNumber} />
    </>
  );
}

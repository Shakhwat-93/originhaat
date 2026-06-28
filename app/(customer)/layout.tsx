import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { RecentOrderPopup } from '@/components/shared/RecentOrderPopup';
import { MobileBottomNav } from '@/components/shared/MobileBottomNav';
import { FloatingCartWidget } from '@/components/shared/FloatingCartWidget';
import { ChatWidget } from '@/components/shared/ChatWidget';
import { getSettings } from '@/lib/db';

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  const whatsappNumber = settings?.whatsapp_number || '8801700000000';

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50/50">{children}</main>
      <Footer />
      <RecentOrderPopup />
      <MobileBottomNav />
      <FloatingCartWidget />
      <ChatWidget whatsappNumber={whatsappNumber} />
    </>
  );
}

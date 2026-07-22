import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ClientWidgets } from '@/components/shared/ClientWidgets';
import { getSettings } from '@/lib/db';

export const revalidate = 30; // cache layout for 30 seconds

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  const whatsappNumber = settings?.whatsapp_number || '8801700000000';
  const whatsappDefaultMessage = settings?.whatsapp_default_message || 'হ্যালো! আমি Origin Haat থেকে সাহায্য চাই।';
  const hotlineNumber = settings?.hotline_number || '01700000000';
  const isLiveChatActive = settings?.is_live_chat_active ?? true;

  const priceColor = settings?.price_color || '#12b76a';
  const badgeColor = settings?.badge_color || '#ff6b35';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --price-color: ${priceColor};
          --badge-color: ${badgeColor};
        }
      `}} />
      <Header initialSettings={settings || undefined} />
      <main className="min-h-screen bg-slate-50/50">{children}</main>
      <Footer settings={settings || undefined} />

      <ClientWidgets whatsappNumber={whatsappNumber} hotlineNumber={hotlineNumber} isLiveChatActive={isLiveChatActive} whatsappDefaultMessage={whatsappDefaultMessage} />
    </>
  );
}


import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ClientWidgets } from '@/components/shared/ClientWidgets';
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

      <ClientWidgets whatsappNumber={whatsappNumber} />
    </>
  );
}


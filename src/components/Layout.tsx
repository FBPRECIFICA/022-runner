import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Header } from './Header';
import { Footer } from './Footer';
import { ChatBot } from './ChatBot';
import { MobileBottomNav } from './MobileBottomNav';
import { WhatsAppButton } from './WhatsAppButton';

export function Layout() {
  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <ChatBot />
      <MobileBottomNav />
      <WhatsAppButton />
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid #C9A84C' },
        success: { iconTheme: { primary: '#C9A84C', secondary: '#000' } },
      }} />
    </div>
  );
}

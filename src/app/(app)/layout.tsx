import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header } from '@/components/layout/Header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Header />
      <main className="min-h-[calc(100vh-56px)]">{children}</main>
    </AuthGuard>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth/use-session';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

export function Header() {
  const router = useRouter();
  const { user } = useSession();

  const onLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message);
      return;
    }

    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
        <Link href="/dashboard" className="text-sm font-semibold text-neutral-900">
          Mean록
        </Link>
        <div className="flex items-center gap-3 text-sm text-neutral-600">
          <span>{user?.email ?? '익명'}</span>
          <Button type="button" variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="mr-1 h-4 w-4" />
            로그아웃
          </Button>
        </div>
      </div>
    </header>
  );
}

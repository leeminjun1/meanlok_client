'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth/use-session';
import { Skeleton } from '@/components/ui/Skeleton';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading && !session) {
      const next = encodeURIComponent(pathname || '/dashboard');
      router.replace(`/login?next=${next}`);
    }
  }, [loading, pathname, router, session]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-24 w-full" />
        <Skeleton className="mt-3 h-24 w-full" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}

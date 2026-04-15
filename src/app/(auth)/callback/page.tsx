'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) {
      return;
    }
    handled.current = true;

    const code = searchParams.get('code');
    const next = searchParams.get('next');
    const isSafe = (p: string | null) => !!p && /^\/(?!\/)/.test(p);
    const redirectTo = isSafe(next) ? next! : '/dashboard';

    if (!code) {
      router.replace('/login');
      return;
    }

    // onAuthStateChange로 세션 확정 후 이동
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe();
          router.replace(redirectTo);
        }
      },
    );

    supabase.auth.exchangeCodeForSession(code).catch(() => {
      subscription.unsubscribe();
      router.replace('/login');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
      <p className="text-sm text-neutral-500">로그인 처리 중…</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
          <p className="text-sm text-neutral-500">로그인 처리 중…</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}

'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth/use-session';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function LandingPage() {
  const router = useRouter();
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading && session) {
      router.replace('/dashboard');
    }
  }, [loading, router, session]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl p-10">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="mt-4 h-40 w-full" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-20">
      <div className="w-full rounded-2xl border border-neutral-200 bg-white p-10 shadow-sm">
        <p className="text-sm text-neutral-500">Mean록</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-neutral-900">
          문서와 페이지를 단순하게 정리하는 워크스페이스
        </h1>
        <p className="mt-4 max-w-2xl text-neutral-600">
          페이지 트리, 복제/이동, Markdown/HTML 편집, 그리고 AI 보조 작성까지
          핵심만 담은 노션형 서비스입니다.
        </p>

        <div className="mt-8 flex gap-3">
          <Link href="/login">
            <Button>로그인</Button>
          </Link>
          <Link href="/signup">
            <Button variant="outline">회원가입</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const loginSchema = z.object({
  email: z.string().email('이메일 형식이 올바르지 않습니다.'),
  password: z.string().min(6, '비밀번호는 최소 6자입니다.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const isSafePath = (p: string | null | undefined) => !!p && /^\/(?!\/)/.test(p);

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get('next');
  const nextPath = isSafePath(rawNext) ? rawNext! : '/dashboard';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await supabase.auth.signInWithPassword(values);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    if (!result.data.session) {
      toast.error('세션이 발급되지 않았습니다. 이메일 인증 필요 여부를 확인하세요.');
      return;
    }

    toast.success('로그인했습니다.');
    router.push(nextPath);
  });

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-neutral-900">로그인</h1>
      <p className="mt-1 text-sm text-neutral-500">Mean록 워크스페이스로 이동합니다.</p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-1 text-sm">
          <span className="text-neutral-600">이메일</span>
          <Input type="email" {...form.register('email')} />
          <span className="text-xs text-red-600">{form.formState.errors.email?.message}</span>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-neutral-600">비밀번호</span>
          <Input type="password" {...form.register('password')} />
          <span className="text-xs text-red-600">{form.formState.errors.password?.message}</span>
        </label>

        <Button className="w-full" disabled={form.formState.isSubmitting}>
          로그인
        </Button>
      </form>

      <p className="mt-4 text-sm text-neutral-500">
        계정이 없나요?{' '}
        <Link href="/signup" className="text-neutral-800 underline">
          회원가입
        </Link>
      </p>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm" />}
    >
      <LoginForm />
    </Suspense>
  );
}

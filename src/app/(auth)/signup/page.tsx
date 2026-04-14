'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const signupSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요.'),
  email: z.string().email('이메일 형식이 올바르지 않습니다.'),
  password: z.string().min(6, '비밀번호는 최소 6자입니다.'),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const { error, data } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          name: values.name,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.session) {
      toast.success('회원가입 완료');
      router.push('/dashboard');
      return;
    }

    toast.success('이메일 인증을 확인하세요');
    router.push('/login');
  });

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-neutral-900">회원가입</h1>
      <p className="mt-1 text-sm text-neutral-500">새 워크스페이스를 시작하세요.</p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-1 text-sm">
          <span className="text-neutral-600">이름</span>
          <Input {...form.register('name')} />
          <span className="text-xs text-red-600">{form.formState.errors.name?.message}</span>
        </label>

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
          회원가입
        </Button>
      </form>

      <p className="mt-4 text-sm text-neutral-500">
        이미 계정이 있나요?{' '}
        <Link href="/login" className="text-neutral-800 underline">
          로그인
        </Link>
      </p>
    </section>
  );
}

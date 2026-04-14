'use client';

import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { acceptInvite } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/error';
import { useSession } from '@/lib/auth/use-session';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { session, loading } = useSession();
  const startedRef = useRef(false);

  const acceptMutation = useMutation({
    mutationFn: () => acceptInvite({ token }),
    onSuccess: (data) => {
      toast.success('초대를 수락했습니다.');
      router.replace(`/w/${data.workspaceId}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
      router.replace('/dashboard');
    },
  });

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!session) {
      router.replace(`/login?next=${encodeURIComponent(`/invites/${token}`)}`);
      return;
    }

    if (!startedRef.current) {
      startedRef.current = true;
      acceptMutation.mutate();
    }
  }, [acceptMutation, loading, router, session, token]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center justify-center px-4">
      <div className="w-full rounded-lg border border-neutral-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-neutral-900">초대 처리 중</h1>
        <p className="mt-2 text-sm text-neutral-600">
          워크스페이스 초대를 확인하고 있습니다.
        </p>
        <Skeleton className="mt-4 h-10 w-full" />
      </div>
    </main>
  );
}

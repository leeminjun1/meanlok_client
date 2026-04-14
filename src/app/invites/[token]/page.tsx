'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { acceptInvite, getInvitePreview } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/error';
import { useSession } from '@/lib/auth/use-session';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { session, loading } = useSession();

  const previewQuery = useQuery({
    queryKey: ['invite-preview', token],
    queryFn: () => getInvitePreview(token),
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptInvite({ token }),
    onSuccess: (data) => {
      toast.success('초대를 수락했습니다.');
      router.replace(`/w/${data.workspaceId}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const workspaceName = useMemo(
    () => previewQuery.data?.workspaceName || '워크스페이스',
    [previewQuery.data?.workspaceName],
  );

  const actionLabel = `${workspaceName} 참여하기`;

  const onPrimaryClick = () => {
    if (!session) {
      router.push(`/login?next=${encodeURIComponent(`/invites/${token}`)}`);
      return;
    }

    acceptMutation.mutate();
  };

  const preview = previewQuery.data;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center justify-center px-4">
      <div className="w-full rounded-lg border border-neutral-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-neutral-900">워크스페이스 초대</h1>

        {loading || previewQuery.isLoading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : previewQuery.isError ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-red-600">{getErrorMessage(previewQuery.error)}</p>
            <Button variant="outline" onClick={() => router.replace('/dashboard')}>
              대시보드로 이동
            </Button>
          </div>
        ) : !preview ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-neutral-600">초대 정보를 불러오지 못했습니다.</p>
            <Button variant="outline" onClick={() => router.replace('/dashboard')}>
              대시보드로 이동
            </Button>
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-sm font-medium text-neutral-800">{workspaceName}</p>
              <p className="mt-1 text-xs text-neutral-600">초대 권한: {preview.role}</p>
            </div>

            <p className="text-sm text-neutral-600">
              버튼을 누르면 워크스페이스 초대를 수락합니다.
            </p>

            <div className="flex gap-2">
              <Button
                onClick={onPrimaryClick}
                disabled={acceptMutation.isPending}
                className="flex-1"
              >
                {session ? actionLabel : '로그인 후 계속'}
              </Button>
              <Button variant="outline" onClick={() => router.replace('/dashboard')}>
                취소
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

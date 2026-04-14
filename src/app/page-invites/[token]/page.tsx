'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { acceptPageInvite, getPageInvitePreview } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/error';
import { useSession } from '@/lib/auth/use-session';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AcceptPageInvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { session, loading } = useSession();

  const previewQuery = useQuery({
    queryKey: ['page-invite-preview', token],
    queryFn: () => getPageInvitePreview(token),
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptPageInvite({ token }),
    onSuccess: (data) => {
      if (data.status === 'requested') {
        toast.success('권한 요청을 보냈습니다. 승인되면 페이지에 접근할 수 있습니다.');
        router.replace('/dashboard');
        return;
      }

      toast.success('공유 페이지에 접근합니다.');
      router.replace(`/w/${data.workspaceId}/p/${data.pageId}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const targetName = useMemo(
    () => previewQuery.data?.pageTitle || previewQuery.data?.workspaceName || '페이지',
    [previewQuery.data?.pageTitle, previewQuery.data?.workspaceName],
  );

  const actionLabel = useMemo(() => {
    if (previewQuery.data?.linkInviteMode === 'REQUEST') {
      return `${targetName}에 권한 요청하기`;
    }

    return `${targetName} 열기`;
  }, [previewQuery.data?.linkInviteMode, targetName]);

  const onPrimaryClick = () => {
    if (!session) {
      router.push(`/login?next=${encodeURIComponent(`/page-invites/${token}`)}`);
      return;
    }

    acceptMutation.mutate();
  };

  const preview = previewQuery.data;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center justify-center px-4">
      <div className="w-full rounded-lg border border-neutral-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-neutral-900">공유 페이지 초대</h1>

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
              <p className="text-sm font-medium text-neutral-800">{targetName}</p>
              <p className="mt-1 text-xs text-neutral-600">
                워크스페이스: {preview.workspaceName}
              </p>
            </div>

            <p className="text-sm text-neutral-600">
              {preview.linkInviteMode === 'REQUEST'
                ? '버튼을 누르면 페이지 접근 권한 요청이 전송됩니다.'
                : '버튼을 누르면 공유 페이지로 이동합니다.'}
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

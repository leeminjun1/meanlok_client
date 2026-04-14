'use client';

import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createPage,
  getWorkspacePublicInfo,
  listPages,
} from '@/lib/api/endpoints';
import { Button } from '@/components/ui/Button';

export default function WorkspaceHomePage() {
  const router = useRouter();
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;

  const workspaceQuery = useQuery({
    queryKey: ['workspace-public-info', workspaceId],
    queryFn: () => getWorkspacePublicInfo(workspaceId),
  });
  const pagesQuery = useQuery({
    queryKey: ['pages', workspaceId],
    queryFn: () => listPages(workspaceId),
  });

  const createPageMutation = useMutation({
    mutationFn: () => createPage(workspaceId, { title: '새 페이지' }),
    onSuccess: (page) => {
      router.push(`/w/${workspaceId}/p/${page.id}`);
    },
  });

  const canCreateRoot =
    pagesQuery.data?.viewerRole === 'MEMBER' &&
    pagesQuery.data.memberRole !== 'VIEWER';

  return (
    <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6">
      <h1 className="text-xl font-semibold text-neutral-900">
        {workspaceQuery.data?.name ?? '워크스페이스'}
      </h1>
      <p className="text-sm text-neutral-600">
        좌측 트리에서 페이지를 관리하거나 새 페이지를 바로 생성할 수 있습니다.
      </p>
      <Button
        onClick={() => createPageMutation.mutate()}
        disabled={createPageMutation.isPending || !canCreateRoot}
      >
        새 페이지
      </Button>
    </section>
  );
}

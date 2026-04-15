'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { listPages, getWorkspacePublicInfo } from '@/lib/api/endpoints';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { PageTree } from '@/components/page-tree/PageTree';
import { Skeleton } from '@/components/ui/Skeleton';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;

  const workspaceQuery = useQuery({
    queryKey: ['workspace-public-info', workspaceId],
    queryFn: () => getWorkspacePublicInfo(workspaceId),
    staleTime: 2 * 60 * 1000,
  });

  const pagesQuery = useQuery({
    queryKey: ['pages', workspaceId],
    queryFn: () => listPages(workspaceId),
    staleTime: 60 * 1000,
  });

  return (
    <div className="flex h-[calc(100vh-56px)] bg-neutral-50">
      <div className="w-[260px] border-r border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-3 py-2">
          {workspaceQuery.isLoading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <p className="truncate text-sm font-semibold text-neutral-800">
              {workspaceQuery.data?.name ?? '워크스페이스'}
            </p>
          )}

          {pagesQuery.data?.viewerRole === 'MEMBER' ? (
            <Link
              href={`/w/${workspaceId}/members`}
              className="mt-1 inline-block text-xs text-neutral-500 hover:text-neutral-800"
            >
              멤버 관리
            </Link>
          ) : null}
        </div>
        <PageTree workspaceId={workspaceId} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-neutral-200 bg-white px-4 py-3">
          <Breadcrumb />
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

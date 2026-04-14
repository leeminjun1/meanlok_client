'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getPage, getWorkspacePublicInfo } from '@/lib/api/endpoints';
import { Skeleton } from '@/components/ui/Skeleton';

export function Breadcrumb() {
  const params = useParams<{ workspaceId?: string; pageId?: string }>();
  const workspaceId = params.workspaceId;
  const pageId = params.pageId;

  const workspaceQuery = useQuery({
    queryKey: ['workspace-public-info', workspaceId],
    queryFn: () => getWorkspacePublicInfo(workspaceId as string),
    enabled: Boolean(workspaceId),
  });

  const pageQuery = useQuery({
    queryKey: ['page', workspaceId, pageId],
    queryFn: () => getPage(workspaceId as string, pageId as string),
    enabled: Boolean(workspaceId && pageId),
  });

  if (workspaceQuery.isLoading || (pageId && pageQuery.isLoading)) {
    return <Skeleton className="h-5 w-56" />;
  }

  return (
    <nav className="flex items-center gap-2 text-sm text-neutral-500">
      <Link href="/dashboard" className="hover:text-neutral-800">
        대시보드
      </Link>
      <span>/</span>
      {workspaceId ? (
        <Link href={`/w/${workspaceId}`} className="hover:text-neutral-800">
          {workspaceQuery.data?.name ?? '워크스페이스'}
        </Link>
      ) : (
        <span>워크스페이스</span>
      )}
      {pageId ? (
        <>
          <span>/</span>
          <span className="text-neutral-700">{pageQuery.data?.title ?? '페이지'}</span>
        </>
      ) : null}
    </nav>
  );
}

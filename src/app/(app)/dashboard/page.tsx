'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listSharedPages, listWorkspaces } from '@/lib/api/endpoints';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { CreateWorkspaceModal } from '@/components/modals/CreateWorkspaceModal';

export default function DashboardPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const workspacesQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
  });
  const sharedPagesQuery = useQuery({
    queryKey: ['shared-pages'],
    queryFn: listSharedPages,
  });

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">내 워크스페이스</h1>
        <Button onClick={() => setCreateOpen(true)}>새 워크스페이스</Button>
      </div>

      {workspacesQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(workspacesQuery.data ?? []).map((workspace) => (
            <Link
              key={workspace.id}
              href={`/w/${workspace.id}`}
              className="rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-300"
            >
              <p className="text-base font-medium text-neutral-900">{workspace.name}</p>
              <p className="mt-2 text-xs text-neutral-500">ID: {workspace.id}</p>
            </Link>
          ))}
          {workspacesQuery.data?.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">
              워크스페이스가 없습니다. 새로 생성해 주세요.
            </p>
          ) : null}
        </div>
      )}

      {(sharedPagesQuery.data?.length ?? 0) > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-neutral-900">공유받은 페이지</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {sharedPagesQuery.data?.map((item) => (
              <Link
                key={`${item.workspace.id}-${item.page.id}`}
                href={`/w/${item.workspace.id}/p/${item.page.id}`}
                className="rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-300"
              >
                <p className="text-xs text-neutral-500">{item.workspace.name}</p>
                <p className="mt-1 text-base font-medium text-neutral-900">
                  {item.page.icon ? `${item.page.icon} ` : ''}
                  {item.page.title}
                </p>
                <p className="mt-2 text-xs text-neutral-500">권한: {item.role}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <CreateWorkspaceModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </section>
  );
}

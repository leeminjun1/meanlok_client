'use client';

import { Eye, Pencil } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPageMeta } from '@/lib/api/endpoints';
import { SharePageModal } from '@/components/modals/SharePageModal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

const HybridEditor = dynamic(
  () => import('@/components/editor/HybridEditor').then((module) => module.HybridEditor),
  {
    loading: () => (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    ),
  },
);

const PageDocumentPreview = dynamic(
  () =>
    import('@/components/editor/PageDocumentPreview').then(
      (module) => module.PageDocumentPreview,
    ),
  {
    loading: () => (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    ),
  },
);

const AIPanel = dynamic(
  () => import('@/components/ai/AIPanel').then((module) => module.AIPanel),
  {
    loading: () => <div className="w-[340px] border-l border-neutral-200 bg-white" />,
  },
);

export default function PageEditorPage() {
  const params = useParams<{ workspaceId: string; pageId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const workspaceId = params.workspaceId;
  const pageId = params.pageId;
  const [shareOpen, setShareOpen] = useState(false);

  const pageQuery = useQuery({
    queryKey: ['page-meta', workspaceId, pageId],
    queryFn: () => getPageMeta(workspaceId, pageId),
    staleTime: 30 * 1000,
  });
  const canEdit = pageQuery.data?.accessRole === 'EDITOR';
  const canShare = canEdit;
  const isEditMode = searchParams.get('mode') === 'edit';
  const editorMode = canEdit && isEditMode ? 'edit' : 'view';

  const setEditorMode = (nextMode: 'view' | 'edit') => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (nextMode === 'edit') {
      nextSearchParams.set('mode', 'edit');
    } else {
      nextSearchParams.delete('mode');
    }

    const queryString = nextSearchParams.toString();
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  return (
    <>
      <div className="mb-3 flex justify-end gap-2">
        <Button
          variant={editorMode === 'edit' ? 'default' : 'outline'}
          onClick={() => setEditorMode(editorMode === 'edit' ? 'view' : 'edit')}
          disabled={!canEdit}
          className="gap-1.5"
        >
          {editorMode === 'edit' ? (
            <>
              <Eye className="h-4 w-4" />
              미리보기
            </>
          ) : (
            <>
              <Pencil className="h-4 w-4" />
              수정
            </>
          )}
        </Button>
        <Button variant="outline" onClick={() => setShareOpen(true)} disabled={!canShare}>
          공유
        </Button>
      </div>
      <div className="flex h-full rounded-lg border border-neutral-200 bg-white">
        <div className="min-w-0 flex-1 p-4">
          {editorMode === 'edit' ? (
            <HybridEditor workspaceId={workspaceId} pageId={pageId} mode="edit" />
          ) : (
            <PageDocumentPreview workspaceId={workspaceId} pageId={pageId} />
          )}
        </div>
        {editorMode === 'edit' ? <AIPanel /> : null}
      </div>
      <SharePageModal
        workspaceId={workspaceId}
        pageId={pageId}
        pageTitle={pageQuery.data?.title ?? '페이지'}
        open={shareOpen && canShare}
        onClose={() => setShareOpen(false)}
      />
    </>
  );
}

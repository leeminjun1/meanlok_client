'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPage } from '@/lib/api/endpoints';
import { HybridEditor } from '@/components/editor/HybridEditor';
import { AIPanel } from '@/components/ai/AIPanel';
import { SharePageModal } from '@/components/modals/SharePageModal';
import { Button } from '@/components/ui/Button';

export default function PageEditorPage() {
  const params = useParams<{ workspaceId: string; pageId: string }>();
  const workspaceId = params.workspaceId;
  const pageId = params.pageId;
  const [shareOpen, setShareOpen] = useState(false);

  const pageQuery = useQuery({
    queryKey: ['page', workspaceId, pageId],
    queryFn: () => getPage(workspaceId, pageId),
  });
  const canShare = pageQuery.data?.accessRole === 'EDITOR';

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button variant="outline" onClick={() => setShareOpen(true)} disabled={!canShare}>
          공유
        </Button>
      </div>
      <div className="flex h-full rounded-lg border border-neutral-200 bg-white">
        <div className="min-w-0 flex-1 p-4">
          <HybridEditor workspaceId={workspaceId} pageId={pageId} />
        </div>
        <AIPanel text={pageQuery.data?.document?.body ?? ''} />
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

'use client';

import { useQuery } from '@tanstack/react-query';
import { getPage } from '@/lib/api/endpoints';
import { MarkdownView } from '@/components/editor/MarkdownView';
import { Skeleton } from '@/components/ui/Skeleton';
import { optimizeHtmlImageTagsForPreview } from '@/lib/editor/image-html';
import { resolveStoredImageReferences } from '@/lib/editor/image-ref';
import { sanitizeHtml } from '@/lib/sanitize';
import type { DocFormat } from '@/types';

interface PageDocumentPreviewProps {
  workspaceId: string;
  pageId: string;
}

function PreviewBody({ body, format }: { body: string; format: DocFormat }) {
  const normalizedBody = resolveStoredImageReferences(body);

  if (format === 'HTML') {
    const clean = sanitizeHtml(
      optimizeHtmlImageTagsForPreview(normalizedBody),
    );
    return (
      <div
        className="prose prose-sm max-w-none text-neutral-800"
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }

  return <MarkdownView body={normalizedBody} />;
}

export function PageDocumentPreview({ workspaceId, pageId }: PageDocumentPreviewProps) {
  const pageQuery = useQuery({
    queryKey: ['page', workspaceId, pageId],
    queryFn: () => getPage(workspaceId, pageId),
    staleTime: 3 * 1000,
    refetchOnMount: true,
  });

  if (pageQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const body = pageQuery.data?.document?.body ?? '';
  const format: DocFormat = pageQuery.data?.document?.format === 'HTML' ? 'HTML' : 'MARKDOWN';

  return (
    <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-neutral-700">미리보기</span>
        <span className="text-neutral-500">{format === 'MARKDOWN' ? 'Markdown' : 'HTML'}</span>
      </div>
      <div className="min-h-[320px] rounded-md border border-neutral-200 bg-neutral-50 p-4">
        <PreviewBody body={body} format={format} />
      </div>
    </section>
  );
}

'use client';

import { useMemo } from 'react';
import { marked } from 'marked';
import { optimizeHtmlImageTagsForPreview } from '@/lib/editor/image-html';
import { resolveStoredImageReferences } from '@/lib/editor/image-ref';
import { sanitizeHtml } from '@/lib/sanitize';

interface MarkdownViewProps {
  body: string;
}

export function MarkdownView({ body }: MarkdownViewProps) {
  const normalizedBody = useMemo(
    () => resolveStoredImageReferences(body ?? ''),
    [body],
  );
  const html = useMemo(
    () =>
      sanitizeHtml(
        optimizeHtmlImageTagsForPreview(
          marked.parse(normalizedBody, { async: false }) as string,
        ),
      ),
    [normalizedBody],
  );

  return (
    <div
      className="prose prose-sm max-w-none text-neutral-800"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

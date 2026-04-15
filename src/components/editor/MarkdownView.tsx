'use client';

import { useMemo } from 'react';
import { marked } from 'marked';
import { sanitizeHtml } from '@/lib/sanitize';

interface MarkdownViewProps {
  body: string;
}

export function MarkdownView({ body }: MarkdownViewProps) {
  const html = useMemo(
    () => sanitizeHtml(marked.parse(body ?? '', { async: false }) as string),
    [body],
  );

  return (
    <div
      className="prose prose-sm max-w-none text-neutral-800"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

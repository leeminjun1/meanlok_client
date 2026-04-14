'use client';

import { marked } from 'marked';
import { sanitizeHtml } from '@/lib/sanitize';

interface MarkdownViewProps {
  body: string;
}

export function MarkdownView({ body }: MarkdownViewProps) {
  const parsed = marked.parse(body ?? '', { async: false }) as string;
  const clean = sanitizeHtml(parsed);

  return (
    <div
      className="prose prose-sm max-w-none text-neutral-800"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

'use client';

import { marked } from 'marked';
import { sanitizeHtml } from '@/lib/sanitize';

interface MarkdownViewProps {
  body: string;
}

function escapeHtml(raw: string) {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function MarkdownView({ body }: MarkdownViewProps) {
  // In Markdown mode, treat raw HTML tags as plain text.
  const parsed = marked.parse(escapeHtml(body ?? ''), { async: false }) as string;
  const clean = sanitizeHtml(parsed);

  return (
    <div
      className="prose prose-sm max-w-none text-neutral-800"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

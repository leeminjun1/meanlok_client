import { marked } from 'marked';
import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
});

export function htmlToMarkdown(html: string): string {
  if (!html.trim()) {
    return '';
  }

  return turndown.turndown(html);
}

export function markdownToHtml(md: string): string {
  if (!md.trim()) {
    return '';
  }

  return marked.parse(md, { async: false }) as string;
}

export function convertBody(
  body: string,
  from: 'MARKDOWN' | 'HTML',
  to: 'MARKDOWN' | 'HTML',
): string {
  if (from === to) {
    return body;
  }

  if (from === 'HTML' && to === 'MARKDOWN') {
    return htmlToMarkdown(body);
  }

  if (from === 'MARKDOWN' && to === 'HTML') {
    return markdownToHtml(body);
  }

  return body;
}

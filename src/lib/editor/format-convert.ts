import { marked } from 'marked';
import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
});

function hasMeanlokClass(node: Element, expectedClass: string) {
  const className = node.getAttribute('class') ?? '';
  return className.split(/\s+/).includes(expectedClass);
}

turndown.addRule('meanlokCallout', {
  filter: (node) =>
    node.nodeName === 'DIV' &&
    hasMeanlokClass(node as Element, 'ml-callout'),
  replacement: (_content, node) => `\n\n${(node as Element).outerHTML}\n\n`,
});

turndown.addRule('meanlokHighlight', {
  filter: (node) =>
    node.nodeName === 'DIV' &&
    hasMeanlokClass(node as Element, 'ml-highlight'),
  replacement: (_content, node) => `\n\n${(node as Element).outerHTML}\n\n`,
});

turndown.addRule('meanlokBadge', {
  filter: (node) =>
    node.nodeName === 'SPAN' &&
    hasMeanlokClass(node as Element, 'ml-badge'),
  replacement: (_content, node) => (node as Element).outerHTML,
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

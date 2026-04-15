import DOMPurify from 'isomorphic-dompurify';

let sanitizeHooksInstalled = false;
const SAFE_URI_PATTERN = /^(?:https?:|mailto:|#|\/|meanlok-image:)/i;

function isSafeUri(value: string) {
  const normalized = value.trim().replace(/^['"]|['"]$/g, '');
  return SAFE_URI_PATTERN.test(normalized);
}

function normalizeSrcSet(value: string) {
  const safeEntries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [urlPart, descriptorPart] = entry.split(/\s+/, 2);
      if (!urlPart || !isSafeUri(urlPart)) {
        return null;
      }
      return descriptorPart ? `${urlPart} ${descriptorPart}` : urlPart;
    })
    .filter((entry): entry is string => Boolean(entry));

  return safeEntries.length ? safeEntries.join(', ') : null;
}

function ensureSanitizeHooks() {
  if (sanitizeHooksInstalled) {
    return;
  }

  DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
    const attribute = data.attrName?.toLowerCase() ?? '';
    if (attribute.startsWith('on') || attribute === 'style') {
      data.keepAttr = false;
      return;
    }

    if (attribute === 'href' || attribute === 'src') {
      if (!isSafeUri(data.attrValue ?? '')) {
        data.keepAttr = false;
      }
      return;
    }

    if (attribute === 'srcset') {
      const normalized = normalizeSrcSet(data.attrValue ?? '');
      if (!normalized) {
        data.keepAttr = false;
        return;
      }
      data.attrValue = normalized;
    }
  });

  sanitizeHooksInstalled = true;
}

export function sanitizeHtml(html: string): string {
  ensureSanitizeHooks();

  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['style'],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#|\/|meanlok-image:)/i,
    ALLOW_DATA_ATTR: false,
  });
}

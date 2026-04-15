import {
  buildStoredImageSrcSet,
  resolveStoredImageReference,
} from '@/lib/editor/image-ref';

const IMG_TAG_PATTERN = /<img\b[^>]*>/gi;
const IMAGE_TAG_CLOSING_PATTERN = /\/?>$/;
const STORED_IMAGE_REF_PREFIX = 'meanlok-image://';
const TRANSFORM_PROBE_TIMEOUT_MS = 3000;

type TransformMode = 'off' | 'on' | 'auto';
type TransformSupportState = 'unknown' | 'supported' | 'unsupported';

let transformSupportState: TransformSupportState = 'unknown';
let transformSupportCheckedAt = 0;
let probeInFlight = false;

function resolveTransformMode(): TransformMode {
  const rawMode = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM_MODE
    ?.trim()
    .toLowerCase();
  if (rawMode === 'off' || rawMode === 'on' || rawMode === 'auto') {
    return rawMode;
  }

  // backward compatibility
  if (process.env.NEXT_PUBLIC_ENABLE_SUPABASE_IMAGE_TRANSFORM === 'true') {
    return 'on';
  }

  return 'auto';
}

function shouldRetryProbe(nowMs: number) {
  // Retry probe every 10 minutes if previously unsupported.
  return nowMs - transformSupportCheckedAt > 10 * 60 * 1000;
}

function markTransformSupport(nextState: TransformSupportState) {
  transformSupportState = nextState;
  transformSupportCheckedAt = Date.now();
}

function maybeProbeTransformSupport(transformUrl: string) {
  if (typeof window === 'undefined') {
    return;
  }
  if (!transformUrl || probeInFlight) {
    return;
  }

  const nowMs = Date.now();
  if (
    transformSupportState === 'supported' ||
    (transformSupportState === 'unsupported' && !shouldRetryProbe(nowMs))
  ) {
    return;
  }

  probeInFlight = true;

  const probeImage = new Image();
  let done = false;
  const finish = (state: TransformSupportState) => {
    if (done) {
      return;
    }
    done = true;
    probeInFlight = false;
    markTransformSupport(state);
  };

  const timeoutId = window.setTimeout(() => {
    finish('unsupported');
  }, TRANSFORM_PROBE_TIMEOUT_MS);

  probeImage.onload = () => {
    window.clearTimeout(timeoutId);
    finish('supported');
  };
  probeImage.onerror = () => {
    window.clearTimeout(timeoutId);
    finish('unsupported');
  };
  probeImage.src = transformUrl;
}

function escapeAttributeValue(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

function readAttribute(tag: string, attribute: string) {
  const pattern = new RegExp(
    `\\s${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i',
  );
  const match = tag.match(pattern);
  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : null;
}

function upsertAttribute(tag: string, attribute: string, value: string) {
  const safeValue = escapeAttributeValue(value);
  const pattern = new RegExp(
    `(\\s${attribute}\\s*=\\s*)(?:"[^"]*"|'[^']*'|[^\\s>]+)`,
    'i',
  );

  if (pattern.test(tag)) {
    return tag.replace(pattern, `$1"${safeValue}"`);
  }

  return tag.replace(IMAGE_TAG_CLOSING_PATTERN, ` ${attribute}="${safeValue}"$&`);
}

export function optimizeHtmlImageTagsForPreview(html: string) {
  if (!html || !/<img\b/i.test(html)) {
    return html;
  }

  const transformMode = resolveTransformMode();

  return html.replace(IMG_TAG_PATTERN, (tag) => {
    const currentSrc = readAttribute(tag, 'src');
    if (!currentSrc) {
      return tag;
    }

    let nextTag = tag;
    const resolvedSrc = resolveStoredImageReference(currentSrc, {
      useTransform: false,
    });
    nextTag = upsertAttribute(nextTag, 'src', resolvedSrc);
    nextTag = upsertAttribute(nextTag, 'loading', 'lazy');
    nextTag = upsertAttribute(nextTag, 'decoding', 'async');

    const currentFetchPriority = readAttribute(nextTag, 'fetchpriority')?.toLowerCase();
    if (currentFetchPriority !== 'high') {
      nextTag = upsertAttribute(nextTag, 'fetchpriority', 'low');
    }

    const isStoredImageRef = currentSrc.startsWith(STORED_IMAGE_REF_PREFIX);
    if (!isStoredImageRef || transformMode === 'off') {
      return nextTag;
    }

    const transformProbeUrl = resolveStoredImageReference(currentSrc, {
      useTransform: true,
      transformWidth: 256,
      quality: 50,
    });

    if (transformMode === 'auto') {
      maybeProbeTransformSupport(transformProbeUrl);
      if (transformSupportState !== 'supported') {
        return nextTag;
      }
    }

    const srcSet = buildStoredImageSrcSet(currentSrc, [480, 768, 1024, 1440]);
    if (srcSet) {
      nextTag = upsertAttribute(nextTag, 'srcset', srcSet);

      if (!readAttribute(nextTag, 'sizes')) {
        nextTag = upsertAttribute(nextTag, 'sizes', '(max-width: 768px) 100vw, 768px');
      }
    }

    return nextTag;
  });
}

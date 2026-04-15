const IMAGE_REF_PREFIX = 'meanlok-image://';
const DEFAULT_TRANSFORM_WIDTH = 1280;
const DEFAULT_TRANSFORM_QUALITY = 75;
const LEGACY_SIGNED_URL_PATTERN =
  /(?:https?:\/\/[^\s"')>]+\/storage\/v1\/object\/sign\/[^\s"')>]+|\/storage\/v1\/object\/sign\/[^\s"')>]+)/gi;

interface ParsedStoredImageRef {
  bucket: string;
  encodedPath: string;
}

function encodeObjectPath(path: string) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function normalizeSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '') ?? '';
}

function toAbsoluteUrl(rawUrl: string) {
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  const supabaseUrl = normalizeSupabaseUrl();
  if (!supabaseUrl || !rawUrl.startsWith('/')) {
    return rawUrl;
  }

  return `${supabaseUrl}${rawUrl}`;
}

export function normalizeLegacySupabaseSignedUrl(rawUrl: string) {
  const absoluteUrl = toAbsoluteUrl(rawUrl);

  let parsed: URL;
  try {
    parsed = new URL(absoluteUrl);
  } catch {
    return rawUrl;
  }

  const path = parsed.pathname;
  const marker = '/storage/v1/object/sign/';
  const markerIndex = path.indexOf(marker);
  if (markerIndex === -1) {
    return rawUrl;
  }

  const suffix = path.slice(markerIndex + marker.length);
  const slashIndex = suffix.indexOf('/');
  if (slashIndex <= 0) {
    return rawUrl;
  }

  const bucket = suffix.slice(0, slashIndex);
  const encodedPath = suffix.slice(slashIndex + 1);
  if (!bucket || !encodedPath) {
    return rawUrl;
  }

  return `${parsed.origin}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

export function buildStoredImageReference(bucket: string, objectPath: string) {
  return `${IMAGE_REF_PREFIX}${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`;
}

function parseStoredImageReference(imageRef: string): ParsedStoredImageRef | null {
  if (!imageRef.startsWith(IMAGE_REF_PREFIX)) {
    return null;
  }
  const pathPart = imageRef.slice(IMAGE_REF_PREFIX.length);
  const firstSlash = pathPart.indexOf('/');
  if (firstSlash <= 0) {
    return null;
  }

  const bucket = pathPart.slice(0, firstSlash);
  const encodedPath = pathPart.slice(firstSlash + 1);
  if (!bucket || !encodedPath) {
    return null;
  }

  return { bucket, encodedPath };
}

function toPublicObjectUrl({ bucket, encodedPath }: ParsedStoredImageRef) {
  const supabaseUrl = normalizeSupabaseUrl();
  if (!supabaseUrl) {
    return `${IMAGE_REF_PREFIX}${bucket}/${encodedPath}`;
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

function toRenderImageUrl(
  parsed: ParsedStoredImageRef,
  width: number,
  quality = DEFAULT_TRANSFORM_QUALITY,
) {
  const supabaseUrl = normalizeSupabaseUrl();
  if (!supabaseUrl) {
    return `${IMAGE_REF_PREFIX}${parsed.bucket}/${parsed.encodedPath}`;
  }

  const widthValue = Number.isFinite(width) ? Math.max(64, Math.trunc(width)) : DEFAULT_TRANSFORM_WIDTH;
  const qualityValue = Number.isFinite(quality)
    ? Math.min(100, Math.max(20, Math.trunc(quality)))
    : DEFAULT_TRANSFORM_QUALITY;

  return `${supabaseUrl}/storage/v1/render/image/public/${parsed.bucket}/${parsed.encodedPath}?width=${widthValue}&quality=${qualityValue}`;
}

export function resolveStoredImageReference(
  imageRef: string,
  options?: { transformWidth?: number; quality?: number; useTransform?: boolean },
) {
  const parsed = parseStoredImageReference(imageRef);
  if (!parsed) {
    return imageRef;
  }

  if (options?.useTransform === false) {
    return toPublicObjectUrl(parsed);
  }

  return toRenderImageUrl(
    parsed,
    options?.transformWidth ?? DEFAULT_TRANSFORM_WIDTH,
    options?.quality ?? DEFAULT_TRANSFORM_QUALITY,
  );
}

export function buildStoredImageSrcSet(
  imageRef: string,
  widths: number[] = [480, 768, 1024, 1440],
) {
  const parsed = parseStoredImageReference(imageRef);
  if (!parsed) {
    return null;
  }

  const uniqueSortedWidths = [...new Set(widths)]
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.trunc(value))
    .sort((a, b) => a - b);

  if (uniqueSortedWidths.length === 0) {
    return null;
  }

  return uniqueSortedWidths
    .map((width) => `${toRenderImageUrl(parsed, width)} ${width}w`)
    .join(', ');
}

export function resolveStoredImageReferences(content: string) {
  const withStoredRefs = content.includes(IMAGE_REF_PREFIX)
    ? content.replace(/meanlok-image:\/\/[^\s"')>]+/g, (rawRef) =>
        resolveStoredImageReference(rawRef, { useTransform: false }),
      )
    : content;

  LEGACY_SIGNED_URL_PATTERN.lastIndex = 0;
  if (!LEGACY_SIGNED_URL_PATTERN.test(withStoredRefs)) {
    return withStoredRefs;
  }

  LEGACY_SIGNED_URL_PATTERN.lastIndex = 0;
  return withStoredRefs.replace(LEGACY_SIGNED_URL_PATTERN, (rawUrl) =>
    normalizeLegacySupabaseSignedUrl(rawUrl),
  );
}

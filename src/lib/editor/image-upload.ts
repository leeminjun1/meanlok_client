const LOSSY_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MIN_COMPRESS_SIZE_BYTES = 400 * 1024;
const MAX_DIMENSION = 1920;
const TARGET_QUALITY = 0.82;

function createLoadedImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      'image/webp',
      quality,
    );
  });
}

function replaceExtensionWithWebp(filename: string) {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex <= 0) {
    return `${filename}.webp`;
  }
  return `${filename.slice(0, dotIndex)}.webp`;
}

export async function optimizeImageForUpload(file: File) {
  if (!LOSSY_IMAGE_TYPES.has(file.type)) {
    return file;
  }

  if (file.size < MIN_COMPRESS_SIZE_BYTES) {
    return file;
  }

  try {
    const image = await createLoadedImage(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);
    const compressed = await canvasToBlob(canvas, TARGET_QUALITY);
    if (!compressed) {
      return file;
    }

    if (compressed.size >= file.size * 0.9) {
      return file;
    }

    return new File(
      [compressed],
      replaceExtensionWithWebp(file.name),
      {
        type: 'image/webp',
        lastModified: Date.now(),
      },
    );
  } catch {
    return file;
  }
}

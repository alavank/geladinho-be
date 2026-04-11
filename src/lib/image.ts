import sharp from 'sharp';

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 80;
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB after compression

/**
 * Compress and resize an image for OCR processing.
 * Returns a base64 string and mime type.
 */
export async function compressImageForOcr(
  buffer: ArrayBuffer
): Promise<{ base64: string; mimeType: string }> {
  const input = Buffer.from(buffer);

  const compressed = await sharp(input)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  if (compressed.length > MAX_FILE_SIZE) {
    // If still too large, reduce quality further
    const smaller = await sharp(input)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 60 })
      .toBuffer();
    return { base64: smaller.toString('base64'), mimeType: 'image/jpeg' };
  }

  return { base64: compressed.toString('base64'), mimeType: 'image/jpeg' };
}

/**
 * Fetch with timeout support.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

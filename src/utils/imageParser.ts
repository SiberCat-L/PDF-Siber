import type { EditablePage, PdfDocumentMeta } from '@/src/types/pdf';

const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp',
  '.svg',
  '.avif',
  '.tif',
  '.tiff',
];

export function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const lower = file.name.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function isPdfFile(file: File): boolean {
  return (
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  );
}

async function normalizeImageToDataUrl(file: File): Promise<{
  dataUrl: string;
  width: number;
  height: number;
}> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error(`Format gambar "${file.name}" tidak dapat dibaca oleh peramban.`));
      image.src = objectUrl;
    });

    const naturalWidth = img.naturalWidth || img.width || 1200;
    const naturalHeight = img.naturalHeight || img.height || 1600;
    const maxDimension = 1800;
    const scale = Math.min(
      1,
      maxDimension / Math.max(naturalWidth, naturalHeight)
    );

    const targetWidth = Math.max(1, Math.round(naturalWidth * scale));
    const targetHeight = Math.max(1, Math.round(naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Gagal menyiapkan kanvas pemrosesan gambar.');
    }

    // Fill white background so transparent PNGs or SVGs remain legible
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return {
      dataUrl,
      width: targetWidth,
      height: targetHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export interface ParseImagesResult {
  meta: PdfDocumentMeta;
  pages: EditablePage[];
}

export async function parseImageFiles(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<ParseImagesResult> {
  const pages: EditablePage[] = [];
  let totalBytes = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    totalBytes += file.size;
    onProgress?.(i + 1, files.length);

    const normalized = await normalizeImageToDataUrl(file);
    pages.push({
      id: `img-${i + 1}-${crypto.randomUUID().slice(0, 8)}`,
      pageNumber: i + 1,
      sourceType: 'image',
      autoExtractedText: '',
      rawLineExtractedText: '',
      text: '',
      originalImageUrl: normalized.dataUrl,
      originalWidthPt: Math.round(normalized.width * 0.75),
      originalHeightPt: Math.round(normalized.height * 0.75),
      hasEmbeddedText: false,
      ocrProcessed: false,
    });
  }

  const displayName =
    files.length === 1
      ? files[0].name
      : `${files[0].name} (+${files.length - 1} gambar)`;

  const meta: PdfDocumentMeta = {
    id: crypto.randomUUID(),
    fileName: displayName,
    fileSizeBytes: totalBytes,
    originalPageCount: pages.length,
    uploadedAt: new Date().toISOString(),
    sourceKind: 'image',
  };

  return { meta, pages };
}

export async function parseSingleImageAsPage(
  file: File,
  pageNumber: number
): Promise<EditablePage> {
  const normalized = await normalizeImageToDataUrl(file);
  return {
    id: `img-${pageNumber}-${crypto.randomUUID().slice(0, 8)}`,
    pageNumber,
    sourceType: 'image',
    autoExtractedText: '',
    rawLineExtractedText: '',
    text: '',
    originalImageUrl: normalized.dataUrl,
    originalWidthPt: Math.round(normalized.width * 0.75),
    originalHeightPt: Math.round(normalized.height * 0.75),
    hasEmbeddedText: false,
    ocrProcessed: false,
  };
}

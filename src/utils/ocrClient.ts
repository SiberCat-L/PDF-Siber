export interface OcrExtractionResponse {
  hasText: boolean;
  autoText: string;
  rawLineText: string;
}

export async function extractTextFromImageUrl(
  imageDataUrl: string
): Promise<OcrExtractionResponse> {
  const response = await fetch('/api/ocr/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageDataUrl }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    hasText?: boolean;
    autoText?: string;
    rawLineText?: string;
  };

  if (!response.ok) {
    throw new Error(
      data.error || 'Gagal mengekstrak teks dari dokumen gambar.'
    );
  }

  return {
    hasText: Boolean(data.hasText),
    autoText: typeof data.autoText === 'string' ? data.autoText : '',
    rawLineText:
      typeof data.rawLineText === 'string'
        ? data.rawLineText
        : typeof data.autoText === 'string'
          ? data.autoText
          : '',
  };
}

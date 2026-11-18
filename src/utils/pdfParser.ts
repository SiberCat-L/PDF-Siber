import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { EditablePage, PdfDocumentMeta } from '@/src/types/pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface RawTextToken {
  str: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
}

interface VisualLine {
  y: number;
  xStart: number;
  xEnd: number;
  fontSize: number;
  text: string;
}

function normalizeExtractedToken(raw: string): string {
  return raw
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

function groupTokensIntoLines(tokens: RawTextToken[]): VisualLine[] {
  if (tokens.length === 0) return [];

  // Sort top-to-bottom (higher PDF Y is higher on page), then left-to-right
  const sorted = [...tokens].sort((a, b) => {
    const dy = b.y - a.y;
    if (Math.abs(dy) > 2) return dy;
    return a.x - b.x;
  });

  const lineClusters: RawTextToken[][] = [];

  for (const token of sorted) {
    const lastCluster = lineClusters[lineClusters.length - 1];
    if (!lastCluster) {
      lineClusters.push([token]);
      continue;
    }

    const clusterAvgY =
      lastCluster.reduce((sum, item) => sum + item.y, 0) / lastCluster.length;
    const clusterFont =
      lastCluster.reduce((sum, item) => sum + item.fontSize, 0) / lastCluster.length;
    const tolerance = Math.max(3, Math.min(clusterFont, token.fontSize) * 0.45);

    if (Math.abs(token.y - clusterAvgY) <= tolerance) {
      lastCluster.push(token);
    } else {
      lineClusters.push([token]);
    }
  }

  return lineClusters
    .map((cluster) => {
      cluster.sort((a, b) => a.x - b.x);
      let lineText = '';
      let prevEndX: number | null = null;

      for (const token of cluster) {
        const cleanStr = normalizeExtractedToken(token.str);
        if (!cleanStr) continue;

        if (prevEndX !== null) {
          const gap = token.x - prevEndX;
          const wideColumnThreshold = Math.max(18, token.fontSize * 2.2);
          const spaceThreshold = Math.max(1.4, token.fontSize * 0.22);

          if (gap > wideColumnThreshold) {
            lineText = lineText.trimEnd() + '    ';
          } else if (
            gap > spaceThreshold &&
            !lineText.endsWith(' ') &&
            !cleanStr.startsWith(' ')
          ) {
            lineText += ' ';
          }
        }

        lineText += cleanStr;
        const estimatedWidth =
          token.width > 0 ? token.width : cleanStr.length * token.fontSize * 0.5;
        prevEndX = Math.max(prevEndX ?? 0, token.x + estimatedWidth);
      }

      // Collapse excessive internal single spaces while preserving 4-space column separators
      const trimmed = lineText.replace(/ {2,3}/g, ' ').trim();
      const avgY = cluster.reduce((sum, item) => sum + item.y, 0) / cluster.length;
      const avgFont =
        cluster.reduce((sum, item) => sum + item.fontSize, 0) / cluster.length;
      const xStart = cluster[0]?.x ?? 0;
      const xEnd = prevEndX ?? xStart;

      return {
        y: avgY,
        xStart,
        xEnd,
        fontSize: avgFont,
        text: trimmed,
      };
    })
    .filter((line) => line.text.length > 0);
}

function getMedian(values: number[], fallback: number): number {
  if (values.length === 0) return fallback;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function formatLinesToText(lines: VisualLine[]): {
  autoText: string;
  rawLineText: string;
} {
  if (lines.length === 0) {
    return { autoText: '', rawLineText: '' };
  }

  const lineSteps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const step = lines[i - 1].y - lines[i].y;
    if (step > 2 && step < 80) {
      lineSteps.push(step);
    }
  }

  const medianFont = getMedian(
    lines.map((l) => l.fontSize),
    11
  );
  const medianStep = getMedian(lineSteps, medianFont * 1.35);
  const maxLineSpan = Math.max(...lines.map((l) => l.xEnd - l.xStart), 100);

  // Raw lines mode: keep every visual line break, add blank line on large vertical gaps
  const rawParts: string[] = [lines[0].text];
  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i - 1].y - lines[i].y;
    if (gap > medianStep * 1.48) {
      rawParts.push('');
    }
    rawParts.push(lines[i].text);
  }

  // Auto paragraph reconstruction mode
  const paragraphs: string[] = [];
  let currentPara = lines[0].text;

  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const curr = lines[i];
    const gap = prev.y - curr.y;

    const isLargeVerticalGap = gap > medianStep * 1.42;
    const isPrevHeading = prev.fontSize > medianFont * 1.15;
    const isCurrHeading = curr.fontSize > medianFont * 1.15;
    const isCurrListItem = /^([•\-–*]|\d+[.)]|[a-zA-Z][.)])\s+/.test(curr.text);
    const hasTabularColumns = prev.text.includes('    ') || curr.text.includes('    ');
    const prevWidth = prev.xEnd - prev.xStart;
    const prevEndedSentence = /[.!?:;]$/.test(prev.text);
    const prevLooksShort = prevWidth < maxLineSpan * 0.72 && prevEndedSentence;

    if (
      isLargeVerticalGap ||
      isPrevHeading ||
      isCurrHeading ||
      isCurrListItem ||
      hasTabularColumns ||
      prevLooksShort
    ) {
      paragraphs.push(currentPara);
      currentPara = curr.text;
    } else if (currentPara.endsWith('-') && /^[a-z]/.test(curr.text)) {
      currentPara = currentPara.slice(0, -1) + curr.text;
    } else {
      currentPara += ' ' + curr.text;
    }
  }
  paragraphs.push(currentPara);

  return {
    autoText: paragraphs.join('\n\n'),
    rawLineText: rawParts.join('\n'),
  };
}

export interface ParsePdfResult {
  meta: PdfDocumentMeta;
  pages: EditablePage[];
}

export async function parsePdfFile(
  file: File,
  onProgress?: (currentPage: number, totalPages: number) => void
): Promise<ParsePdfResult> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
  });

  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;
  const pages: EditablePage[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(pageNum, totalPages);
    const page = await pdfDoc.getPage(pageNum);

    const baseViewport = page.getViewport({ scale: 1 });
    // High-resolution render for crisp preview and accurate fallback OCR
    const renderScale = Math.min(2.0, Math.max(1.25, 1300 / baseViewport.width));
    const renderViewport = page.getViewport({ scale: renderScale });

    let originalImageUrl: string | null = null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(renderViewport.width);
      canvas.height = Math.floor(renderViewport.height);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({
          canvasContext: ctx,
          viewport: renderViewport,
          canvas,
        }).promise;
        originalImageUrl = canvas.toDataURL('image/jpeg', 0.9);
      }
    } catch {
      originalImageUrl = null;
    }

    const textContent = await page.getTextContent();
    const tokens: RawTextToken[] = [];

    for (const item of textContent.items) {
      if (!('str' in item)) continue;
      const normalized = normalizeExtractedToken(item.str);
      if (!normalized || normalized.trim().length === 0) continue;

      const transform = item.transform;
      const fontSize = Math.max(
        6,
        Math.hypot(transform[0], transform[1]) || Math.abs(transform[3]) || 11
      );
      tokens.push({
        str: normalized,
        x: transform[4],
        y: transform[5],
        width: item.width ?? 0,
        fontSize,
      });
    }

    const lines = groupTokensIntoLines(tokens);
    const { autoText, rawLineText } = formatLinesToText(lines);

    pages.push({
      id: `page-${pageNum}-${crypto.randomUUID().slice(0, 8)}`,
      pageNumber: pageNum,
      sourceType: 'pdf',
      autoExtractedText: autoText,
      rawLineExtractedText: rawLineText,
      text: autoText,
      originalImageUrl,
      originalWidthPt: baseViewport.width,
      originalHeightPt: baseViewport.height,
      hasEmbeddedText: tokens.length > 0 && autoText.trim().length > 0,
      ocrProcessed: false,
    });
  }

  await loadingTask.destroy();

  const meta: PdfDocumentMeta = {
    id: crypto.randomUUID(),
    fileName: file.name,
    fileSizeBytes: file.size,
    originalPageCount: totalPages,
    uploadedAt: new Date().toISOString(),
    sourceKind: 'pdf',
  };

  return { meta, pages };
}

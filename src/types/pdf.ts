export type ExtractionMode = 'auto' | 'preserve-lines';

export type EditorViewMode = 'free-text' | 'compare' | 'original';

export type PdfFontFamily = 'helvetica' | 'times' | 'courier';

export type PdfAlignment = 'left' | 'center' | 'right' | 'justify';

export type PdfPaperSize = 'a4' | 'letter';

export type PdfMarginPreset = 'narrow' | 'standard' | 'wide';

export type DocumentSourceKind = 'pdf' | 'image';

export interface EditablePage {
  id: string;
  pageNumber: number;
  sourceType: DocumentSourceKind;
  /** Extracted text in 'auto' paragraph mode */
  autoExtractedText: string;
  /** Extracted text in 'preserve-lines' mode */
  rawLineExtractedText: string;
  /** Current editable free text */
  text: string;
  /** Data URL of rendered original PDF page or uploaded image */
  originalImageUrl: string | null;
  /** Original page dimensions in points */
  originalWidthPt: number;
  originalHeightPt: number;
  /** Whether original PDF page had embedded selectable text */
  hasEmbeddedText: boolean;
  /** Whether Vision OCR has already extracted text for this page */
  ocrProcessed?: boolean;
}

export interface PdfDocumentMeta {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  originalPageCount: number;
  uploadedAt: string;
  sourceKind: DocumentSourceKind;
}

export interface PdfExportSettings {
  outputFileName: string;
  fontFamily: PdfFontFamily;
  fontSize: number;
  lineHeight: number;
  alignment: PdfAlignment;
  paperSize: PdfPaperSize;
  marginPreset: PdfMarginPreset;
  showPageNumbers: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  detail?: string;
}

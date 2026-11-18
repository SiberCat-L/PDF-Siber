import React, { useEffect, useRef, useState } from 'react';
import {
  Wand2,
  Save,
  Download,
  Undo2,
  Redo2,
  Search,
  X,
  CheckCircle2,
  Clock,
  Info,
  Trash2,
  Loader2,
  ScanText,
} from 'lucide-react';
import type {
  EditablePage,
  EditorViewMode,
  ExtractionMode,
  PdfExportSettings,
  PdfFontFamily,
  PdfMarginPreset,
} from '@/src/types/pdf';

interface EditorWorkspaceProps {
  pages: EditablePage[];
  activePageId: string;
  isConverted: boolean;
  isConverting: boolean;
  conversionProgress: { current: number; total: number } | null;
  ocrLoadingPageId: string | null;
  viewMode: EditorViewMode;
  extractionMode: ExtractionMode;
  settings: PdfExportSettings;
  hasUnsavedChanges: boolean;
  lastSavedAt: string | null;
  canUndo: boolean;
  canRedo: boolean;
  showFindReplace: boolean;
  onConvertToFreeText: (forceOcrAll?: boolean) => void;
  onReExtractPageOcr: (pageId: string) => void;
  onChangeExtractionMode: (mode: ExtractionMode) => void;
  onChangeViewMode: (mode: EditorViewMode) => void;
  onUpdatePageText: (pageId: string, text: string) => void;
  onDeletePage: (pageId: string) => void;
  onSaveChanges: () => void;
  onDownloadPdf: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleFindReplace: () => void;
  onReplaceAll: (search: string, replaceWith: string) => number;
}

const FONT_CSS: Record<PdfFontFamily, string> = {
  helvetica: 'var(--font-sans)',
  times: 'Georgia, "Times New Roman", Times, serif',
  courier: 'var(--font-mono)',
};

const PADDING_CLASS: Record<PdfMarginPreset, string> = {
  narrow: 'p-5 sm:p-7',
  standard: 'p-6 sm:p-10',
  wide: 'p-8 sm:p-14',
};

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

const AutoGrowTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  style: React.CSSProperties;
  placeholder?: string;
  ariaLabel: string;
}> = ({ value, onChange, style, placeholder, ariaLabel }) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(420, el.scrollHeight + 8)}px`;
  }, [value, style.fontSize, style.lineHeight, style.fontFamily]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={style}
      placeholder={placeholder}
      aria-label={ariaLabel}
      spellCheck={false}
      className="w-full resize-none bg-transparent text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none overflow-hidden"
    />
  );
};

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  pages,
  activePageId,
  isConverted,
  isConverting,
  conversionProgress,
  ocrLoadingPageId,
  viewMode,
  extractionMode,
  settings,
  hasUnsavedChanges,
  lastSavedAt,
  canUndo,
  canRedo,
  showFindReplace,
  onConvertToFreeText,
  onReExtractPageOcr,
  onChangeExtractionMode,
  onChangeViewMode,
  onUpdatePageText,
  onDeletePage,
  onSaveChanges,
  onDownloadPdf,
  onUndo,
  onRedo,
  onToggleFindReplace,
  onReplaceAll,
}) => {
  const pageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [replaceNotice, setReplaceNotice] = useState<string | null>(null);

  useEffect(() => {
    const target = pageRefs.current[activePageId];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activePageId]);

  const matchCount = React.useMemo(() => {
    if (!searchTerm) return 0;
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    return pages.reduce((acc, p) => {
      const matches = p.text.match(regex);
      return acc + (matches ? matches.length : 0);
    }, 0);
  }, [pages, searchTerm]);

  const handleReplaceAllClick = () => {
    if (!searchTerm) return;
    const count = onReplaceAll(searchTerm, replaceTerm);
    setReplaceNotice(
      count > 0
        ? `${count} kecocokan berhasil diganti.`
        : 'Tidak ada kecocokan ditemukan.'
    );
    window.setTimeout(() => setReplaceNotice(null), 3000);
  };

  const editorTextStyle: React.CSSProperties = {
    fontFamily: FONT_CSS[settings.fontFamily],
    fontSize: `${Math.round(settings.fontSize * 1.32)}px`,
    lineHeight: settings.lineHeight,
    textAlign: settings.alignment,
  };

  const needsOcr = pages.some(
    (p) => (p.sourceType === 'image' || !p.hasEmbeddedText) && !p.ocrProcessed
  );
  const hasPdfPages = pages.some((p) => p.sourceType === 'pdf');

  return (
    <section className="flex-1 min-w-0 flex flex-col bg-[#F7F8FA]">
      {/* Workspace Action Toolbar */}
      <div className="sticky top-14 z-20 bg-white border-b border-[#E4E7EC] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {!isConverted ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-[#111827]">
                Pratinjau Dokumen Asli
              </span>
              <div
                className="flex items-center gap-1 p-1 bg-[#F1F3F6] rounded-lg"
                role="group"
                aria-label="Mode Ekstraksi Teks"
              >
                <button
                  type="button"
                  disabled={isConverting}
                  onClick={() => onChangeExtractionMode('auto')}
                  className={[
                    'px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap disabled:opacity-50',
                    extractionMode === 'auto'
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-[#4B5563] hover:text-[#111827]',
                  ].join(' ')}
                >
                  Paragraf Rapi
                </button>
                <button
                  type="button"
                  disabled={isConverting}
                  onClick={() => onChangeExtractionMode('preserve-lines')}
                  className={[
                    'px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap disabled:opacity-50',
                    extractionMode === 'preserve-lines'
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-[#4B5563] hover:text-[#111827]',
                  ].join(' ')}
                >
                  Baris Asli
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {hasPdfPages && !needsOcr && (
                <button
                  type="button"
                  disabled={isConverting}
                  onClick={() => onConvertToFreeText(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#111827] bg-[#F7F8FA] hover:bg-[#EBEEF2] border border-[#D1D5DB] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <ScanText className="w-3.5 h-3.5 text-[#4B5563]" />
                  Ubah via OCR Presisi
                </button>
              )}

              <button
                type="button"
                disabled={isConverting}
                onClick={() => onConvertToFreeText(false)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
              >
                {isConverting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                {isConverting
                  ? conversionProgress
                    ? `Mengonversi ${conversionProgress.current}/${conversionProgress.total}...`
                    : 'Mengonversi...'
                  : 'Ubah ke Free Text'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2.5">
              <div
                className="flex items-center gap-1 p-1 bg-[#F1F3F6] rounded-lg"
                role="tablist"
                aria-label="Tampilan Editor"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'free-text'}
                  onClick={() => onChangeViewMode('free-text')}
                  className={[
                    'px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
                    viewMode === 'free-text'
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-[#4B5563] hover:text-[#111827]',
                  ].join(' ')}
                >
                  Free Text
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'compare'}
                  onClick={() => onChangeViewMode('compare')}
                  className={[
                    'px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
                    viewMode === 'compare'
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-[#4B5563] hover:text-[#111827]',
                  ].join(' ')}
                >
                  Bandingkan
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'original'}
                  onClick={() => onChangeViewMode('original')}
                  className={[
                    'px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
                    viewMode === 'original'
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-[#4B5563] hover:text-[#111827]',
                  ].join(' ')}
                >
                  Dokumen Asli
                </button>
              </div>

              <div className="flex items-center gap-1 border-l border-[#E4E7EC] pl-2.5">
                <button
                  type="button"
                  onClick={onUndo}
                  disabled={!canUndo}
                  title="Urungkan (Ctrl+Z)"
                  aria-label="Urungkan"
                  className="p-1.5 text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] disabled:opacity-35 disabled:pointer-events-none rounded-md transition-colors"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onRedo}
                  disabled={!canRedo}
                  title="Ulangi (Ctrl+Y)"
                  aria-label="Ulangi"
                  className="p-1.5 text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] disabled:opacity-35 disabled:pointer-events-none rounded-md transition-colors"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onToggleFindReplace}
                  title="Cari & Ganti (Ctrl+F)"
                  className={[
                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
                    showFindReplace
                      ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                      : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]',
                  ].join(' ')}
                >
                  <Search className="w-3.5 h-3.5" />
                  Cari & Ganti
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 text-xs">
                {hasUnsavedChanges ? (
                  <span className="inline-flex items-center gap-1 text-[#B45309]">
                    <Clock className="w-3.5 h-3.5" />
                    Belum disimpan
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[#15803D]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Tersimpan{lastSavedAt ? ` · ${lastSavedAt}` : ''}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={onSaveChanges}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-[#111827] bg-white hover:bg-[#F7F8FA] border border-[#D1D5DB] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Save className="w-3.5 h-3.5 text-[#4B5563]" />
                Simpan
              </button>

              <button
                type="button"
                onClick={onDownloadPdf}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh PDF
              </button>
            </div>
          </>
        )}
      </div>

      {/* Find & Replace Collapsible Bar */}
      {isConverted && showFindReplace && (
        <div className="bg-[#F9FAFB] border-b border-[#E4E7EC] px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari kata atau frasa..."
            className="px-3 py-1.5 text-xs bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1D4ED8] w-48 sm:w-56"
          />
          <input
            type="text"
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            placeholder="Ganti dengan..."
            className="px-3 py-1.5 text-xs bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1D4ED8] w-48 sm:w-56"
          />
          <button
            type="button"
            onClick={handleReplaceAllClick}
            disabled={!searchTerm || matchCount === 0}
            className="px-3 py-1.5 text-xs font-medium text-white bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap"
          >
            Ganti Semua
          </button>
          <span className="text-xs text-[#6B7280] font-mono tabular-nums">
            {searchTerm ? `${matchCount} kecocokan` : 'Ketik kata untuk mencari'}
          </span>
          {replaceNotice && (
            <span className="text-xs font-medium text-[#15803D]">
              {replaceNotice}
            </span>
          )}
          <button
            type="button"
            onClick={onToggleFindReplace}
            aria-label="Tutup panel cari dan ganti"
            className="ml-auto p-1 text-[#6B7280] hover:text-[#111827] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Document Pages Viewport */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        {!isConverted && needsOcr && (
          <div className="max-w-3xl mx-auto flex items-start gap-2.5 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E3A8A] rounded-xl px-4 py-3 text-sm">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#1D4ED8]" />
            <span>
              Dokumen gambar atau PDF hasil pindaian terdeteksi. Klik{' '}
              <strong>Ubah ke Free Text</strong> untuk membaca seluruh teks di
              gambar secara otomatis agar dapat langsung disunting.
            </span>
          </div>
        )}

        {!isConverted && (
          <div className="max-w-3xl mx-auto space-y-6">
            {pages.map((page, index) => (
              <div
                key={page.id}
                ref={(el) => {
                  pageRefs.current[page.id] = el;
                }}
                className="bg-white border border-[#E4E7EC] rounded-xl overflow-hidden"
              >
                <div className="px-4 py-2.5 bg-[#F9FAFB] border-b border-[#E4E7EC] flex items-center justify-between text-xs text-[#6B7280]">
                  <span className="font-medium text-[#111827] tabular-nums">
                    Halaman {index + 1} dari {pages.length}
                  </span>
                  <span className="font-mono tabular-nums">
                    {page.sourceType === 'image' || !page.hasEmbeddedText
                      ? 'Siap diekstrak dengan OCR'
                      : `${countWords(
                          extractionMode === 'auto'
                            ? page.autoExtractedText
                            : page.rawLineExtractedText
                        )} kata terdeteksi`}
                  </span>
                </div>

                {page.originalImageUrl ? (
                  <div className="p-4 sm:p-6 bg-[#F3F4F6]/60 flex justify-center">
                    <img
                      src={page.originalImageUrl}
                      alt={`Dokumen asli halaman ${index + 1}`}
                      className="max-w-full h-auto border border-[#E4E7EC] bg-white"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-[#6B7280]">
                    Pratinjau gambar halaman tidak tersedia, teks tetap siap
                    dikonversi.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {isConverted && (
          <div
            className={[
              'mx-auto space-y-6',
              viewMode === 'compare' ? 'max-w-6xl' : 'max-w-3xl',
            ].join(' ')}
          >
            {pages.map((page, index) => {
              const wordCount = countWords(page.text);
              const isOcrRunning = ocrLoadingPageId === page.id;

              return (
                <div
                  key={page.id}
                  ref={(el) => {
                    pageRefs.current[page.id] = el;
                  }}
                  className="bg-white border border-[#E4E7EC] rounded-xl overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-[#F9FAFB] border-b border-[#E4E7EC] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                      <span className="font-semibold text-[#111827] tabular-nums">
                        Halaman {index + 1}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {wordCount} kata
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {page.text.length} karakter
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {page.originalImageUrl && (
                        <button
                          type="button"
                          disabled={isOcrRunning}
                          onClick={() => onReExtractPageOcr(page.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1D4ED8] hover:text-[#1E40AF] disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
                          {isOcrRunning ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ScanText className="w-3.5 h-3.5" />
                          )}
                          {isOcrRunning ? 'Membaca teks...' : 'Baca Ulang OCR'}
                        </button>
                      )}

                      {pages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeletePage(page.id)}
                          className="inline-flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#DC2626] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>

                  {viewMode === 'free-text' && (
                    <div className={PADDING_CLASS[settings.marginPreset]}>
                      {page.text.length === 0 && (
                        <p className="text-xs text-[#6B7280] bg-[#F9FAFB] border border-[#E4E7EC] rounded-lg px-3 py-2 mb-4">
                          {page.originalImageUrl
                            ? 'Tidak ada teks yang terdeteksi di halaman ini. Anda dapat mengetik teks secara manual atau klik "Baca Ulang OCR" di atas.'
                            : 'Halaman kosong. Mulai ketik atau tempel teks Anda di bawah ini.'}
                        </p>
                      )}
                      <AutoGrowTextarea
                        value={page.text}
                        onChange={(val) => onUpdatePageText(page.id, val)}
                        style={editorTextStyle}
                        placeholder="Ketik atau sunting isi halaman di sini..."
                        ariaLabel={`Editor free text halaman ${index + 1}`}
                      />
                    </div>
                  )}

                  {viewMode === 'compare' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#E4E7EC]">
                      <div className="p-4 bg-[#F9FAFB] flex flex-col items-center">
                        <span className="self-start text-[11px] font-medium text-[#6B7280] mb-2">
                          Dokumen Asli
                        </span>
                        {page.originalImageUrl ? (
                          <img
                            src={page.originalImageUrl}
                            alt={`Dokumen asli halaman ${index + 1}`}
                            className="w-full h-auto border border-[#E4E7EC] bg-white"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full min-h-[320px] flex items-center justify-center text-xs text-[#6B7280] border border-dashed border-[#D1D5DB] rounded-lg">
                            Halaman baru (tidak ada gambar asli)
                          </div>
                        )}
                      </div>

                      <div className="p-5 sm:p-6">
                        <span className="block text-[11px] font-medium text-[#1D4ED8] mb-2">
                          Free Text (Dapat Diedit)
                        </span>
                        <AutoGrowTextarea
                          value={page.text}
                          onChange={(val) => onUpdatePageText(page.id, val)}
                          style={editorTextStyle}
                          placeholder="Ketik atau sunting isi halaman di sini..."
                          ariaLabel={`Editor free text halaman ${index + 1}`}
                        />
                      </div>
                    </div>
                  )}

                  {viewMode === 'original' && (
                    <div className="p-4 sm:p-6 bg-[#F3F4F6]/60 flex justify-center">
                      {page.originalImageUrl ? (
                        <img
                          src={page.originalImageUrl}
                          alt={`Dokumen asli halaman ${index + 1}`}
                          className="max-w-full h-auto border border-[#E4E7EC] bg-white"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full min-h-[320px] flex items-center justify-center text-sm text-[#6B7280]">
                          Halaman tambahan ini belum memiliki pratinjau dokumen asli.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

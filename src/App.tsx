import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { Header } from '@/src/components/Header';
import { UploadStage } from '@/src/components/UploadStage';
import { PageSidebar } from '@/src/components/PageSidebar';
import { EditorWorkspace } from '@/src/components/EditorWorkspace';
import { SettingsInspector } from '@/src/components/SettingsInspector';
import { GuideModal } from '@/src/components/GuideModal';
import { parsePdfFile } from '@/src/utils/pdfParser';
import {
  isImageFile,
  isPdfFile,
  parseImageFiles,
  parseSingleImageAsPage,
} from '@/src/utils/imageParser';
import { extractTextFromImageUrl } from '@/src/utils/ocrClient';
import {
  buildPdfDocument,
  createSamplePdfFile,
  exportPagesToPdf,
} from '@/src/utils/pdfGenerator';
import type {
  EditablePage,
  EditorViewMode,
  ExtractionMode,
  PdfDocumentMeta,
  PdfExportSettings,
  ToastMessage,
} from '@/src/types/pdf';

const DRAFT_STORAGE_KEY = 'lembarpdf_saved_draft_v1';

const DEFAULT_SETTINGS: PdfExportSettings = {
  outputFileName: 'dokumen-diedit',
  fontFamily: 'helvetica',
  fontSize: 11,
  lineHeight: 1.45,
  alignment: 'left',
  paperSize: 'a4',
  marginPreset: 'standard',
  showPageNumbers: true,
};

interface SavedDraftPayload {
  meta: PdfDocumentMeta;
  pages: EditablePage[];
  settings: PdfExportSettings;
  isConverted: boolean;
  extractionMode: ExtractionMode;
  savedAt: string;
}

export default function App() {
  const [meta, setMeta] = useState<PdfDocumentMeta | null>(null);
  const [pages, setPages] = useState<EditablePage[]>([]);
  const [activePageId, setActivePageId] = useState<string>('');
  const [isConverted, setIsConverted] = useState(false);
  const [viewMode, setViewMode] = useState<EditorViewMode>('free-text');
  const [extractionMode, setExtractionMode] = useState<ExtractionMode>('auto');
  const [settings, setSettings] = useState<PdfExportSettings>(DEFAULT_SETTINGS);

  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState<{
    current: number;
    total: number;
    label?: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [ocrLoadingPageId, setOcrLoadingPageId] = useState<string | null>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [hasExistingDraft, setHasExistingDraft] = useState(false);
  const [estimatedPdfPages, setEstimatedPdfPages] = useState(1);

  const [historyPast, setHistoryPast] = useState<EditablePage[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<EditablePage[][]>([]);

  const hiddenFileInputRef = useRef<HTMLInputElement | null>(null);
  const appendImageInputRef = useRef<HTMLInputElement | null>(null);

  const pushToast = useCallback(
    (type: ToastMessage['type'], title: string, detail?: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, type, title, detail }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedDraftPayload;
        if (parsed?.meta && Array.isArray(parsed?.pages) && parsed.pages.length > 0) {
          setHasExistingDraft(true);
        }
      }
    } catch {
      setHasExistingDraft(false);
    }
  }, []);

  useEffect(() => {
    if (!isConverted || pages.length === 0) {
      setEstimatedPdfPages(pages.length || 1);
      return;
    }
    const timer = window.setTimeout(() => {
      try {
        const { totalOutputPages } = buildPdfDocument(pages, settings);
        setEstimatedPdfPages(totalOutputPages);
      } catch {
        setEstimatedPdfPages(pages.length);
      }
    }, 240);
    return () => window.clearTimeout(timer);
  }, [pages, settings, isConverted]);

  const processUploadedFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const pdfFiles = files.filter(isPdfFile);
      const imageFiles = files.filter(isImageFile);

      if (pdfFiles.length === 0 && imageFiles.length === 0) {
        setUploadError(
          'Format file tidak didukung. Pilih dokumen PDF (.pdf) atau gambar (JPEG, PNG, WebP, GIF, BMP, SVG).'
        );
        return;
      }

      if (pdfFiles.length > 0 && imageFiles.length > 0) {
        setUploadError(
          'Unggah file PDF atau kumpulan file gambar secara terpisah, lalu Anda dapat menyisipkan gambar tambahan di editor.'
        );
        return;
      }

      setUploadError(null);
      setIsParsing(true);

      try {
        if (pdfFiles.length > 0) {
          const pdfFile = pdfFiles[0];
          setParseProgress({
            current: 1,
            total: 1,
            label: 'Membaca Dokumen PDF...',
          });

          const result = await parsePdfFile(pdfFile, (current, total) => {
            setParseProgress({
              current,
              total,
              label: 'Membaca Dokumen PDF...',
            });
          });

          const baseName = pdfFile.name.replace(/\.pdf$/i, '') || 'dokumen';
          setMeta(result.meta);
          setPages(result.pages);
          setActivePageId(result.pages[0]?.id ?? '');
          setIsConverted(false);
          setViewMode('free-text');
          setExtractionMode('auto');
          setSettings({
            ...DEFAULT_SETTINGS,
            outputFileName: `${baseName}-diedit`,
          });
          setHistoryPast([]);
          setHistoryFuture([]);
          setHasUnsavedChanges(false);
          setLastSavedAt(null);
          setShowFindReplace(false);
          pushToast(
            'success',
            'Dokumen PDF berhasil dimuat',
            `${result.pages.length} halaman siap diubah ke free text.`
          );
        } else {
          setParseProgress({
            current: 1,
            total: imageFiles.length,
            label: 'Menyiapkan Gambar Dokumen...',
          });

          const result = await parseImageFiles(imageFiles, (current, total) => {
            setParseProgress({
              current,
              total,
              label: 'Menyiapkan Gambar Dokumen...',
            });
          });

          const baseName =
            imageFiles[0].name.replace(/\.[^.]+$/, '') || 'dokumen-gambar';
          setMeta(result.meta);
          setPages(result.pages);
          setActivePageId(result.pages[0]?.id ?? '');
          setIsConverted(false);
          setViewMode('free-text');
          setExtractionMode('auto');
          setSettings({
            ...DEFAULT_SETTINGS,
            outputFileName: `${baseName}-diedit`,
          });
          setHistoryPast([]);
          setHistoryFuture([]);
          setHasUnsavedChanges(false);
          setLastSavedAt(null);
          setShowFindReplace(false);
          pushToast(
            'success',
            'Gambar berhasil dimuat',
            `${result.pages.length} halaman siap diubah ke free text.`
          );
        }
      } catch (err) {
        const message =
          err instanceof Error && /password/i.test(err.message)
            ? 'PDF dilindungi kata sandi dan tidak dapat dibuka secara langsung.'
            : err instanceof Error && err.message
              ? err.message
              : 'Gagal membaca dokumen. Pastikan file tidak rusak dan berformat valid.';
        setUploadError(message);
      } finally {
        setIsParsing(false);
        setParseProgress(null);
      }
    },
    [pushToast]
  );

  const handleLoadSample = useCallback(async () => {
    const sampleFile = createSamplePdfFile();
    await processUploadedFiles([sampleFile]);
  }, [processUploadedFiles]);

  const handleRestoreDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as SavedDraftPayload;
      setMeta(draft.meta);
      setPages(draft.pages);
      setActivePageId(draft.pages[0]?.id ?? '');
      setSettings(draft.settings);
      setIsConverted(draft.isConverted);
      setExtractionMode(draft.extractionMode);
      setHistoryPast([]);
      setHistoryFuture([]);
      setHasUnsavedChanges(false);
      setLastSavedAt(draft.savedAt);
      pushToast('info', 'Draf sebelumnya dipulihkan');
    } catch {
      pushToast('error', 'Gagal memulihkan draf tersimpan');
    }
  }, [pushToast]);

  const handleChangeExtractionMode = useCallback(
    (mode: ExtractionMode) => {
      setExtractionMode(mode);
      if (!isConverted) {
        setPages((prev) =>
          prev.map((p) => ({
            ...p,
            text: mode === 'auto' ? p.autoExtractedText : p.rawLineExtractedText,
          }))
        );
      }
    },
    [isConverted]
  );

  const handleConvertToFreeText = useCallback(
    async (forceOcrAll = false) => {
      if (isConverting || pages.length === 0) return;

      const pagesNeedingOcr = pages.filter((p) => {
        if (!p.originalImageUrl) return false;
        if (forceOcrAll) return true;
        if (p.sourceType === 'image' && !p.ocrProcessed) return true;
        if (!p.hasEmbeddedText && !p.ocrProcessed) return true;
        return false;
      });

      if (pagesNeedingOcr.length === 0) {
        setPages((prev) =>
          prev.map((p) => ({
            ...p,
            text:
              extractionMode === 'auto'
                ? p.autoExtractedText
                : p.rawLineExtractedText,
          }))
        );
        setIsConverted(true);
        setViewMode('free-text');
        setHistoryPast([]);
        setHistoryFuture([]);
        setHasUnsavedChanges(true);
        pushToast(
          'success',
          'Berhasil diubah menjadi Free Text',
          'Seluruh teks halaman kini dapat Anda edit secara bebas.'
        );
        return;
      }

      setIsConverting(true);
      setConversionProgress({ current: 0, total: pagesNeedingOcr.length });

      try {
        const ocrResults = new Map<
          string,
          { autoText: string; rawLineText: string; hasText: boolean }
        >();

        for (let i = 0; i < pagesNeedingOcr.length; i++) {
          const targetPage = pagesNeedingOcr[i];
          setConversionProgress({
            current: i + 1,
            total: pagesNeedingOcr.length,
          });

          if (!targetPage.originalImageUrl) continue;
          const result = await extractTextFromImageUrl(
            targetPage.originalImageUrl
          );
          ocrResults.set(targetPage.id, result);
        }

        setPages((prev) =>
          prev.map((p) => {
            const ocr = ocrResults.get(p.id);
            if (ocr) {
              const chosenText =
                extractionMode === 'auto' ? ocr.autoText : ocr.rawLineText;
              return {
                ...p,
                autoExtractedText: ocr.autoText,
                rawLineExtractedText: ocr.rawLineText,
                text: chosenText,
                ocrProcessed: true,
              };
            }
            return {
              ...p,
              text:
                extractionMode === 'auto'
                  ? p.autoExtractedText
                  : p.rawLineExtractedText,
            };
          })
        );

        setIsConverted(true);
        setViewMode('free-text');
        setHistoryPast([]);
        setHistoryFuture([]);
        setHasUnsavedChanges(true);
        pushToast(
          'success',
          'Dokumen berhasil diubah menjadi Free Text',
          `${pagesNeedingOcr.length} halaman gambar telah diekstrak dan siap diedit.`
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Gagal mengekstrak teks dari dokumen gambar.';
        pushToast('error', 'Ekstraksi OCR gagal', message);
      } finally {
        setIsConverting(false);
        setConversionProgress(null);
      }
    },
    [isConverting, pages, extractionMode, pushToast]
  );

  const commitPagesWithHistory = useCallback(
    (updater: (prev: EditablePage[]) => EditablePage[]) => {
      setPages((prev) => {
        const next = updater(prev);
        setHistoryPast((past) => [...past.slice(-29), prev]);
        setHistoryFuture([]);
        return next;
      });
      setHasUnsavedChanges(true);
    },
    []
  );

  const handleReExtractPageOcr = useCallback(
    async (pageId: string) => {
      const target = pages.find((p) => p.id === pageId);
      if (!target?.originalImageUrl || ocrLoadingPageId) return;

      setOcrLoadingPageId(pageId);
      try {
        const result = await extractTextFromImageUrl(target.originalImageUrl);
        const chosenText =
          extractionMode === 'auto' ? result.autoText : result.rawLineText;

        commitPagesWithHistory((prev) =>
          prev.map((p) =>
            p.id === pageId
              ? {
                  ...p,
                  autoExtractedText: result.autoText,
                  rawLineExtractedText: result.rawLineText,
                  text: chosenText,
                  ocrProcessed: true,
                }
              : p
          )
        );

        pushToast(
          result.hasText ? 'success' : 'info',
          result.hasText
            ? 'Teks halaman berhasil diperbarui via OCR'
            : 'Tidak ada teks terbaca pada gambar halaman ini'
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Gagal membaca ulang teks dari gambar.';
        pushToast('error', 'Ekstraksi OCR gagal', message);
      } finally {
        setOcrLoadingPageId(null);
      }
    },
    [pages, ocrLoadingPageId, extractionMode, commitPagesWithHistory, pushToast]
  );

  const handleAppendImageFiles = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter(isImageFile);
      if (imageFiles.length === 0) {
        pushToast(
          'error',
          'Format gambar tidak valid',
          'Pilih file JPEG, PNG, WebP, GIF, BMP, atau SVG.'
        );
        return;
      }

      try {
        const newPages: EditablePage[] = [];
        for (let i = 0; i < imageFiles.length; i++) {
          const page = await parseSingleImageAsPage(
            imageFiles[i],
            pages.length + i + 1
          );
          if (isConverted && page.originalImageUrl) {
            setOcrLoadingPageId(page.id);
            const ocr = await extractTextFromImageUrl(page.originalImageUrl);
            page.autoExtractedText = ocr.autoText;
            page.rawLineExtractedText = ocr.rawLineText;
            page.text =
              extractionMode === 'auto' ? ocr.autoText : ocr.rawLineText;
            page.ocrProcessed = true;
          }
          newPages.push(page);
        }

        commitPagesWithHistory((prev) => [...prev, ...newPages]);
        if (newPages[0]) setActivePageId(newPages[0].id);
        pushToast(
          'success',
          `${newPages.length} halaman gambar ditambahkan`
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Gagal menyisipkan gambar ke dokumen.';
        pushToast('error', 'Gagal menyisipkan gambar', message);
      } finally {
        setOcrLoadingPageId(null);
      }
    },
    [pages.length, isConverted, extractionMode, commitPagesWithHistory, pushToast]
  );

  const handleUpdatePageText = useCallback(
    (pageId: string, newText: string) => {
      commitPagesWithHistory((prev) =>
        prev.map((p) => (p.id === pageId ? { ...p, text: newText } : p))
      );
    },
    [commitPagesWithHistory]
  );

  const handleAddPage = useCallback(() => {
    const newId = `page-new-${crypto.randomUUID().slice(0, 8)}`;
    commitPagesWithHistory((prev) => [
      ...prev,
      {
        id: newId,
        pageNumber: prev.length + 1,
        sourceType: 'pdf',
        autoExtractedText: '',
        rawLineExtractedText: '',
        text: '',
        originalImageUrl: null,
        originalWidthPt: 595,
        originalHeightPt: 842,
        hasEmbeddedText: false,
        ocrProcessed: true,
      },
    ]);
    setActivePageId(newId);
  }, [commitPagesWithHistory]);

  const handleDeletePage = useCallback(
    (pageId: string) => {
      if (pages.length <= 1) return;
      commitPagesWithHistory((prev) => {
        const filtered = prev.filter((p) => p.id !== pageId);
        if (activePageId === pageId && filtered[0]) {
          setActivePageId(filtered[0].id);
        }
        return filtered;
      });
    },
    [pages.length, activePageId, commitPagesWithHistory]
  );

  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((past) => past.slice(0, -1));
    setHistoryFuture((future) => [pages, ...future.slice(0, 29)]);
    setPages(previous);
    setHasUnsavedChanges(true);
  }, [historyPast, pages]);

  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((future) => future.slice(1));
    setHistoryPast((past) => [...past.slice(-29), pages]);
    setPages(next);
    setHasUnsavedChanges(true);
  }, [historyFuture, pages]);

  const handleReplaceAll = useCallback(
    (search: string, replaceWith: string): number => {
      if (!search) return 0;
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      let totalReplaced = 0;

      commitPagesWithHistory((prev) =>
        prev.map((p) => {
          const matches = p.text.match(regex);
          if (!matches) return p;
          totalReplaced += matches.length;
          return { ...p, text: p.text.replace(regex, replaceWith) };
        })
      );

      return totalReplaced;
    },
    [commitPagesWithHistory]
  );

  const handleSaveChanges = useCallback(() => {
    if (!meta) return;
    const timeStr = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const payload: SavedDraftPayload = {
      meta,
      pages,
      settings,
      isConverted,
      extractionMode,
      savedAt: timeStr,
    };

    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
      setHasExistingDraft(true);
    } catch {
      try {
        const lightweightPayload: SavedDraftPayload = {
          ...payload,
          pages: pages.map((p) => ({ ...p, originalImageUrl: null })),
        };
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify(lightweightPayload)
        );
        setHasExistingDraft(true);
      } catch {
        // Ignore storage quota error; in-memory state remains saved
      }
    }

    setHasUnsavedChanges(false);
    setLastSavedAt(timeStr);
    pushToast(
      'success',
      'Perubahan disimpan',
      `Tersimpan pada pukul ${timeStr}. File PDF siap diunduh.`
    );
  }, [meta, pages, settings, isConverted, extractionMode, pushToast]);

  const handleDownloadPdf = useCallback(() => {
    if (!meta) return;
    if (hasUnsavedChanges) {
      handleSaveChanges();
    }
    try {
      const { fileName, totalOutputPages } = exportPagesToPdf(pages, settings);
      pushToast(
        'success',
        'PDF berhasil diunduh',
        `${fileName} (${totalOutputPages} halaman)`
      );
    } catch {
      pushToast(
        'error',
        'Gagal membuat file PDF',
        'Periksa isi teks atau nama file lalu coba kembali.'
      );
    }
  }, [meta, hasUnsavedChanges, handleSaveChanges, pages, settings, pushToast]);

  const handleDownloadTxt = useCallback(() => {
    const content = pages
      .map((p, idx) => `--- Halaman ${idx + 1} ---\n\n${p.text}`)
      .join('\n\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const base = (settings.outputFileName.trim() || 'dokumen-diedit').replace(
      /\.pdf$/i,
      ''
    );
    a.href = url;
    a.download = `${base}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('info', 'File teks (.txt) berhasil diunduh');
  }, [pages, settings.outputFileName, pushToast]);

  const handleResetToOriginal = useCallback(() => {
    commitPagesWithHistory((prev) =>
      prev.map((p) => ({
        ...p,
        text:
          extractionMode === 'auto'
            ? p.autoExtractedText
            : p.rawLineExtractedText,
      }))
    );
    pushToast('info', 'Teks dikembalikan ke hasil ekstraksi asli');
  }, [commitPagesWithHistory, extractionMode, pushToast]);

  const handleResetToUpload = useCallback(() => {
    setMeta(null);
    setPages([]);
    setActivePageId('');
    setIsConverted(false);
    setUploadError(null);
    setHasUnsavedChanges(false);
    setShowFindReplace(false);
  }, []);

  useEffect(() => {
    if (!meta || !isConverted) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveChanges();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowFindReplace((v) => !v);
      } else if (
        e.key.toLowerCase() === 'z' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'INPUT'
      ) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [meta, isConverted, handleSaveChanges, handleUndo, handleRedo]);

  const activeNav = useMemo(() => {
    if (showGuide) return 'guide';
    if (!meta) return 'upload';
    if (isConverted && viewMode === 'compare') return 'compare';
    return 'editor';
  }, [showGuide, meta, isConverted, viewMode]);

  const handleHeaderPrimaryAction = () => {
    if (!meta) {
      hiddenFileInputRef.current?.click();
    } else if (!isConverted) {
      handleConvertToFreeText(false);
    } else {
      handleDownloadPdf();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-[#111827]">
      <input
        ref={hiddenFileInputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf,image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.tif,.tiff"
        className="hidden"
        onChange={(e) => {
          const list = e.target.files;
          if (list && list.length > 0) {
            processUploadedFiles(Array.from(list));
          }
          e.target.value = '';
        }}
      />

      <input
        ref={appendImageInputRef}
        type="file"
        multiple
        accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.tif,.tiff"
        className="hidden"
        onChange={(e) => {
          const list = e.target.files;
          if (list && list.length > 0) {
            handleAppendImageFiles(Array.from(list));
          }
          e.target.value = '';
        }}
      />

      <Header
        hasDocument={Boolean(meta)}
        isConverted={isConverted}
        activeNav={activeNav}
        onSelectUpload={handleResetToUpload}
        onSelectEditor={() => {
          if (meta) setViewMode('free-text');
        }}
        onSelectCompare={() => {
          if (meta && isConverted) setViewMode('compare');
        }}
        onSelectGuide={() => setShowGuide(true)}
        onPrimaryAction={handleHeaderPrimaryAction}
        isProcessing={isParsing || isConverting}
      />

      {!meta ? (
        <div className="flex-1">
          <UploadStage
            onFilesSelected={processUploadedFiles}
            onLoadSample={handleLoadSample}
            isParsing={isParsing}
            parseProgress={parseProgress}
            errorMessage={uploadError}
            hasExistingDraft={hasExistingDraft}
            onRestoreDraft={handleRestoreDraft}
          />
        </div>
      ) : (
        <main className="flex-1 flex flex-col lg:flex-row min-w-0">
          <PageSidebar
            meta={meta}
            pages={pages}
            activePageId={activePageId}
            isConverted={isConverted}
            onSelectPage={setActivePageId}
            onAddPage={handleAddPage}
            onAddImagePages={() => appendImageInputRef.current?.click()}
            onDeletePage={handleDeletePage}
            onUploadNew={() => hiddenFileInputRef.current?.click()}
          />

          <EditorWorkspace
            pages={pages}
            activePageId={activePageId}
            isConverted={isConverted}
            isConverting={isConverting}
            conversionProgress={conversionProgress}
            ocrLoadingPageId={ocrLoadingPageId}
            viewMode={viewMode}
            extractionMode={extractionMode}
            settings={settings}
            hasUnsavedChanges={hasUnsavedChanges}
            lastSavedAt={lastSavedAt}
            canUndo={historyPast.length > 0}
            canRedo={historyFuture.length > 0}
            showFindReplace={showFindReplace}
            onConvertToFreeText={handleConvertToFreeText}
            onReExtractPageOcr={handleReExtractPageOcr}
            onChangeExtractionMode={handleChangeExtractionMode}
            onChangeViewMode={setViewMode}
            onUpdatePageText={handleUpdatePageText}
            onDeletePage={handleDeletePage}
            onSaveChanges={handleSaveChanges}
            onDownloadPdf={handleDownloadPdf}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onToggleFindReplace={() => setShowFindReplace((v) => !v)}
            onReplaceAll={handleReplaceAll}
          />

          <SettingsInspector
            settings={settings}
            pages={pages}
            isConverted={isConverted}
            estimatedPdfPages={estimatedPdfPages}
            onUpdateSettings={(patch) => {
              setSettings((prev) => ({ ...prev, ...patch }));
              setHasUnsavedChanges(true);
            }}
            onResetToOriginal={handleResetToOriginal}
            onDownloadTxt={handleDownloadTxt}
          />
        </main>
      )}

      <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />

      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto bg-white border border-[#E4E7EC] rounded-xl px-4 py-3 shadow-sm flex items-start gap-2.5"
            >
              {toast.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
              )}
              {toast.type === 'error' && (
                <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              )}
              {toast.type === 'info' && (
                <Info className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#111827]">
                  {toast.title}
                </p>
                {toast.detail && (
                  <p className="text-xs text-[#6B7280] mt-0.5">{toast.detail}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Tutup notifikasi"
                onClick={() =>
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id))
                }
                className="p-0.5 text-[#9CA3AF] hover:text-[#111827]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

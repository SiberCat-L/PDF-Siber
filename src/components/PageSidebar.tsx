import React from 'react';
import { Plus, Trash2, Upload, FileText, ImagePlus } from 'lucide-react';
import type { EditablePage, PdfDocumentMeta } from '@/src/types/pdf';

interface PageSidebarProps {
  meta: PdfDocumentMeta;
  pages: EditablePage[];
  activePageId: string;
  isConverted: boolean;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onAddImagePages: () => void;
  onDeletePage: (pageId: string) => void;
  onUploadNew: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export const PageSidebar: React.FC<PageSidebarProps> = ({
  meta,
  pages,
  activePageId,
  isConverted,
  onSelectPage,
  onAddPage,
  onAddImagePages,
  onDeletePage,
  onUploadNew,
}) => {
  return (
    <aside className="w-full lg:w-[260px] shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-[#E4E7EC] flex flex-col lg:h-[calc(100vh-3.5rem)] lg:sticky lg:top-14">
      <div className="p-4 border-b border-[#E4E7EC] space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2
              className="text-sm font-semibold text-[#111827] truncate"
              title={meta.fileName}
            >
              {meta.fileName}
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5 font-mono tabular-nums">
              {meta.sourceKind === 'image' ? 'Gambar' : 'PDF'} ·{' '}
              {formatFileSize(meta.fileSizeBytes)} · {pages.length} Hal.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onUploadNew}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#374151] bg-[#F7F8FA] hover:bg-[#EBEEF2] border border-[#E4E7EC] rounded-lg transition-colors whitespace-nowrap"
        >
          <Upload className="w-3.5 h-3.5" />
          Ganti Dokumen
        </button>
      </div>

      <div className="flex-1 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto p-3 flex lg:flex-col gap-2">
        {pages.map((page, index) => {
          const isActive = page.id === activePageId;
          const words = countWords(page.text);
          return (
            <div
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectPage(page.id);
                }
              }}
              className={[
                'group shrink-0 w-40 lg:w-full rounded-lg border p-2.5 cursor-pointer transition-colors flex items-center gap-2.5 text-left',
                isActive
                  ? 'bg-[#EFF6FF] border-[#1D4ED8]/40'
                  : 'bg-white border-[#E4E7EC] hover:bg-[#F7F8FA]',
              ].join(' ')}
            >
              <div className="w-10 h-13 rounded border border-[#E4E7EC] bg-[#F9FAFB] overflow-hidden shrink-0 flex items-center justify-center">
                {page.originalImageUrl ? (
                  <img
                    src={page.originalImageUrl}
                    alt={`Pratinjau halaman ${index + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <FileText className="w-4 h-4 text-[#9CA3AF]" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={[
                      'text-xs font-semibold tabular-nums',
                      isActive ? 'text-[#1E40AF]' : 'text-[#111827]',
                    ].join(' ')}
                  >
                    Hal. {index + 1}
                  </span>
                  {pages.length > 1 && (
                    <button
                      type="button"
                      title={`Hapus halaman ${index + 1}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePage(page.id);
                      }}
                      className="p-1 text-[#9CA3AF] hover:text-[#DC2626] opacity-70 lg:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-[#6B7280] font-mono tabular-nums mt-0.5 truncate">
                  {!isConverted && page.sourceType === 'image' && !page.ocrProcessed
                    ? 'Siap OCR'
                    : `${words} kata`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-[#E4E7EC] space-y-2">
        {isConverted && (
          <button
            type="button"
            onClick={onAddPage}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1D4ED8] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Halaman Kosong
          </button>
        )}
        <button
          type="button"
          onClick={onAddImagePages}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#374151] bg-[#F7F8FA] hover:bg-[#EBEEF2] border border-[#E4E7EC] rounded-lg transition-colors whitespace-nowrap"
        >
          <ImagePlus className="w-3.5 h-3.5" />
          Sisipkan Gambar
        </button>
      </div>
    </aside>
  );
};

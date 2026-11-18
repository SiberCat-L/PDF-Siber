import React from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  RotateCcw,
  FileDown,
} from 'lucide-react';
import type {
  EditablePage,
  PdfAlignment,
  PdfExportSettings,
  PdfFontFamily,
  PdfMarginPreset,
  PdfPaperSize,
} from '@/src/types/pdf';

interface SettingsInspectorProps {
  settings: PdfExportSettings;
  pages: EditablePage[];
  isConverted: boolean;
  estimatedPdfPages: number;
  onUpdateSettings: (patch: Partial<PdfExportSettings>) => void;
  onResetToOriginal: () => void;
  onDownloadTxt: () => void;
}

export const SettingsInspector: React.FC<SettingsInspectorProps> = ({
  settings,
  pages,
  isConverted,
  estimatedPdfPages,
  onUpdateSettings,
  onResetToOriginal,
  onDownloadTxt,
}) => {
  const fullText = pages.map((p) => p.text).join('\n\n');
  const totalWords = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;
  const totalChars = fullText.length;

  const alignments: { value: PdfAlignment; label: string; icon: React.ReactNode }[] = [
    { value: 'left', label: 'Rata kiri', icon: <AlignLeft className="w-4 h-4" /> },
    { value: 'center', label: 'Rata tengah', icon: <AlignCenter className="w-4 h-4" /> },
    { value: 'right', label: 'Rata kanan', icon: <AlignRight className="w-4 h-4" /> },
    { value: 'justify', label: 'Rata penuh', icon: <AlignJustify className="w-4 h-4" /> },
  ];

  const fonts: { value: PdfFontFamily; label: string }[] = [
    { value: 'helvetica', label: 'Sans (Helvetica)' },
    { value: 'times', label: 'Serif (Times)' },
    { value: 'courier', label: 'Mono (Courier)' },
  ];

  const paperSizes: { value: PdfPaperSize; label: string }[] = [
    { value: 'a4', label: 'A4' },
    { value: 'letter', label: 'Letter' },
  ];

  const margins: { value: PdfMarginPreset; label: string }[] = [
    { value: 'narrow', label: 'Sempit' },
    { value: 'standard', label: 'Standar' },
    { value: 'wide', label: 'Lebar' },
  ];

  return (
    <aside className="w-full xl:w-[290px] shrink-0 bg-white border-t xl:border-t-0 xl:border-l border-[#E4E7EC] p-4 space-y-6 xl:h-[calc(100vh-3.5rem)] xl:overflow-y-auto xl:sticky xl:top-14">
      <div className="space-y-3">
        <h2 className="font-display text-xs font-semibold text-[#111827] tracking-tight">
          Pengaturan Ekspor PDF
        </h2>
        <div>
          <label
            htmlFor="output-filename"
            className="block text-xs font-medium text-[#4B5563] mb-1.5"
          >
            Nama File Unduhan
          </label>
          <div className="flex items-center border border-[#D1D5DB] rounded-lg overflow-hidden bg-white focus-within:border-[#1D4ED8] focus-within:ring-2 focus-within:ring-[#1D4ED8]/15">
            <input
              id="output-filename"
              type="text"
              value={settings.outputFileName}
              onChange={(e) =>
                onUpdateSettings({ outputFileName: e.target.value })
              }
              placeholder="dokumen-diedit"
              className="w-full px-3 py-1.5 text-sm text-[#111827] focus:outline-none"
            />
            <span className="px-2.5 py-1.5 text-xs font-mono text-[#6B7280] bg-[#F7F8FA] border-l border-[#E4E7EC]">
              .pdf
            </span>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-[#E4E7EC] space-y-4">
        <h2 className="font-display text-xs font-semibold text-[#111827] tracking-tight">
          Tipografi & Paragraf
        </h2>

        <div>
          <label
            htmlFor="font-family"
            className="block text-xs font-medium text-[#4B5563] mb-1.5"
          >
            Jenis Huruf
          </label>
          <select
            id="font-family"
            value={settings.fontFamily}
            onChange={(e) =>
              onUpdateSettings({ fontFamily: e.target.value as PdfFontFamily })
            }
            disabled={!isConverted}
            className="w-full px-3 py-1.5 text-sm text-[#111827] bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#1D4ED8] disabled:bg-[#F7F8FA] disabled:text-[#9CA3AF]"
          >
            {fonts.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="font-size"
              className="block text-xs font-medium text-[#4B5563] mb-1.5"
            >
              Ukuran ({settings.fontSize}pt)
            </label>
            <input
              id="font-size"
              type="range"
              min={9}
              max={16}
              step={1}
              value={settings.fontSize}
              disabled={!isConverted}
              onChange={(e) =>
                onUpdateSettings({ fontSize: Number(e.target.value) })
              }
              className="w-full accent-[#1D4ED8] cursor-pointer disabled:opacity-40"
            />
          </div>

          <div>
            <label
              htmlFor="line-height"
              className="block text-xs font-medium text-[#4B5563] mb-1.5"
            >
              Spasi ({settings.lineHeight.toFixed(2)})
            </label>
            <input
              id="line-height"
              type="range"
              min={1.15}
              max={1.85}
              step={0.05}
              value={settings.lineHeight}
              disabled={!isConverted}
              onChange={(e) =>
                onUpdateSettings({ lineHeight: Number(e.target.value) })
              }
              className="w-full accent-[#1D4ED8] cursor-pointer disabled:opacity-40"
            />
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-[#4B5563] mb-1.5">
            Perataan Teks
          </span>
          <div className="grid grid-cols-4 gap-1 p-1 bg-[#F1F3F6] rounded-lg">
            {alignments.map((item) => {
              const active = settings.alignment === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  disabled={!isConverted}
                  onClick={() => onUpdateSettings({ alignment: item.value })}
                  className={[
                    'flex items-center justify-center py-1.5 rounded-md transition-colors disabled:opacity-40',
                    active
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-[#6B7280] hover:text-[#111827]',
                  ].join(' ')}
                >
                  {item.icon}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-[#E4E7EC] space-y-4">
        <h2 className="font-display text-xs font-semibold text-[#111827] tracking-tight">
          Tata Letak Halaman
        </h2>

        <div>
          <span className="block text-xs font-medium text-[#4B5563] mb-1.5">
            Ukuran Kertas
          </span>
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F1F3F6] rounded-lg">
            {paperSizes.map((size) => (
              <button
                key={size.value}
                type="button"
                disabled={!isConverted}
                onClick={() => onUpdateSettings({ paperSize: size.value })}
                className={[
                  'py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-40',
                  settings.paperSize === size.value
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'text-[#6B7280] hover:text-[#111827]',
                ].join(' ')}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-[#4B5563] mb-1.5">
            Margin Halaman
          </span>
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#F1F3F6] rounded-lg">
            {margins.map((m) => (
              <button
                key={m.value}
                type="button"
                disabled={!isConverted}
                onClick={() => onUpdateSettings({ marginPreset: m.value })}
                className={[
                  'py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-40',
                  settings.marginPreset === m.value
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'text-[#6B7280] hover:text-[#111827]',
                ].join(' ')}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-xs font-medium text-[#374151]">
            Tampilkan Nomor Halaman
          </span>
          <input
            type="checkbox"
            checked={settings.showPageNumbers}
            disabled={!isConverted}
            onChange={(e) =>
              onUpdateSettings({ showPageNumbers: e.target.checked })
            }
            className="w-4 h-4 rounded accent-[#1D4ED8] cursor-pointer"
          />
        </label>
      </div>

      <div className="pt-4 border-t border-[#E4E7EC] space-y-2.5">
        <h2 className="font-display text-xs font-semibold text-[#111827] tracking-tight">
          Ringkasan Dokumen
        </h2>
        <dl className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <dt className="text-[#6B7280]">Lembar Editor</dt>
            <dd className="font-mono tabular-nums font-medium text-[#111827]">
              {pages.length}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[#6B7280]">Perkiraan Halaman PDF</dt>
            <dd className="font-mono tabular-nums font-medium text-[#111827]">
              {isConverted ? estimatedPdfPages : pages.length}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[#6B7280]">Total Kata</dt>
            <dd className="font-mono tabular-nums font-medium text-[#111827]">
              {totalWords.toLocaleString('id-ID')}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[#6B7280]">Total Karakter</dt>
            <dd className="font-mono tabular-nums font-medium text-[#111827]">
              {totalChars.toLocaleString('id-ID')}
            </dd>
          </div>
        </dl>
      </div>

      {isConverted && (
        <div className="pt-4 border-t border-[#E4E7EC] space-y-2">
          <button
            type="button"
            onClick={onDownloadTxt}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#374151] bg-[#F7F8FA] hover:bg-[#EBEEF2] border border-[#E4E7EC] rounded-lg transition-colors whitespace-nowrap"
          >
            <FileDown className="w-3.5 h-3.5" />
            Unduh Teks (.TXT)
          </button>
          <button
            type="button"
            onClick={onResetToOriginal}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] rounded-lg transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Kembalikan ke Teks Asli
          </button>
        </div>
      )}
    </aside>
  );
};

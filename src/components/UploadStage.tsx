import React, { useRef, useState } from 'react';
import { FileUp, FileText, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface UploadStageProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSample: () => void;
  isParsing: boolean;
  parseProgress: { current: number; total: number; label?: string } | null;
  errorMessage: string | null;
  hasExistingDraft: boolean;
  onRestoreDraft: () => void;
}

export const UploadStage: React.FC<UploadStageProps> = ({
  onFilesSelected,
  onLoadSample,
  isParsing,
  parseProgress,
  errorMessage,
  hasExistingDraft,
  onRestoreDraft,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    onFilesSelected(Array.from(fileList));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isParsing) return;
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isParsing) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const steps = [
    {
      num: '01.',
      title: 'Unggah PDF atau Gambar',
      desc: 'Dukung file PDF, JPEG, PNG, WebP, GIF, BMP, maupun SVG. Anda juga dapat mengunggah beberapa foto halaman sekaligus.',
    },
    {
      num: '02.',
      title: 'Ubah ke Free Text Presisi',
      desc: 'Teks dari PDF maupun gambar dokumen diekstrak menjadi paragraf bebas yang bersih dan siap disunting.',
    },
    {
      num: '03.',
      title: 'Edit & Simpan Perubahan',
      desc: 'Ubah isi teks, tambah halaman, gunakan cari & ganti, serta atur jenis font dan margin halaman.',
    },
    {
      num: '04.',
      title: 'Unduh PDF Baru',
      desc: 'Setelah disimpan, ekspor dan unduh dokumen PDF hasil suntingan kapan saja.',
    },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-[#4B5563]">
              Studio Sunting Dokumen · PDF, JPEG, PNG & Gambar Lainnya
            </p>
            <h1
              className="font-display font-bold tracking-tight text-[#111827] leading-[1.15]"
              style={{
                fontSize: 'clamp(1.85rem, 3.2vw, 2.65rem)',
                textWrap: 'balance',
              }}
            >
              Ubah Dokumen PDF & Gambar Menjadi Free Text Siap Edit
            </h1>
            <p className="text-[15px] leading-relaxed text-[#4B5563] max-w-2xl">
              Unggah file PDF atau foto dokumen (JPEG, PNG, WebP, dan lainnya),
              konversi seluruh teksnya menjadi free text yang leluasa disunting,
              simpan perubahan, lalu unduh kembali sebagai PDF baru.
            </p>
          </div>

          {hasExistingDraft && !isParsing && (
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#E4E7EC] rounded-xl px-4 py-3">
              <div className="text-sm text-[#374151]">
                Ditemukan draf suntingan sebelumnya yang tersimpan di peramban.
              </div>
              <button
                type="button"
                onClick={onRestoreDraft}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1D4ED8] hover:text-[#1E40AF] whitespace-nowrap shrink-0"
              >
                Lanjutkan Draf
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={[
              'bg-white rounded-xl border-2 border-dashed p-8 sm:p-10 flex flex-col items-center justify-center text-center transition-colors min-h-[280px]',
              isDragging
                ? 'border-[#1D4ED8] bg-[#EFF6FF]/60'
                : 'border-[#D1D5DB] hover:border-[#9CA3AF]',
            ].join(' ')}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="application/pdf,.pdf,image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.tif,.tiff"
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = '';
              }}
            />

            {isParsing ? (
              <div className="flex flex-col items-center gap-3 max-w-sm">
                <Loader2 className="w-8 h-8 text-[#1D4ED8] animate-spin" />
                <div className="font-display font-semibold text-base text-[#111827]">
                  {parseProgress?.label || 'Membaca Dokumen...'}
                </div>
                {parseProgress && (
                  <p className="text-sm text-[#4B5563] font-mono tabular-nums">
                    Memproses halaman {parseProgress.current} dari {parseProgress.total}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center mb-4">
                  <FileUp className="w-6 h-6 text-[#1D4ED8]" />
                </div>
                <h2 className="font-display font-semibold text-lg text-[#111827] mb-1.5">
                  Seret dan lepas file PDF atau gambar di sini
                </h2>
                <p className="text-sm text-[#6B7280] mb-6 max-w-md">
                  Mendukung PDF multi-halaman serta file gambar JPEG, PNG, WebP,
                  GIF, BMP, dan SVG (bisa pilih banyak gambar sekaligus).
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
                  >
                    Pilih File PDF / Gambar
                  </button>
                  <button
                    type="button"
                    onClick={onLoadSample}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#111827] bg-[#F3F4F6] hover:bg-[#E5E7EB] border border-[#E4E7EC] rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <FileText className="w-4 h-4 text-[#4B5563]" />
                    Coba Dokumen Contoh
                  </button>
                </div>
              </>
            )}
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-xl px-4 py-3 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <aside className="lg:col-span-5 bg-white border border-[#E4E7EC] rounded-xl p-6 sm:p-7 flex flex-col justify-between gap-6">
          <div>
            <h2 className="font-display font-semibold text-base text-[#111827] pb-4 border-b border-[#E4E7EC]">
              Alur Kerja Penyuntingan
            </h2>
            <ol className="divide-y divide-[#F1F3F6]">
              {steps.map((step) => (
                <li key={step.num} className="py-4 first:pt-4 last:pb-0">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-mono text-xs font-semibold text-[#1D4ED8] tabular-nums shrink-0">
                      {step.num}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-[#111827]">
                        {step.title}
                      </h3>
                      <p className="text-xs leading-relaxed text-[#6B7280] mt-1">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="pt-4 border-t border-[#E4E7EC] flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6B7280]">
            <span>PDF, JPEG, PNG & WebP</span>
            <span aria-hidden="true">·</span>
            <span>Ekstraksi Teks OCR</span>
            <span aria-hidden="true">·</span>
            <span>Ekspor A4 & Letter</span>
          </div>
        </aside>
      </div>
    </main>
  );
};

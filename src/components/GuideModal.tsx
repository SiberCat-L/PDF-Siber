import React from 'react';
import { X } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#111827]/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-[#E4E7EC] rounded-xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#E4E7EC]">
          <h2
            id="guide-modal-title"
            className="font-display text-lg font-semibold text-[#111827]"
          >
            Cara Kerja LembarPDF
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panduan"
            className="p-1.5 text-[#6B7280] hover:text-[#111827] rounded-lg hover:bg-[#F3F4F6]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ol className="space-y-3.5 text-sm text-[#374151]">
          <li className="flex gap-3">
            <span className="font-mono text-xs font-semibold text-[#1D4ED8] mt-0.5 tabular-nums">
              01.
            </span>
            <div>
              <strong className="text-[#111827]">Unggah PDF atau Gambar:</strong>{' '}
              Seret file PDF, JPEG, PNG, WebP, GIF, BMP, atau SVG (bisa banyak
              gambar sekaligus), atau gunakan dokumen contoh bawaan.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs font-semibold text-[#1D4ED8] mt-0.5 tabular-nums">
              02.
            </span>
            <div>
              <strong className="text-[#111827]">Ubah ke Free Text:</strong>{' '}
              Pilih mode ekstraksi (<em>Paragraf Rapi</em> atau{' '}
              <em>Baris Asli</em>), lalu tekan{' '}
              <strong>Ubah ke Free Text</strong>. Gambar dan PDF hasil pindaian
              otomatis dibaca dengan OCR presisi agar seluruh teks bisa diedit.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs font-semibold text-[#1D4ED8] mt-0.5 tabular-nums">
              03.
            </span>
            <div>
              <strong className="text-[#111827]">Edit & Simpan:</strong> Ketik
              perubahan langsung di lembar kertas, bandingkan dengan PDF asli,
              atur jenis font serta ukuran kertas, lalu klik{' '}
              <strong>Simpan</strong>.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs font-semibold text-[#1D4ED8] mt-0.5 tabular-nums">
              04.
            </span>
            <div>
              <strong className="text-[#111827]">Unduh PDF:</strong> Tekan{' '}
              <strong>Unduh PDF</strong> untuk menghasilkan dan mengunduh file
              PDF baru hasil suntingan Anda.
            </div>
          </li>
        </ol>

        <div className="pt-3 border-t border-[#E4E7EC] flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B7280]">
          <span>Pintasan: Ctrl+S Simpan · Ctrl+F Cari & Ganti · Ctrl+Z Urungkan</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};

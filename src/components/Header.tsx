import React from 'react';

interface HeaderProps {
  hasDocument: boolean;
  isConverted: boolean;
  activeNav: 'upload' | 'editor' | 'compare' | 'guide';
  onSelectUpload: () => void;
  onSelectEditor: () => void;
  onSelectCompare: () => void;
  onSelectGuide: () => void;
  onPrimaryAction: () => void;
  isProcessing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  hasDocument,
  isConverted,
  activeNav,
  onSelectUpload,
  onSelectEditor,
  onSelectCompare,
  onSelectGuide,
  onPrimaryAction,
  isProcessing = false,
}) => {
  const primaryLabel = !hasDocument
    ? 'Unggah Dokumen'
    : !isConverted
      ? 'Ubah ke Free Text'
      : 'Unduh PDF';

  const navLinkClass = (isActive: boolean, disabled = false) =>
    [
      'text-sm font-medium transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2',
      disabled
        ? 'text-[#9CA3AF] border-transparent cursor-not-allowed'
        : isActive
          ? 'text-[#111827] border-[#1D4ED8]'
          : 'text-[#4B5563] border-transparent hover:text-[#111827] hover:border-[#D1D5DB]',
    ].join(' ');

  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-[#E4E7EC] px-4 sm:px-6 flex items-center justify-between gap-8">
      <button
        type="button"
        onClick={onSelectUpload}
        className="font-display text-lg font-bold tracking-tight text-[#111827] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8] rounded"
      >
        LembarPDF
      </button>

      <nav className="hidden md:flex items-center gap-6" aria-label="Navigasi Utama">
        <button
          type="button"
          onClick={onSelectUpload}
          className={navLinkClass(activeNav === 'upload')}
        >
          Unggah File
        </button>
        <button
          type="button"
          onClick={onSelectEditor}
          disabled={!hasDocument}
          className={navLinkClass(activeNav === 'editor', !hasDocument)}
        >
          Editor Teks
        </button>
        <button
          type="button"
          onClick={onSelectCompare}
          disabled={!hasDocument || !isConverted}
          className={navLinkClass(activeNav === 'compare', !hasDocument || !isConverted)}
        >
          Bandingkan
        </button>
        <button
          type="button"
          onClick={onSelectGuide}
          className={navLinkClass(activeNav === 'guide')}
        >
          Cara Kerja
        </button>
      </nav>

      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onPrimaryAction}
          disabled={isProcessing}
          className="px-4 py-2 text-sm font-medium text-white bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
        >
          {primaryLabel}
        </button>
      </div>
    </header>
  );
};

import { jsPDF } from 'jspdf';
import type { EditablePage, PdfExportSettings, PdfMarginPreset } from '@/src/types/pdf';

const MARGIN_MM: Record<PdfMarginPreset, number> = {
  narrow: 14,
  standard: 20,
  wide: 28,
};

function sanitizeTextForPdf(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u2192/g, '->')
    .replace(/\u2190/g, '<-')
    .replace(/\u2713|\u2714/g, '[v]')
    .replace(/\u00A0/g, ' ')
    // Keep standard ASCII + Latin-1/WinAnsi bullet/dashes, strip unsupported astral emojis
    .replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF\u2013\u2014\u2022]/g, '');
}

export function createSamplePdfFile(): File {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Proposal Pengembangan Portal Layanan Publik', 20, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Nomor Dokumen: 042/PROP-TI/XI/2026', 20, 35);
  doc.text('Tanggal Terbit: 17 November 2026', 20, 41);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('1. Ringkasan Eksekutif', 20, 55);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const p1 = doc.splitTextToSize(
    'Dokumen ini menyajikan rencana pembaruan portal layanan administrasi digital untuk mempercepat pemrosesan permohonan warga. Sistem baru dirancang agar seluruh formulir, verifikasi berkas, dan pengunduhan surat keterangan dapat diselesaikan secara daring dalam waktu kurang dari lima menit.',
    170
  );
  doc.text(p1, 20, 63);

  const p2 = doc.splitTextToSize(
    'Seluruh teks pada dokumen contoh ini tersimpan sebagai lapisan teks PDF standar. Anda dapat mengubah dokumen ini menjadi free text, menyunting isi paragraf maupun angka anggaran, menyimpan perubahan, lalu mengunduhnya kembali sebagai file PDF baru.',
    170
  );
  doc.text(p2, 20, 88);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('2. Ruang Lingkup Pekerjaan', 20, 114);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const bullets = [
    '- Analisis kebutuhan pengguna dan penyederhanaan alur pengajuan berkas.',
    '- Pengembangan antarmuka web responsif serta validasi data otomatis.',
    '- Integrasi tanda tangan elektronik dan arsip dokumen terenkripsi.',
    '- Pelatihan operator layanan dan pendampingan selama masa transisi.',
  ];
  let y = 123;
  for (const b of bullets) {
    const lines = doc.splitTextToSize(b, 166);
    doc.text(lines, 24, y);
    y += lines.length * 6.5;
  }

  // Page 2
  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('3. Estimasi Jadwal dan Anggaran', 20, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const p3 = doc.splitTextToSize(
    'Pelaksanaan proyek direncanakan berlangsung selama 12 minggu dengan pembagian tiga tahap utama. Tahap pertama berfokus pada desain sistem dan prototipe, tahap kedua pada implementasi modul inti, dan tahap ketiga pada uji coba beban serta peluncuran resmi.',
    170
  );
  doc.text(p3, 20, 35);

  const p4 = doc.splitTextToSize(
    'Total estimasi biaya operasional dan pengembangan sebesar Rp 145.000.000 belum termasuk pajak pertambahan nilai. Silakan sunting angka, tanggal, atau klausul di halaman ini melalui editor free text sebelum menyimpan hasil akhir PDF.',
    170
  );
  doc.text(p4, 20, 60);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Penanggung Jawab Proyek,', 20, 92);
  doc.setFont('helvetica', 'normal');
  doc.text('Raka Pratama - Kepala Divisi Sistem Informasi', 20, 112);

  const blob = doc.output('blob');
  return new File([blob], 'Proposal-Layanan-Publik-2026.pdf', {
    type: 'application/pdf',
  });
}

export function buildPdfDocument(
  pages: EditablePage[],
  settings: PdfExportSettings
): { doc: jsPDF; totalOutputPages: number } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: settings.paperSize,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = MARGIN_MM[settings.marginPreset];
  const printableWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - margin - (settings.showPageNumbers ? 8 : 0);

  doc.setFont(settings.fontFamily, 'normal');
  doc.setFontSize(settings.fontSize);

  const ptToMm = 0.352778;
  const lineStepMm = settings.fontSize * ptToMm * settings.lineHeight;
  const blankLineStepMm = lineStepMm * 0.72;

  pages.forEach((page, pageIdx) => {
    if (pageIdx > 0) {
      doc.addPage();
    }

    let cursorY = margin + settings.fontSize * ptToMm;
    const cleanContent = sanitizeTextForPdf(page.text);
    const rawParagraphs = cleanContent.split('\n');

    for (let pIndex = 0; pIndex < rawParagraphs.length; pIndex++) {
      const paragraph = rawParagraphs[pIndex];

      if (paragraph.trim().length === 0) {
        cursorY += blankLineStepMm;
        if (cursorY > bottomLimit) {
          doc.addPage();
          cursorY = margin + settings.fontSize * ptToMm;
        }
        continue;
      }

      const wrappedLines = doc.splitTextToSize(paragraph, printableWidth) as string[];

      for (let lineIdx = 0; lineIdx < wrappedLines.length; lineIdx++) {
        if (cursorY > bottomLimit) {
          doc.addPage();
          cursorY = margin + settings.fontSize * ptToMm;
        }

        const lineText = wrappedLines[lineIdx];
        const isLastLineOfParagraph = lineIdx === wrappedLines.length - 1;

        if (settings.alignment === 'center') {
          doc.text(lineText, pageWidth / 2, cursorY, { align: 'center' });
        } else if (settings.alignment === 'right') {
          doc.text(lineText, pageWidth - margin, cursorY, { align: 'right' });
        } else if (settings.alignment === 'justify' && !isLastLineOfParagraph) {
          doc.text(lineText, margin, cursorY, {
            align: 'justify',
            maxWidth: printableWidth,
          });
        } else {
          doc.text(lineText, margin, cursorY, { align: 'left' });
        }

        cursorY += lineStepMm;
      }
    }
  });

  const totalOutputPages = doc.getNumberOfPages();

  if (settings.showPageNumbers) {
    doc.setFont(settings.fontFamily, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(110, 118, 129);
    for (let i = 1; i <= totalOutputPages; i++) {
      doc.setPage(i);
      doc.text(
        `Halaman ${i} dari ${totalOutputPages}`,
        pageWidth / 2,
        pageHeight - Math.max(9, margin * 0.55),
        { align: 'center' }
      );
    }
    doc.setTextColor(17, 24, 39);
  }

  return { doc, totalOutputPages };
}

export function exportPagesToPdf(
  pages: EditablePage[],
  settings: PdfExportSettings
): { fileName: string; totalOutputPages: number } {
  const { doc, totalOutputPages } = buildPdfDocument(pages, settings);
  const trimmed = settings.outputFileName.trim() || 'dokumen-diedit';
  const fileName = trimmed.toLowerCase().endsWith('.pdf')
    ? trimmed
    : `${trimmed}.pdf`;

  doc.save(fileName);
  return { fileName, totalOutputPages };
}

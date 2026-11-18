import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface OcrRequestBody {
  imageDataUrl?: string;
}

interface OcrResult {
  autoText: string;
  rawLineText: string;
  hasText: boolean;
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    data: match[2],
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.post('/api/ocr/extract', async (req: Request, res: Response) => {
    try {
      const body = req.body as OcrRequestBody | undefined;
      if (!body?.imageDataUrl || typeof body.imageDataUrl !== 'string') {
        res.status(400).json({
          error: 'Data gambar tidak ditemukan pada permintaan.',
        });
        return;
      }

      const parsed = parseDataUrl(body.imageDataUrl);
      if (!parsed) {
        res.status(400).json({
          error: 'Format data gambar tidak valid.',
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(500).json({
          error:
            'Kunci API Gemini belum dikonfigurasi pada server. Periksa panel Settings > Secrets.',
        });
        return;
      }

      const systemInstruction = [
        'Anda adalah mesin OCR dokumen presisi tinggi.',
        'Tugas Anda adalah menyalin seluruh teks yang terlihat pada gambar dokumen apa adanya secara akurat tanpa mengarang atau menambah kata.',
        'Pertahankan bahasa asli dokumen (misalnya Bahasa Indonesia atau Inggris), angka, tanda baca, simbol mata uang, tanggal, dan struktur daftar.',
        'Jika terdapat tabel atau kolom, susun barisnya dengan spasi pemisah yang rapi dan mudah dibaca sebagai teks bebas.',
        'Keluarkan dua versi dalam JSON:',
        '1. autoText: gabungkan kalimat yang terpotong ganti baris dalam satu paragraf menjadi paragraf utuh, pisahkan antar paragraf atau judul dengan baris kosong (\\n\\n).',
        '2. rawLineText: pertahankan setiap baris persis sesuai posisi baris visual pada gambar (dipisah dengan \\n).',
        '3. hasText: bernilai true jika ada teks yang terbaca pada gambar, atau false jika gambar tidak memuat teks.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: parsed.mimeType,
                data: parsed.data,
              },
            },
            {
              text: 'Ekstrak seluruh teks yang ada di gambar dokumen ini agar bisa diedit sebagai free text.',
            },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hasText: {
                type: Type.BOOLEAN,
                description: 'Apakah gambar mengandung teks yang dapat dibaca.',
              },
              autoText: {
                type: Type.STRING,
                description:
                  'Teks hasil ekstraksi dengan paragraf rapi yang siap disunting.',
              },
              rawLineText: {
                type: Type.STRING,
                description:
                  'Teks hasil ekstraksi yang mempertahankan pemisahan baris asli.',
              },
            },
            required: ['hasText', 'autoText', 'rawLineText'],
          },
        },
      });

      const rawJson = (response.text ?? '').trim();
      if (!rawJson) {
        res.status(502).json({
          error: 'Layanan ekstraksi teks tidak mengembalikan hasil.',
        });
        return;
      }

      const parsedResult = JSON.parse(rawJson) as Partial<OcrResult>;
      const autoText = typeof parsedResult.autoText === 'string' ? parsedResult.autoText : '';
      const rawLineText =
        typeof parsedResult.rawLineText === 'string'
          ? parsedResult.rawLineText
          : autoText;
      const hasText =
        typeof parsedResult.hasText === 'boolean'
          ? parsedResult.hasText
          : autoText.trim().length > 0 || rawLineText.trim().length > 0;

      res.json({
        hasText,
        autoText,
        rawLineText,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Terjadi kesalahan saat mengekstrak teks.';
      const status =
        /PERMISSION_DENIED|403/i.test(message)
          ? 403
          : /API_KEY_INVALID|400/i.test(message)
            ? 400
            : /RESOURCE_EXHAUSTED|429/i.test(message)
              ? 429
              : 500;

      let userMessage = 'Gagal mengekstrak teks dari gambar dokumen.';
      if (status === 403 || status === 400) {
        userMessage =
          'Kunci API tidak valid atau ditolak. Periksa pengaturan API key di Settings > Secrets.';
      } else if (status === 429) {
        userMessage =
          'Batas permintaan OCR sementara tercapai. Tunggu beberapa saat lalu coba lagi.';
      }

      res.status(status).json({
        error: userMessage,
        detail: message,
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output tidak ditemukan.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import CSSMatrix from "dommatrix";

const PDF_WORKER_CDN =
  "https://cdn.jsdelivr.net/npm/pdf-parse@2.4.5/dist/pdf-parse/esm/pdf.worker.mjs";

/** Apply browser DOM shims before pdf.js / pdf-parse load. */
function ensureDomPolyfills(): void {
  const g = globalThis as typeof globalThis & {
    DOMMatrix?: unknown;
  };

  if (typeof g.DOMMatrix === "undefined") {
    g.DOMMatrix = CSSMatrix;
  }

  // Minimal stubs for pdf.js — not full browser implementations.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyG = g as any;

  if (typeof anyG.ImageData === "undefined") {
    anyG.ImageData = class ImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(data: Uint8ClampedArray | number, width?: number, height?: number) {
        if (typeof data === "number") {
          this.width = data;
          this.height = width ?? 0;
          this.data = new Uint8ClampedArray(this.width * this.height * 4);
        } else {
          this.data = data;
          this.width = width ?? 0;
          this.height = height ?? 0;
        }
      }
    };
  }

  if (typeof anyG.Path2D === "undefined") {
    anyG.Path2D = class Path2D {};
  }
}

// Must run at module load — before any pdf-parse import.
ensureDomPolyfills();

let workerConfigured = false;

async function configurePdfWorker(): Promise<void> {
  if (workerConfigured) return;
  ensureDomPolyfills();

  const { PDFParse } = await import("pdf-parse");

  const candidates = [
    path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
    path.join(process.cwd(), "node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs"),
  ];

  const workerPath = candidates.find((p) => fs.existsSync(p));
  if (workerPath) {
    PDFParse.setWorker(pathToFileURL(workerPath).href);
  } else {
    PDFParse.setWorker(PDF_WORKER_CDN);
  }

  workerConfigured = true;
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  await configurePdfWorker();
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

/** True when PDF text looks like a real roster (not a scanned image PDF). */
export function isUsablePdfText(text: string): boolean {
  const cleaned = text
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "")
    .replace(/\s+/g, "");
  return cleaned.length >= 40;
}

function sniffBufferMime(data: Buffer): string {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    data.length >= 12 &&
    data.subarray(0, 4).toString("ascii") === "RIFF" &&
    data.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return "image/png";
}

export type PdfEmbeddedImage = {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
};

/**
 * Extract the largest embedded image from a PDF (common for camera/Kakao "PDF" saves).
 */
export async function extractLargestPdfImage(buffer: Buffer): Promise<PdfEmbeddedImage | null> {
  await configurePdfWorker();
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getImage({ imageThreshold: 40, imageBuffer: true, imageDataUrl: false });
    let best: PdfEmbeddedImage | null = null;
    let bestArea = 0;
    for (const page of result.pages) {
      for (const img of page.images) {
        if (!img.data?.length) continue;
        const area = (img.width || 0) * (img.height || 0);
        if (area < bestArea) continue;
        const buf = Buffer.from(img.data);
        best = {
          buffer: buf,
          mimeType: sniffBufferMime(buf),
          width: img.width,
          height: img.height,
        };
        bestArea = area;
      }
    }
    return best;
  } finally {
    await parser.destroy();
  }
}

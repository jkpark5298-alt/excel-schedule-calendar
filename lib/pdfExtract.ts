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

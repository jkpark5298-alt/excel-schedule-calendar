import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PDF_WORKER_CDN =
  "https://cdn.jsdelivr.net/npm/pdf-parse@2.4.5/dist/pdf-parse/esm/pdf.worker.mjs";

let workerConfigured = false;

async function configurePdfWorker(): Promise<void> {
  if (workerConfigured) return;

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

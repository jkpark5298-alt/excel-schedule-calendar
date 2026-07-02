import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFParse } from "pdf-parse";

let workerConfigured = false;

function configurePdfWorker(): void {
  if (workerConfigured) return;

  const candidates = [
    path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
    path.join(process.cwd(), "node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs"),
  ];

  const workerPath = candidates.find((p) => fs.existsSync(p));
  if (!workerPath) {
    throw new Error("PDF worker 파일을 찾을 수 없습니다. npm install을 실행해 주세요.");
  }

  PDFParse.setWorker(pathToFileURL(workerPath).href);
  workerConfigured = true;
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  configurePdfWorker();
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

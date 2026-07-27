export type PdfExportMode = "download" | "share" | "auto";

export interface ExportPdfOptions {
  /** download: 파일 저장 / share: 공유 시트 / auto: 모바일은 공유, PC는 저장 */
  mode?: PdfExportMode;
  title?: string;
  text?: string;
}

function isMobileUa(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** html2canvas + jsPDF 로 요소를 A4 PDF Blob으로 변환 */
export async function elementToPdfBlob(element: HTMLElement): Promise<Blob> {
  const { default: html2canvas } = await import("html2canvas");
  const { jsPDF } = await import("jspdf");

  const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = (canvas.height * pdfW) / canvas.width;
  const pageH = pdf.internal.pageSize.getHeight();

  let yPos = 0;
  while (yPos < pdfH) {
    if (yPos > 0) pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, -yPos, pdfW, pdfH);
    yPos += pageH;
  }

  return pdf.output("blob");
}

/**
 * 캘린더 요소를 PDF로 만들어 PC 저장 또는 공유.
 * iPhone/Android: Web Share(가능 시) → 실패 시 다운로드
 * Desktop: 파일 다운로드
 */
export async function exportElementAsPdf(
  element: HTMLElement,
  filename: string,
  options: ExportPdfOptions = {},
): Promise<"shared" | "downloaded" | "aborted"> {
  const mode = options.mode ?? "auto";
  const blob = await elementToPdfBlob(element);
  const file = new File([blob], filename, { type: "application/pdf" });

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  const wantShare =
    mode === "share" || (mode === "auto" && isMobileUa());

  if (wantShare) {
    try {
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({
          files: [file],
          title: options.title ?? filename,
          text: options.text ?? "근무표 PDF",
        });
        return "shared";
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "aborted";
      // share 실패 시 다운로드로 폴백
    }
  }

  if (mode === "share" && !wantShare) {
    // 데스크톱에서 공유 요청 → 다운로드 + 안내
    triggerBlobDownload(blob, filename);
    window.setTimeout(() => {
      alert(`PDF가 저장되었습니다 (${filename})\n\n메신저·메일로 파일을 첨부해 공유하세요.`);
    }, 300);
    return "downloaded";
  }

  triggerBlobDownload(blob, filename);
  return "downloaded";
}

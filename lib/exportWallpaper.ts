export const WALLPAPER_WIDTH = 1600;
export const WALLPAPER_HEIGHT = 900;

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

/** 요소를 정확히 1600×900 PNG Blob으로 변환 */
export async function elementToWallpaperPng(element: HTMLElement): Promise<Blob> {
  const { default: html2canvas } = await import("html2canvas");

  const canvas = await html2canvas(element, {
    scale: 1,
    width: WALLPAPER_WIDTH,
    height: WALLPAPER_HEIGHT,
    windowWidth: WALLPAPER_WIDTH,
    windowHeight: WALLPAPER_HEIGHT,
    backgroundColor: "#1c1c1e",
    useCORS: true,
    logging: false,
  });

  const out = document.createElement("canvas");
  out.width = WALLPAPER_WIDTH;
  out.height = WALLPAPER_HEIGHT;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.fillStyle = "#1c1c1e";
  ctx.fillRect(0, 0, WALLPAPER_WIDTH, WALLPAPER_HEIGHT);
  ctx.drawImage(canvas, 0, 0, WALLPAPER_WIDTH, WALLPAPER_HEIGHT);

  const blob = await new Promise<Blob | null>((resolve) => {
    out.toBlob((b) => resolve(b), "image/png");
  });
  if (!blob) throw new Error("PNG 생성 실패");
  return blob;
}

/** 캘린더를 Windows 배경용 PNG로 다운로드 */
export async function exportElementAsWallpaper(
  element: HTMLElement,
  filename: string,
): Promise<"downloaded"> {
  const blob = await elementToWallpaperPng(element);
  triggerBlobDownload(blob, filename);
  return "downloaded";
}

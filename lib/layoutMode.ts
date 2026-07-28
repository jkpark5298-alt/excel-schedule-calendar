export type LayoutMode = "phone" | "pc";

const STORAGE_KEY = "work-schedule-layout-mode";

export function isLayoutMode(value: unknown): value is LayoutMode {
  return value === "phone" || value === "pc";
}

export function loadLayoutMode(): LayoutMode {
  if (typeof window === "undefined") return "phone";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isLayoutMode(raw)) return raw;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(min-width: 900px)").matches ? "pc" : "phone";
}

export function saveLayoutMode(mode: LayoutMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

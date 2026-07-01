import { ParsedSchedule } from "@/types/schedule";

const STORAGE_KEY = "work-schedule-iphone-calendar";
const IDB_NAME = "work-schedule-calendar-idb";
const IDB_STORE = "data";
const IDB_KEY = "main";

export const MAX_YEAR = 2029;
export const MAX_MONTH = 3;
export const MIN_YEAR = 2026;
export const MIN_MONTH = 1;

export interface StoredCalendarData {
  targetName: string;
  schedules: Record<string, ParsedSchedule>;
  savedAt?: number;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function isWithinRange(year: number, month: number): boolean {
  if (year < MIN_YEAR || year > MAX_YEAR) return false;
  if (year === MIN_YEAR && month < MIN_MONTH) return false;
  if (year === MAX_YEAR && month > MAX_MONTH) return false;
  return month >= 1 && month <= 12;
}

export function canGoPrev(year: number, month: number): boolean {
  if (month > 1) return isWithinRange(year, month - 1);
  return isWithinRange(year - 1, 12);
}

export function canGoNext(year: number, month: number): boolean {
  if (month < 12) return isWithinRange(year, month + 1);
  return isWithinRange(year + 1, 1);
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  let y = year;
  let m = month + delta;
  while (m < 1) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  return { year: y, month: m };
}

export function clampToRange(year: number, month: number): { year: number; month: number } {
  if (year < MIN_YEAR || (year === MIN_YEAR && month < MIN_MONTH)) return { year: MIN_YEAR, month: MIN_MONTH };
  if (year > MAX_YEAR || (year === MAX_YEAR && month > MAX_MONTH)) return { year: MAX_YEAR, month: MAX_MONTH };
  return { year, month };
}

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readFromIDB(): Promise<StoredCalendarData | null> {
  try {
    const db = await openIDB();
    const result = await new Promise<StoredCalendarData | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve((req.result as StoredCalendarData) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

async function writeToIDB(data: StoredCalendarData): Promise<void> {
  try {
    const db = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(data, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // localStorage still holds data
  }
}

export function readStoredCalendar(): StoredCalendarData {
  if (typeof window === "undefined") return { targetName: "박종규", schedules: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { targetName: "박종규", schedules: {} };
    const parsed = JSON.parse(raw) as StoredCalendarData;
    return { targetName: parsed.targetName || "박종규", schedules: parsed.schedules || {} };
  } catch {
    return { targetName: "박종규", schedules: {} };
  }
}

/** Load from IndexedDB + localStorage (prefer richer dataset) */
export async function loadStoredCalendar(): Promise<StoredCalendarData> {
  const local = readStoredCalendar();
  const idb = await readFromIDB();
  if (!idb) return local;
  const localCount = Object.keys(local.schedules).length;
  const idbCount = Object.keys(idb.schedules || {}).length;
  if (idbCount >= localCount) {
    writeStoredCalendar(idb);
    return idb;
  }
  if (localCount > 0) void writeToIDB(local);
  return local;
}

export function writeStoredCalendar(data: StoredCalendarData): void {
  const withTime = { ...data, savedAt: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(withTime));
  void writeToIDB(withTime);
}

export function saveScheduleForMonth(data: StoredCalendarData, schedule: ParsedSchedule): StoredCalendarData {
  const key = monthKey(schedule.year, schedule.month);
  const next: StoredCalendarData = {
    targetName: schedule.targetName,
    schedules: { ...data.schedules, [key]: schedule },
    savedAt: Date.now(),
  };
  writeStoredCalendar(next);
  return next;
}

export function deleteScheduleForMonth(data: StoredCalendarData, year: number, month: number): StoredCalendarData {
  const key = monthKey(year, month);
  const { [key]: _, ...rest } = data.schedules;
  const next: StoredCalendarData = { ...data, schedules: rest, savedAt: Date.now() };
  writeStoredCalendar(next);
  return next;
}

export function listStoredMonths(data: StoredCalendarData): string[] {
  return Object.keys(data.schedules).sort();
}

export function exportBackupJson(data: StoredCalendarData): string {
  return JSON.stringify(data, null, 2);
}

export function importBackupJson(raw: string): StoredCalendarData {
  const parsed = JSON.parse(raw) as StoredCalendarData;
  if (!parsed.schedules || typeof parsed.schedules !== "object") {
    throw new Error("올바른 백업 파일이 아닙니다.");
  }
  const next: StoredCalendarData = {
    targetName: parsed.targetName || "박종규",
    schedules: parsed.schedules,
    savedAt: Date.now(),
  };
  writeStoredCalendar(next);
  return next;
}

export function downloadBackup(data: StoredCalendarData): void {
  const blob = new Blob([exportBackupJson(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `근무표_백업_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

import { ParsedSchedule } from "@/types/schedule";

const STORAGE_KEY = "work-schedule-iphone-calendar";
export const MAX_YEAR = 2029;
export const MAX_MONTH = 3;
export const MIN_YEAR = 2026;
export const MIN_MONTH = 1;

export interface StoredCalendarData {
  targetName: string;
  schedules: Record<string, ParsedSchedule>;
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

export function writeStoredCalendar(data: StoredCalendarData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveScheduleForMonth(data: StoredCalendarData, schedule: ParsedSchedule): StoredCalendarData {
  const key = monthKey(schedule.year, schedule.month);
  const next = { targetName: schedule.targetName, schedules: { ...data.schedules, [key]: schedule } };
  writeStoredCalendar(next);
  return next;
}

export function deleteScheduleForMonth(data: StoredCalendarData, year: number, month: number): StoredCalendarData {
  const key = monthKey(year, month);
  const { [key]: _, ...rest } = data.schedules;
  const next = { ...data, schedules: rest };
  writeStoredCalendar(next);
  return next;
}

export function listStoredMonths(data: StoredCalendarData): string[] {
  return Object.keys(data.schedules).sort();
}

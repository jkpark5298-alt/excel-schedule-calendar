import { DaySchedule } from "@/types/schedule";

export const DOW_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

export interface MonthCell {
  key: string;
  date: number;
  inMonth: boolean;
  dayOfWeek: string;
  schedule: DaySchedule | null;
  isToday: boolean;
}

function getWeekNumber(year: number, month: number, day: number): number {
  const d = new Date(year, month - 1, day);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function cellAbsoluteDate(cell: MonthCell, year: number, month: number): Date {
  if (cell.inMonth) return new Date(year, month - 1, cell.date);
  if (cell.date > 20) return new Date(year, month - 2, cell.date);
  return new Date(year, month, cell.date);
}

/** Build iOS-style month grid (Sun start) with schedule mapped to cells */
export function buildMonthGrid(
  year: number,
  month: number,
  days: DaySchedule[],
  today?: { year: number; month: number; day: number },
): { weeks: MonthCell[][]; weekNumbers: number[] } {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startPad = first.getDay();
  const prevMonthDays = new Date(year, month - 1, 0).getDate();

  const flat: MonthCell[] = [];

  for (let i = startPad - 1; i >= 0; i--) {
    const date = prevMonthDays - i;
    const cellDate = new Date(year, month - 2, date);
    const dow = DOW_KO[cellDate.getDay()];
    flat.push({
      key: `p-${date}-${dow}`,
      date,
      inMonth: false,
      dayOfWeek: dow,
      schedule: null,
      isToday: !!(today && today.year === year && today.month === month - 1 && today.day === date),
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = DOW_KO[new Date(year, month - 1, d).getDay()];
    flat.push({
      key: `m-${d}-${dow}`,
      date: d,
      inMonth: true,
      dayOfWeek: dow,
      schedule: null,
      isToday: !!(today && today.year === year && today.month === month && today.day === d),
    });
  }

  let nextDate = 1;
  while (flat.length % 7 !== 0) {
    const cellDate = new Date(year, month, nextDate);
    const dow = DOW_KO[cellDate.getDay()];
    flat.push({
      key: `n-${nextDate}-${dow}`,
      date: nextDate,
      inMonth: false,
      dayOfWeek: dow,
      schedule: null,
      isToday: false,
    });
    nextDate++;
  }

  // Map each schedule entry to cell by date + dayOfWeek (handles duplicate date 30)
  const sorted = [...days].sort((a, b) => a.orderIndex - b.orderIndex);
  for (const day of sorted) {
    const cell = flat.find(
      (c) => !c.schedule && c.date === day.date && c.dayOfWeek === day.dayOfWeek,
    );
    if (cell) cell.schedule = day;
  }

  const weeks: MonthCell[][] = [];
  const weekNumbers: number[] = [];
  for (let i = 0; i < flat.length; i += 7) {
    const week = flat.slice(i, i + 7);
    weeks.push(week);
    const sunday = week[0];
    const abs = cellAbsoluteDate(sunday, year, month);
    weekNumbers.push(getWeekNumber(abs.getFullYear(), abs.getMonth() + 1, abs.getDate()));
  }

  return { weeks, weekNumbers };
}

export function skdPillLabel(day: DaySchedule): string {
  const leader = day.isLeader ? "👍" : "";
  let label = `${leader}${day.myShift}`;
  if (day.myShift !== "休" && day.sameShiftCoworkers.length > 0) {
    const names = day.sameShiftCoworkers.slice(0, 2).join(",");
    label += ` ${names}`;
  }
  return label.slice(0, 18);
}

export function skdPillClass(shift: string): string {
  if (shift === "C") return "skd-pill-c";
  if (shift === "A") return "skd-pill-a";
  if (shift === "당") return "skd-pill-dang";
  if (shift === "休") return "skd-pill-rest";
  return "skd-pill-other";
}

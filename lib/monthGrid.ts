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

  const pool = days.map((d, i) => ({ d, i }));
  const used = new Set<number>();

  function takeSchedule(date: number, dow: string, inMonth: boolean): DaySchedule | null {
    // Prefer exact date + dayOfWeek match
    let idx = pool.findIndex(({ d, i }) => !used.has(i) && d.date === date && d.dayOfWeek === dow);
    if (idx >= 0) {
      used.add(pool[idx].i);
      return pool[idx].d;
    }
    // Prev-month overflow: sheet day 30/31 in leading cells
    if (!inMonth) {
      idx = pool.findIndex(({ d, i }) => !used.has(i) && d.date === date);
      if (idx >= 0) {
        used.add(pool[idx].i);
        return pool[idx].d;
      }
    }
    // Current month: match by date if only one unused with that date
    if (inMonth) {
      const candidates = pool.filter(({ d, i }) => !used.has(i) && d.date === date);
      if (candidates.length === 1) {
        used.add(candidates[0].i);
        return candidates[0].d;
      }
      idx = pool.findIndex(({ d, i }) => !used.has(i) && d.date === date);
      if (idx >= 0) {
        used.add(pool[idx].i);
        return pool[idx].d;
      }
    }
    return null;
  }

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
      schedule: takeSchedule(date, dow, false),
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
      schedule: takeSchedule(d, dow, true),
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
      schedule: takeSchedule(nextDate, dow, false),
      isToday: false,
    });
    nextDate++;
  }

  // Assign any remaining schedule entries to best matching unused cells
  for (const { d, i } of pool) {
    if (used.has(i)) continue;
    const target = flat.find(
      (c) => !c.schedule && c.date === d.date && c.dayOfWeek === d.dayOfWeek,
    );
    if (target) target.schedule = d;
  }

  const weeks: MonthCell[][] = [];
  const weekNumbers: number[] = [];
  for (let i = 0; i < flat.length; i += 7) {
    const week = flat.slice(i, i + 7);
    weeks.push(week);
    const ref = week.find((c) => c.inMonth) || week[0];
    const refYear = ref.inMonth ? year : ref.date > 20 ? year : month === 1 ? year - 1 : year;
    const refMonth = ref.inMonth ? month : ref.date > 20 ? month - 1 : month;
    weekNumbers.push(getWeekNumber(refYear, refMonth, ref.date));
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

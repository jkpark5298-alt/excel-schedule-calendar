import { DaySchedule } from "@/types/schedule";
import { skdPillClass, skdPillLabel, skdPillBottomLabel, skdPillBoardingLabel, isBoardingSchedule, isBoardingDayLayout } from "@/lib/shiftDisplay";

export const DOW_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

export interface MonthCell {
  key: string;
  date: number;
  inMonth: boolean;
  dayOfWeek: string;
  schedule: DaySchedule | null;
  isToday: boolean;
}

/** Build iOS-style month grid (Sun start) with schedule mapped to cells */
export function buildMonthGrid(
  year: number,
  month: number,
  days: DaySchedule[],
  today?: { year: number; month: number; day: number },
): { weeks: MonthCell[][] } {
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

  const sorted = [...days].sort((a, b) => a.orderIndex - b.orderIndex);
  for (const day of sorted) {
    const cell = flat.find(
      (c) => !c.schedule && c.inMonth && c.date === day.date,
    );
    if (cell) cell.schedule = day;
  }

  const weeks: MonthCell[][] = [];
  for (let i = 0; i < flat.length; i += 7) {
    weeks.push(flat.slice(i, i + 7));
  }

  return { weeks };
}

export { skdPillClass, skdPillLabel, skdPillBottomLabel, skdPillBoardingLabel, isBoardingSchedule, isBoardingDayLayout };

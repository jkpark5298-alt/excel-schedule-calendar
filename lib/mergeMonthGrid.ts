import { DaySchedule } from "@/types/schedule";
import { DOW_KO } from "@/lib/monthGrid";

export interface MergedMonthCell {
  key: string;
  date: number;
  inMonth: boolean;
  dayOfWeek: string;
  opsDay: DaySchedule | null;
  boardingDay: DaySchedule | null;
  isToday: boolean;
}

function mapDaysByDate(days: DaySchedule[]): Map<number, DaySchedule> {
  const map = new Map<number, DaySchedule>();
  for (const day of days) {
    if (!map.has(day.date)) map.set(day.date, day);
  }
  return map;
}

/** 한 캘린더 셀에 운항(박종규) + 탑승(김현숙) 일정을 매핑 */
export function buildMergedMonthGrid(
  year: number,
  month: number,
  opsDays: DaySchedule[],
  boardingDays: DaySchedule[],
  today?: { year: number; month: number; day: number },
): { weeks: MergedMonthCell[][] } {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startPad = first.getDay();
  const prevMonthDays = new Date(year, month - 1, 0).getDate();
  const opsByDate = mapDaysByDate(opsDays);
  const boardingByDate = mapDaysByDate(boardingDays);

  const flat: MergedMonthCell[] = [];

  for (let i = startPad - 1; i >= 0; i--) {
    const date = prevMonthDays - i;
    const cellDate = new Date(year, month - 2, date);
    const dow = DOW_KO[cellDate.getDay()];
    flat.push({
      key: `p-${date}-${dow}`,
      date,
      inMonth: false,
      dayOfWeek: dow,
      opsDay: null,
      boardingDay: null,
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
      opsDay: opsByDate.get(d) ?? null,
      boardingDay: boardingByDate.get(d) ?? null,
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
      opsDay: null,
      boardingDay: null,
      isToday: false,
    });
    nextDate++;
  }

  const weeks: MergedMonthCell[][] = [];
  for (let i = 0; i < flat.length; i += 7) {
    weeks.push(flat.slice(i, i + 7));
  }

  return { weeks };
}

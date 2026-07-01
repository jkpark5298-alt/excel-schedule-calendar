import { DaySchedule } from "@/types/schedule";

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const DOW_INDEX: Record<string, number> = {
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
};

export type WeekRow = (DaySchedule | null)[];

/** Group schedule days into Sun–Sat week rows (일요일 시작). */
export function groupDaysIntoWeeks(days: DaySchedule[]): WeekRow[] {
  const weeks: WeekRow[] = [];
  let week: WeekRow = [null, null, null, null, null, null, null];
  let lastIdx = -1;

  for (const day of days) {
    const idx = DOW_INDEX[day.dayOfWeek];
    if (idx === undefined) continue;

    if (idx === 0 && lastIdx >= 0) {
      weeks.push(week);
      week = [null, null, null, null, null, null, null];
    } else if (idx <= lastIdx && lastIdx >= 0) {
      weeks.push(week);
      week = [null, null, null, null, null, null, null];
    }

    week[idx] = day;
    lastIdx = idx;
  }

  if (week.some(Boolean)) weeks.push(week);
  return weeks;
}

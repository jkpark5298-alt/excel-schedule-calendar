import { DaySchedule, ParsedSchedule } from "@/types/schedule";
import { BOARDING_TARGET, normalizeShift } from "@/lib/shiftDisplay";

const DOW_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

function dowForDate(year: number, month: number, date: number): string {
  return DOW_KO[new Date(year, month - 1, date).getDay()];
}

/** 탑승수속팀 26년 7월 SKD PDF — 김현숙(53) 행 기준 */
const KIM_HYUNSUK_2026_07 = [
  "주", "B7", "A5", "주", "P", "A5", "P", "주", "B7", "A5", "주", "D",
  "교육", "교육", "주", "B7", "D", "주", "A5", "P", "주", "주", "B7", "D",
  "A5", "주", "A5", "P", "연", "P", "D",
] as const;

export function getBoardingReferenceSchedule(
  targetName: string,
  year: number,
  month: number,
): ParsedSchedule | null {
  if (targetName !== BOARDING_TARGET) return null;
  if (year === 2026 && month === 7) {
    return buildFromShifts(targetName, year, month, [...KIM_HYUNSUK_2026_07]);
  }
  return null;
}

function buildFromShifts(
  targetName: string,
  year: number,
  month: number,
  shifts: string[],
): ParsedSchedule {
  const daysInMonth = new Date(year, month, 0).getDate();
  const count = Math.min(shifts.length, daysInMonth);
  const days: DaySchedule[] = [];

  for (let i = 0; i < count; i++) {
    const date = i + 1;
    days.push({
      orderIndex: i,
      date,
      dayOfWeek: dowForDate(year, month, date),
      myShift: normalizeShift(shifts[i]),
      isLeader: false,
      sameShiftCoworkers: [],
      relatedCoworkers: null,
      allWorkers: [],
    });
  }

  return { targetName, year, month, days };
}

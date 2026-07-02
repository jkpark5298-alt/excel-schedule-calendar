import { DaySchedule, ShiftCode } from "@/types/schedule";

export const REST_RAW = new Set(["전", "X", "휴", "休", "주", "연"]);
export const WORK_SHIFTS = new Set(["C", "A", "당"]);

/** Display label with time range for boarding-team SKD codes */
export const SHIFT_TIME_LABELS: Record<string, string> = {
  B7: "B7(11~20)",
  A5: "A5(05:40~14:40)",
  P: "P(13:00~22:00)",
  D: "D(05:00~11:30)",
  P6: "P6(13:30~22:30)",
};

export const SHIFT_OPTIONS: ShiftCode[] = [
  "C", "A", "당", "休",
  "B7", "A5", "P", "D", "P6",
  "연", "N", "교육",
];

export function normalizeShift(raw: string | null | undefined): ShiftCode {
  if (!raw) return "休";
  const s = String(raw).trim();
  if (REST_RAW.has(s)) return "休";
  return s as ShiftCode;
}

export const BOARDING_SHIFTS = new Set(["B7", "A5", "P", "D", "P6", "교육"]);
export const BOARDING_SHIFT_OPTIONS: ShiftCode[] = ["B7", "A5", "P", "D", "P6", "休", "교육"];
export const BOARDING_TARGET = "김현숙";

/** 탑승수속 월간 스케줄 여부 (B7/A5/P/D/P6 포함 시) */
export function isBoardingSchedule(days: DaySchedule[]): boolean {
  return days.some((d) => BOARDING_SHIFTS.has(d.myShift));
}

/** 셀 하단 탑승 레이아웃 — 休는 탑승 월에만 하단, 박종규(운항)는 상단 */
export function isBoardingDayLayout(days: DaySchedule[], shift: ShiftCode): boolean {
  if (!isBoardingSchedule(days)) return false;
  if (BOARDING_SHIFTS.has(shift)) return true;
  return shift === "休";
}

/** @deprecated use isBoardingDayLayout */
export function isBoardingShift(shift: ShiftCode): boolean {
  if (BOARDING_SHIFTS.has(shift)) return true;
  return shift === "休" || REST_RAW.has(shift);
}

export function formatShiftDisplay(shift: ShiftCode): string {
  if (shift === "休") return "休";
  return SHIFT_TIME_LABELS[shift] ?? shift;
}

export function isRestShift(shift: ShiftCode): boolean {
  return shift === "休" || REST_RAW.has(shift);
}

export function shiftClass(shift: ShiftCode): string {
  if (shift === "C") return "shift-C";
  if (shift === "A") return "shift-A";
  if (shift === "당") return "shift-dang";
  if (shift === "休") return "shift-rest";
  if (shift === "B7") return "shift-b7";
  if (shift === "A5") return "shift-a5";
  if (shift === "P") return "shift-p";
  if (shift === "D") return "shift-d";
  if (shift === "P6") return "shift-p6";
  return "shift-other";
}

export function skdPillClass(shift: string): string {
  if (shift === "C") return "skd-pill-c";
  if (shift === "A") return "skd-pill-a";
  if (shift === "당") return "skd-pill-dang";
  if (shift === "休") return "skd-pill-rest";
  if (shift === "B7") return "skd-pill-b7";
  if (shift === "A5") return "skd-pill-a5";
  if (shift === "P") return "skd-pill-p";
  if (shift === "D") return "skd-pill-d";
  if (shift === "P6") return "skd-pill-p6";
  return "skd-pill-other";
}

/** 탑승수속 SKD — 셀 하단 표기: B7(11~20) */
export function skdPillBoardingLabel(day: DaySchedule): string {
  const leader = day.isLeader ? "👍" : "";
  return `${leader}${formatShiftDisplay(day.myShift)}`.slice(0, 24);
}

/** Main pill: 👍A/이영식 (탑승수속이면 사용 안 함) */
export function skdPillLabel(day: DaySchedule): string {
  const leader = day.isLeader ? "👍" : "";
  const display = formatShiftDisplay(day.myShift);
  let label = `${leader}${display}`;
  if (!isRestShift(day.myShift) && day.sameShiftCoworkers.length > 0) {
    label += `/${day.sameShiftCoworkers.join("/")}`;
  }
  return label;
}

/** 하단 pill (당/C/A 공통): 검정 배경 — 당 홍길동/김철수, C 정찬호/임성우 */
export function skdPillBottomLabel(day: DaySchedule): string | null {
  const rc = day.relatedCoworkers;
  if (!rc || rc.names.length === 0) return null;
  const names = rc.names.join("/");
  const prefix = rc.label || rc.type;
  return `${prefix} ${names}`;
}

/** 리더 날짜 입력 파싱 — 예: "1,3,5" */
export function parseLeaderDateInput(input: string): number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const part of input.split(/[,，、/\s]+/)) {
    const t = part.trim();
    if (!t) continue;
    const d = Number(t);
    if (!Number.isFinite(d) || d < 1 || d > 31 || seen.has(d)) continue;
    seen.add(d);
    result.push(d);
  }
  return result.sort((a, b) => a - b);
}

/** @deprecated use skdPillBottomLabel */
export function skdPillDangLabel(day: DaySchedule): string | null {
  const rc = day.relatedCoworkers;
  if (!rc || rc.type !== "당" || rc.names.length === 0) return null;
  return skdPillBottomLabel(day);
}

/** @deprecated use skdPillLabel + skdPillDangLabel */
export function skdPillMainLabel(day: DaySchedule): string {
  return skdPillLabel(day);
}

/** @deprecated use skdPillBottomLabel */
export function skdPillNamesLine(day: DaySchedule): string | null {
  return skdPillBottomLabel(day);
}

export function isShiftToken(token: string): boolean {
  if (!token) return false;
  const t = token.trim();
  if (REST_RAW.has(t)) return true;
  if (SHIFT_TIME_LABELS[t]) return true;
  if (/^[A-Z]\d?$/.test(t)) return true;
  if (/^P\d$/.test(t)) return true;
  if (t.startsWith("사고")) return true;
  if (["C", "A", "당", "N", "교육", "사고대", "노교", "X", "전", "휴"].includes(t)) return true;
  return false;
}

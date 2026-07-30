import { DaySchedule, ShiftCode } from "@/types/schedule";

export const REST_RAW = new Set(["전", "X", "휴", "休", "주", "연", "오프"]);
export const WORK_SHIFTS = new Set(["C", "A", "당"]);

/** Display label with time range for boarding-team SKD codes */
export const SHIFT_TIME_LABELS: Record<string, string> = {
  B7: "B7(11:00~20:00)",
  A5: "A5(05:40~14:40)",
  P: "P(13~22)",
  D: "D(05~11:30)",
  P6: "P6(13:30~22:30)",
};

export const SHIFT_OPTIONS: ShiftCode[] = [
  "C", "A", "당", "休",
  "B7", "A5", "P", "D", "P6",
  "연", "N", "교육", "노조",
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

/**
 * 함께 캘린더 중간 표기 (박종규 × 김현숙)
 * C+P → 동시出 / C+D → 교대出退 / 休+P → 현숙🚗 / 休+休 → 동시休 / A+A5 → 동시退 / 休+A5 → PICK UP
 */
export function getDualPairLabel(
  opsShift: ShiftCode | null | undefined,
  boardingShift: ShiftCode | null | undefined,
): string | null {
  if (opsShift == null || boardingShift == null) return null;
  const ops = isRestShift(opsShift) ? "休" : String(opsShift);
  const boarding = isRestShift(boardingShift) ? "休" : String(boardingShift);

  if (ops === "C" && boarding === "P") return "동시出";
  if (ops === "C" && boarding === "D") return "교대出退";
  if (ops === "休" && boarding === "P") return "현숙🚗";
  if (ops === "休" && boarding === "休") return "동시休";
  if (ops === "休" && boarding === "A5") return "PICK UP";
  if (ops === "A" && boarding === "A5") return "동시退";
  return null;
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

/** 탑승수속 SKD — 셀 하단 표기: B7(11:00~20:00) */
export function skdPillBoardingLabel(day: DaySchedule): string {
  return skdPillBoardingLines(day).join("");
}

/**
 * 합쳐보기 김현숙: 첫째 줄 TYPE+시작~, 둘째 줄 종료)
 * 예) A5(05:40~ / 14:40)
 */
export function skdPillBoardingLines(day: DaySchedule): string[] {
  const leader = day.isLeader ? "👍" : "";
  const timed = SHIFT_TIME_LABELS[day.myShift];
  if (timed) {
    const tilde = timed.indexOf("~");
    if (tilde >= 0) {
      return [
        `${leader}${timed.slice(0, tilde + 1)}`,
        timed.slice(tilde + 1),
      ];
    }
  }
  return [`${leader}${formatShiftDisplay(day.myShift)}`];
}

/** 좁은 함께 셀용 — TYPE / 짧은 시간 (잘림 방지) 예) B7 · 11~20 */
export function skdPillBoardingLinesDual(day: DaySchedule): string[] {
  const leader = day.isLeader ? "👍" : "";
  const code = String(day.myShift);
  const timed = SHIFT_TIME_LABELS[code];
  if (!timed) return [`${leader}${formatShiftDisplay(code)}`];

  const m = timed.match(/\((\d{1,2})(?::(\d{2}))?~(\d{1,2})(?::(\d{2}))?\)/);
  if (!m) return [`${leader}${code}`];

  const fmt = (h: string, min?: string) => {
    const hh = String(Number(h));
    if (!min || min === "00") return hh;
    return `${hh}:${min}`;
  };
  return [`${leader}${code}`, `${fmt(m[1], m[2])}~${fmt(m[3], m[4])}`];
}

/** 상단 첫째 칸 — TYPE만 (👍C / 당 …) */
export function skdPillTypeLabel(day: DaySchedule): string {
  const leader = day.isLeader ? "👍" : "";
  return `${leader}${formatShiftDisplay(day.myShift)}`;
}

/** 상단 다음 칸들 — 같은 근무 이름 (한 칸에 1명) */
export function skdPillCoworkerLines(day: DaySchedule): string[] {
  if (isRestShift(day.myShift)) return [];
  return [...(day.sameShiftCoworkers ?? [])];
}

/**
 * 상단 표시용 줄
 * - 리더: [TYPE, 이름1, 이름2…] 칸 분리
 * - 비리더: ["C/이영식"] 기존 한 줄
 */
export function skdPillTopLines(day: DaySchedule): string[] {
  if (day.isLeader) {
    return [skdPillTypeLabel(day), ...skdPillCoworkerLines(day)];
  }
  const display = formatShiftDisplay(day.myShift);
  if (isRestShift(day.myShift) || day.sameShiftCoworkers.length === 0) {
    return [display];
  }
  return [`${display}/${day.sameShiftCoworkers.join("/")}`];
}

/**
 * 검정 하단 줄: 첫째 줄 TYPE만, 이후 이름 1명씩 한 줄
 * 예) C / 김지성 / 정찬호
 */
export function skdPillBottomLines(day: DaySchedule): string[] {
  const rc = day.relatedCoworkers;
  if (!rc || rc.names.length === 0) return [];
  const prefix = rc.label || String(rc.type);
  return [prefix, ...rc.names];
}

/** Main pill (단일 문자열, 인쇄 등 호환) */
export function skdPillLabel(day: DaySchedule): string {
  return skdPillTopLines(day).join("\n");
}

/** 하단 pill 단일 문자열 (호환) */
export function skdPillBottomLabel(day: DaySchedule): string | null {
  const lines = skdPillBottomLines(day);
  return lines.length ? lines.join("\n") : null;
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

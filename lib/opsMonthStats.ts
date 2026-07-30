import { DaySchedule, ShiftCode } from "@/types/schedule";

/** 근무 일수에 포함되는 운항 TYPE (노조·노교·노고 표기 혼용 허용) */
const OPS_WORK_TYPES = new Set(["C", "A", "당", "교육", "노조", "노교", "노고"]);

/** 식권 1장 TYPE */
const MEAL_ONE = new Set(["C", "교육", "노조", "노교", "노고", "당"]);

export const COMMUTE_ALLOWANCE_PER_DAY = 12_000;
export const MEAL_TICKET_PRICE = 8_000;

export interface OpsMonthStats {
  /** C/A/당/교육/노조 일수 */
  workDays: number;
  /** 근무일수 − CA 연속 쌍 */
  attendanceDays: number;
  /** C·교육·노조·당=1, A=2 */
  mealTickets: number;
  /** 근무일수 × 12,000원 */
  commuteAllowance: number;
  /** 식권 수 × 8,000원 */
  mealCost: number;
  /** C 다음날 A인 쌍 개수 */
  caPairs: number;
}

function normalizeOpsType(shift: ShiftCode): string {
  return String(shift ?? "").trim();
}

export function isOpsWorkType(shift: ShiftCode): boolean {
  return OPS_WORK_TYPES.has(normalizeOpsType(shift));
}

/**
 * 박종규(운항) 월간 집계
 * - 근무: C, A, 당, 교육, 노조
 * - 출근: 근무일수에서 CA 연속(C 다음날 A)마다 1일 차감
 * - 식권: C/교육/노조/당=1장, A=2장
 * - 출근보조비: 근무일수 × 12,000
 * - 식권비용: 식권 수 × 8,000
 */
export function computeOpsMonthStats(days: DaySchedule[]): OpsMonthStats {
  const shiftByDate = new Map<number, string>();
  for (const d of days) {
    shiftByDate.set(d.date, normalizeOpsType(d.myShift));
  }

  let workDays = 0;
  let mealTickets = 0;
  for (const d of days) {
    const s = normalizeOpsType(d.myShift);
    if (!OPS_WORK_TYPES.has(s)) continue;
    workDays += 1;
    if (s === "A") mealTickets += 2;
    else if (MEAL_ONE.has(s)) mealTickets += 1;
  }

  let caPairs = 0;
  for (const d of days) {
    if (normalizeOpsType(d.myShift) !== "C") continue;
    if (shiftByDate.get(d.date + 1) === "A") caPairs += 1;
  }

  return {
    workDays,
    attendanceDays: Math.max(0, workDays - caPairs),
    mealTickets,
    commuteAllowance: workDays * COMMUTE_ALLOWANCE_PER_DAY,
    mealCost: mealTickets * MEAL_TICKET_PRICE,
    caPairs,
  };
}

export function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

"use client";

import MergedMonthCalendar from "@/components/MergedMonthCalendar";
import { getDualPairLabel } from "@/lib/shiftDisplay";
import { DaySchedule, ShiftCode } from "@/types/schedule";

const OPS_TARGET = "박종규";
const BOARDING_TARGET = "김현숙";
const YEAR = 2026;
const MONTH = 7;

function makeDay(date: number, shift: ShiftCode, dayOfWeek: string): DaySchedule {
  return {
    orderIndex: date,
    date,
    dayOfWeek,
    myShift: shift,
    isLeader: false,
    sameShiftCoworkers: [],
    relatedCoworkers: null,
    allWorkers: [],
  };
}

/** TEST — 함께 캘린더 페어 배지·셀 높이 미리보기 */
const OPS_DAYS: DaySchedule[] = [
  makeDay(1, "休", "수"),
  makeDay(2, "休", "목"),
  {
    ...makeDay(3, "C", "금"),
    sameShiftCoworkers: ["이영식"],
  },
  makeDay(4, "A", "토"),
  makeDay(5, "休", "일"),
  makeDay(6, "休", "월"),
];

const BOARDING_DAYS: DaySchedule[] = [
  makeDay(1, "P6", "수"),
  makeDay(2, "B7", "목"),
  makeDay(3, "P", "금"),
  makeDay(4, "A5", "토"),
  makeDay(5, "A5", "일"),
  makeDay(6, "休", "월"),
];

const PAIR_SAMPLES = OPS_DAYS.map((opsDay, i) => {
  const boardingDay = BOARDING_DAYS[i];
  return {
    date: opsDay.date,
    ops: opsDay.myShift,
    boarding: boardingDay.myShift,
    label: getDualPairLabel(opsDay.myShift, boardingDay.myShift),
  };
});

export default function TestMergedCalendarPage() {
  return (
    <main className="test-merged-page">
      <header className="test-merged-header safe-top">
        <p className="test-merged-badge">TEST</p>
        <h1>함께 캘린더 미리보기</h1>
        <p className="test-merged-desc">
          1일 P6 · 2일 B7 → <strong>현숙🚗</strong> · 일자 칸 높이 20% 축소
        </p>
      </header>

      <section className="test-merged-samples">
        <h2>페어 배지 샘플</h2>
        <ul>
          {PAIR_SAMPLES.map((s) => (
            <li key={s.date}>
              {s.date}일: {OPS_TARGET} {s.ops} + {BOARDING_TARGET} {s.boarding}
              {" → "}
              <span className="test-pair-label">{s.label ?? "(없음)"}</span>
            </li>
          ))}
        </ul>
      </section>

      <MergedMonthCalendar
        year={YEAR}
        month={MONTH}
        opsDays={OPS_DAYS}
        boardingDays={BOARDING_DAYS}
        opsTarget={OPS_TARGET}
        boardingTarget={BOARDING_TARGET}
      />
    </main>
  );
}

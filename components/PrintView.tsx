"use client";

import { forwardRef } from "react";
import { ParsedSchedule, DaySchedule } from "@/types/schedule";
import { groupDaysIntoWeeks, WEEKDAYS } from "@/lib/groupWeeks";
import { isBoardingSchedule } from "@/lib/shiftDisplay";
import { computeOpsMonthStats, formatWon } from "@/lib/opsMonthStats";

interface Props {
  schedule: ParsedSchedule;
  days: DaySchedule[];
}

function shiftColor(shift: string): string {
  if (shift === "C") return "#6d28d9";
  if (shift === "A") return "#1d4ed8";
  if (shift === "당") return "#c2410c";
  if (shift === "休") return "#b91c1c";
  return "#475569";
}

const PrintView = forwardRef<HTMLDivElement, Props>(({ schedule, days }, ref) => {
  const weeks = groupDaysIntoWeeks(days);
  const opsStats = !isBoardingSchedule(days) ? computeOpsMonthStats(days) : null;

  return (
    <div
      ref={ref}
      style={{
        background: "#ffffff",
        color: "#0f172a",
        padding: "24px",
        width: "900px",
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      <h1 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "4px", color: "#0f172a" }}>
        {schedule.targetName}의 근무표
      </h1>
      <p style={{ color: "#64748b", fontSize: "13px", marginBottom: opsStats ? "8px" : "20px" }}>
        {schedule.year}년 {schedule.month}월 | 총 {days.length}일 | 일요일 시작 주간표
      </p>
      {opsStats && (
        <p style={{ color: "#334155", fontSize: "13px", fontWeight: 600, marginBottom: "20px" }}>
          근무 {opsStats.workDays}일 · 출근 {opsStats.attendanceDays}일 · 식권 {opsStats.mealTickets}장 ·
          식권비 {formatWon(opsStats.mealCost)} · 출근보조 {formatWon(opsStats.commuteAllowance)}
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginBottom: "8px" }}>
        {WEEKDAYS.map((dow, i) => (
          <div
            key={dow}
            style={{
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "12px",
              color: i === 0 ? "#dc2626" : i === 6 ? "#2563eb" : "#475569",
              padding: "6px",
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
            }}
          >
            {dow}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginBottom: "8px" }}>
          {week.map((day, di) => {
            if (!day) {
              return (
                <div
                  key={`e-${wi}-${di}`}
                  style={{ minHeight: "72px", background: "#ffffff", borderRadius: "8px" }}
                />
              );
            }
            const isRest = day.myShift === "休";
            const color = shiftColor(day.myShift);
            return (
              <div
                key={day.orderIndex}
                style={{
                  background: isRest ? "#f8fafc" : "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "8px",
                  minHeight: "72px",
                  opacity: isRest ? 0.85 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: "bold", fontSize: "14px", color: "#0f172a" }}>{day.date}</span>
                  <span style={{ color, fontWeight: "bold", fontSize: "13px" }}>
                    {day.isLeader ? "👍" : ""}{day.myShift}
                  </span>
                </div>
                {!isRest && day.sameShiftCoworkers.length > 0 && (
                  <div style={{ fontSize: "9px", color, lineHeight: 1.3 }}>
                    {day.sameShiftCoworkers.join(", ")}
                  </div>
                )}
                {day.relatedCoworkers && day.relatedCoworkers.names.length > 0 && (
                  <div style={{ fontSize: "9px", color: "#64748b", marginTop: "3px" }}>
                    {day.relatedCoworkers.label}: {day.relatedCoworkers.names.join(", ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
});

PrintView.displayName = "PrintView";
export default PrintView;

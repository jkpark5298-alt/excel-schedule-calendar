"use client";

import { forwardRef } from "react";
import { ParsedSchedule, DaySchedule } from "@/types/schedule";
import { groupDaysIntoWeeks, WEEKDAYS } from "@/lib/groupWeeks";

interface Props {
  schedule: ParsedSchedule;
  days: DaySchedule[];
}

function shiftColor(shift: string): string {
  if (shift === "C") return "#7c3aed";
  if (shift === "A") return "#2563eb";
  if (shift === "당") return "#d97706";
  if (shift === "休") return "#dc2626";
  return "#94a3b8";
}

const PrintView = forwardRef<HTMLDivElement, Props>(({ schedule, days }, ref) => {
  const weeks = groupDaysIntoWeeks(days);

  return (
    <div
      ref={ref}
      style={{
        background: "#0f172a",
        color: "#e2e8f0",
        padding: "24px",
        width: "900px",
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      <h1 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "4px" }}>
        {schedule.targetName}의 근무표
      </h1>
      <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "20px" }}>
        {schedule.year}년 {schedule.month}월 | 총 {days.length}일 | 일요일 시작 주간표
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginBottom: "8px" }}>
        {WEEKDAYS.map((dow, i) => (
          <div
            key={dow}
            style={{
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "12px",
              color: i === 0 ? "#f87171" : i === 6 ? "#60a5fa" : "#94a3b8",
              padding: "6px",
              background: "#1e293b",
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
                  style={{ minHeight: "72px", background: "#0f172a", borderRadius: "8px" }}
                />
              );
            }
            const isRest = day.myShift === "休";
            const color = shiftColor(day.myShift);
            return (
              <div
                key={day.orderIndex}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "8px",
                  minHeight: "72px",
                  opacity: isRest ? 0.55 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: "bold", fontSize: "14px" }}>{day.date}</span>
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
                  <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "3px" }}>
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

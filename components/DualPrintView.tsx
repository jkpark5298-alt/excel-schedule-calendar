"use client";

import { forwardRef } from "react";
import { DaySchedule } from "@/types/schedule";
import { buildMergedMonthGrid } from "@/lib/mergeMonthGrid";
import { DOW_KO } from "@/lib/monthGrid";
import {
  formatShiftDisplay,
  getDualPairLabel,
  isRestShift,
  skdPillBoardingLinesDual,
} from "@/lib/shiftDisplay";

interface Props {
  year: number;
  month: number;
  opsTarget: string;
  boardingTarget: string;
  opsDays: DaySchedule[];
  boardingDays: DaySchedule[];
}

function opsShiftColor(shift: string): string {
  if (shift === "C") return "#7c3aed";
  if (shift === "A") return "#2563eb";
  if (shift === "당") return "#d97706";
  if (isRestShift(shift)) return "#dc2626";
  return "#94a3b8";
}

function boardingShiftColor(shift: string): string {
  if (shift === "B7" || shift === "P" || shift === "P6") return "#0d9488";
  if (shift === "A5" || shift === "D") return "#2563eb";
  if (isRestShift(shift)) return "#dc2626";
  return "#64748b";
}

const DualPrintView = forwardRef<HTMLDivElement, Props>(function DualPrintView(
  { year, month, opsTarget, boardingTarget, opsDays, boardingDays },
  ref,
) {
  const { weeks } = buildMergedMonthGrid(year, month, opsDays, boardingDays);
  const dayCount = new Set([
    ...opsDays.map((d) => d.date),
    ...boardingDays.map((d) => d.date),
  ]).size;

  return (
    <div
      ref={ref}
      style={{
        background: "#0f172a",
        color: "#e2e8f0",
        padding: "24px",
        width: "960px",
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      <h1 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "4px" }}>
        함께 근무표 · {opsTarget} + {boardingTarget}
      </h1>
      <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "16px" }}>
        {year}년 {month}월 | 일정 있는 날 {dayCount}일 | 일요일 시작
      </p>

      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "16px",
          fontSize: "12px",
          color: "#cbd5e1",
        }}
      >
        <span>
          <span style={{ color: "#a78bfa", fontWeight: 700 }}>● </span>
          {opsTarget} (운항)
        </span>
        <span>
          <span style={{ color: "#2dd4bf", fontWeight: 700 }}>● </span>
          {boardingTarget} (탑승)
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "6px",
          marginBottom: "8px",
        }}
      >
        {DOW_KO.map((dow, i) => (
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
        <div
          key={wi}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "6px",
            marginBottom: "8px",
          }}
        >
          {week.map((cell) => {
            if (!cell.inMonth) {
              return (
                <div
                  key={cell.key}
                  style={{ minHeight: "96px", background: "#0f172a", borderRadius: "8px" }}
                />
              );
            }

            const pairLabel = getDualPairLabel(cell.opsDay?.myShift, cell.boardingDay?.myShift);
            const opsColor = cell.opsDay ? opsShiftColor(cell.opsDay.myShift) : "#64748b";
            const boardingColor = cell.boardingDay
              ? boardingShiftColor(cell.boardingDay.myShift)
              : "#64748b";
            const boardingLines = cell.boardingDay
              ? skdPillBoardingLinesDual(cell.boardingDay)
              : [];

            return (
              <div
                key={cell.key}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "8px",
                  minHeight: "96px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ fontWeight: "bold", fontSize: "14px" }}>{cell.date}</div>

                <div style={{ fontSize: "10px", color: opsColor, lineHeight: 1.35 }}>
                  <span style={{ opacity: 0.75 }}>{opsTarget.slice(0, 1)} </span>
                  {cell.opsDay ? (
                    <>
                      {cell.opsDay.isLeader ? "👍" : ""}
                      {formatShiftDisplay(cell.opsDay.myShift)}
                      {!isRestShift(cell.opsDay.myShift) &&
                        cell.opsDay.sameShiftCoworkers.length > 0 && (
                          <span style={{ display: "block", opacity: 0.9 }}>
                            {cell.opsDay.sameShiftCoworkers.join(", ")}
                          </span>
                        )}
                    </>
                  ) : (
                    <span style={{ opacity: 0.45 }}>—</span>
                  )}
                </div>

                {pairLabel && (
                  <div
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      color: "#fbbf24",
                      textAlign: "center",
                      background: "#422006",
                      borderRadius: "4px",
                      padding: "2px 4px",
                    }}
                  >
                    {pairLabel}
                  </div>
                )}

                <div style={{ fontSize: "10px", color: boardingColor, lineHeight: 1.35 }}>
                  <span style={{ opacity: 0.75 }}>{boardingTarget.slice(0, 1)} </span>
                  {cell.boardingDay ? (
                    boardingLines.map((line) => (
                      <span key={line} style={{ display: "block" }}>
                        {line}
                      </span>
                    ))
                  ) : (
                    <span style={{ opacity: 0.45 }}>—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
});

DualPrintView.displayName = "DualPrintView";
export default DualPrintView;

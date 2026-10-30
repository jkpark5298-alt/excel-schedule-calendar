"use client";

import { forwardRef } from "react";
import { DaySchedule } from "@/types/schedule";
import { buildMergedMonthGrid } from "@/lib/mergeMonthGrid";
import { DOW_KO } from "@/lib/monthGrid";
import {
  formatShiftDisplay,
  resolvePairLabel,
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
  if (shift === "C") return "#6d28d9";
  if (shift === "A") return "#1d4ed8";
  if (shift === "당") return "#c2410c";
  if (isRestShift(shift)) return "#b91c1c";
  return "#475569";
}

function boardingShiftColor(shift: string): string {
  if (shift === "B7" || shift === "P" || shift === "P6") return "#0f766e";
  if (shift === "A5" || shift === "D") return "#1d4ed8";
  if (isRestShift(shift)) return "#b91c1c";
  return "#475569";
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
        background: "#ffffff",
        color: "#0f172a",
        padding: "24px",
        width: "960px",
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      <h1 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "4px", color: "#0f172a" }}>
        함께 근무표 · {opsTarget} + {boardingTarget}
      </h1>
      <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "16px" }}>
        {year}년 {month}월 | 일정 있는 날 {dayCount}일 | 일요일 시작
      </p>

      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "16px",
          fontSize: "12px",
          color: "#334155",
        }}
      >
        <span>
          <span style={{ color: "#6d28d9", fontWeight: 700 }}>● </span>
          {opsTarget} (운항)
        </span>
        <span>
          <span style={{ color: "#0f766e", fontWeight: 700 }}>● </span>
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
                  style={{ minHeight: "96px", background: "#ffffff", borderRadius: "8px" }}
                />
              );
            }

            const pairLabel = resolvePairLabel(cell.opsDay, cell.boardingDay);
            const opsColor = cell.opsDay ? opsShiftColor(cell.opsDay.myShift) : "#94a3b8";
            const boardingColor = cell.boardingDay
              ? boardingShiftColor(cell.boardingDay.myShift)
              : "#94a3b8";
            const boardingLines = cell.boardingDay
              ? skdPillBoardingLinesDual(cell.boardingDay)
              : [];

            return (
              <div
                key={cell.key}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "8px",
                  minHeight: "96px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ fontWeight: "bold", fontSize: "14px", color: "#0f172a" }}>{cell.date}</div>

                <div style={{ fontSize: "10px", color: opsColor, lineHeight: 1.35 }}>
                  <span style={{ color: "#64748b" }}>{opsTarget.slice(0, 1)} </span>
                  {cell.opsDay ? (
                    <>
                      {cell.opsDay.isLeader ? "👍" : ""}
                      {formatShiftDisplay(cell.opsDay.myShift)}
                      {!isRestShift(cell.opsDay.myShift) &&
                        cell.opsDay.sameShiftCoworkers.length > 0 &&
                        `/${cell.opsDay.sameShiftCoworkers[0]}`}
                    </>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>—</span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    color: pairLabel ? "#92400e" : "transparent",
                    textAlign: "center",
                    background: pairLabel ? "#fef3c7" : "transparent",
                    border: pairLabel ? "1px solid #fcd34d" : "1px solid transparent",
                    borderRadius: "4px",
                    padding: "2px 4px",
                    minHeight: "18px",
                  }}
                >
                  {pairLabel ?? "\u00a0"}
                </div>

                <div style={{ fontSize: "10px", color: boardingColor, lineHeight: 1.35 }}>
                  <span style={{ color: "#64748b" }}>{boardingTarget.slice(0, 1)} </span>
                  {cell.boardingDay ? (
                    boardingLines.map((line) => (
                      <span key={line} style={{ display: "block" }}>
                        {line}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: "#94a3b8" }}>—</span>
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

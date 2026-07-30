"use client";

import { forwardRef, useMemo } from "react";
import { ParsedSchedule, DaySchedule } from "@/types/schedule";
import { DOW_KO, buildMonthGrid } from "@/lib/monthGrid";
import {
  isBoardingSchedule,
  isBoardingDayLayout,
  skdPillBoardingLines,
  skdPillBottomLines,
  skdPillClass,
  skdPillTopLines,
} from "@/lib/shiftDisplay";
import { WALLPAPER_HEIGHT, WALLPAPER_WIDTH } from "@/lib/exportWallpaper";
import { computeOpsMonthStats, formatWon } from "@/lib/opsMonthStats";

interface Props {
  schedule: ParsedSchedule;
  days: DaySchedule[];
}

const PILL_COLORS: Record<string, { bg: string; fg: string }> = {
  "skd-pill-c": { bg: "#f3e8ff", fg: "#7c3aed" },
  "skd-pill-a": { bg: "#dbeafe", fg: "#2563eb" },
  "skd-pill-dang": { bg: "#ffedd5", fg: "#c2410c" },
  "skd-pill-rest": { bg: "#fee2e2", fg: "#dc2626" },
  "skd-pill-b7": { bg: "#dcfce7", fg: "#16a34a" },
  "skd-pill-a5": { bg: "#cffafe", fg: "#0891b2" },
  "skd-pill-p": { bg: "#ede9fe", fg: "#7c3aed" },
  "skd-pill-d": { bg: "#ffedd5", fg: "#ea580c" },
  "skd-pill-p6": { bg: "#fce7f3", fg: "#db2777" },
  "skd-pill-other": { bg: "#f1f5f9", fg: "#64748b" },
};

const FONT = '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
const HEADER_H = 50;
const STATS_H = 28;
const DOW_H = 28;
const PAD = 10;
const DATE_H = 32;
const PILL_GAP = 6;
const BODY_PAD_BOTTOM = 6;

function pillStyle(shift: string): { background: string; color: string } {
  const key = skdPillClass(shift);
  const c = PILL_COLORS[key] ?? PILL_COLORS["skd-pill-other"];
  return { background: c.bg, color: c.fg };
}

function topText(day: DaySchedule): string {
  const leader = day.isLeader ? "[L] " : "";
  if (day.isLeader) {
    const type = String(day.myShift);
    const names = (day.sameShiftCoworkers ?? []).slice(0, 2).join(" ");
    return names ? `${leader}${type} ${names}` : `${leader}${type}`;
  }
  return (skdPillTopLines(day)[0] ?? String(day.myShift)).replace(/👍/g, "[L] ");
}

function bottomText(day: DaySchedule): string | null {
  const lines = skdPillBottomLines(day);
  if (lines.length === 0) return null;
  return lines.join(" ").replace(/👍/g, "").trim();
}

function boardingText(day: DaySchedule): string {
  return skdPillBoardingLines(day).join(" ").replace(/👍/g, "[L] ");
}

function fontForHeight(h: number): number {
  // 조금 작게 — 긴 동료 이름이 잘리지 않도록
  return Math.max(11, Math.min(15, Math.floor(h * 0.32)));
}

/** 단일 div — paddingTop으로 글자 세로 맞춤 (html2canvas 안정) */
function Pill({
  text,
  bg,
  fg,
  h,
  size,
}: {
  text: string;
  bg: string;
  fg: string;
  h: number;
  size: number;
}) {
  const padTop = Math.max(0, Math.floor((h - size) / 2) - 1);
  return (
    <div
      style={{
        height: h,
        width: "100%",
        boxSizing: "border-box",
        background: bg,
        color: fg,
        fontSize: size,
        fontWeight: 700,
        fontFamily: FONT,
        lineHeight: `${size}px`,
        paddingTop: padTop,
        paddingLeft: 8,
        paddingRight: 8,
        paddingBottom: 0,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        borderRadius: 5,
      }}
    >
      {text}
    </div>
  );
}

const WallpaperView = forwardRef<HTMLDivElement, Props>(function WallpaperView(
  { schedule, days },
  ref,
) {
  const now = new Date();
  const today = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  const boardingMonth = isBoardingSchedule(days);
  const opsStats = useMemo(
    () => (!boardingMonth ? computeOpsMonthStats(days) : null),
    [boardingMonth, days],
  );
  const { weeks } = useMemo(
    () => buildMonthGrid(schedule.year, schedule.month, days, today),
    [schedule.year, schedule.month, days, today.year, today.month, today.day],
  );

  const statsBand = opsStats ? STATS_H : 0;
  const innerH = WALLPAPER_HEIGHT - PAD * 2;
  const rowH = Math.floor((innerH - HEADER_H - statsBand - DOW_H) / Math.max(weeks.length, 1));
  const bodyAvail = rowH - DATE_H - BODY_PAD_BOTTOM;

  return (
    <div
      ref={ref}
      style={{
        width: WALLPAPER_WIDTH,
        height: WALLPAPER_HEIGHT,
        boxSizing: "border-box",
        padding: PAD,
        background: "#1c1c1e",
        fontFamily: FONT,
      }}
    >
      <table
        style={{
          width: WALLPAPER_WIDTH - PAD * 2,
          height: innerH,
          borderCollapse: "collapse",
          background: "#fff",
          borderRadius: 12,
          overflow: "hidden",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr style={{ height: HEADER_H }}>
            <th
              colSpan={7}
              style={{
                height: HEADER_H,
                borderBottom: "1px solid #e5e5ea",
                padding: "0 18px",
                textAlign: "left",
                fontWeight: 400,
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ fontSize: 22, fontWeight: 700, color: "#ff3b30", width: "25%" }}>
                      {schedule.month}월
                    </td>
                    <td style={{ fontSize: 14, fontWeight: 600, color: "#8e8e93", textAlign: "center" }}>
                      {schedule.targetName}
                    </td>
                    <td
                      style={{
                        fontSize: 26,
                        fontWeight: 300,
                        color: "#000",
                        textAlign: "right",
                        width: "25%",
                      }}
                    >
                      {schedule.year}
                    </td>
                  </tr>
                </tbody>
              </table>
            </th>
          </tr>
          {opsStats && (
            <tr style={{ height: STATS_H }}>
              <th
                colSpan={7}
                style={{
                  height: STATS_H,
                  borderBottom: "1px solid #e5e5ea",
                  padding: "0 18px",
                  textAlign: "left",
                  fontWeight: 600,
                  fontSize: 13,
                  color: "#3a3a3c",
                  fontFamily: FONT,
                }}
              >
                근무 {opsStats.workDays}일 · 출근 {opsStats.attendanceDays}일 · 식권{" "}
                {opsStats.mealTickets}장 · 식권비 {formatWon(opsStats.mealCost)} · 출근보조{" "}
                {formatWon(opsStats.commuteAllowance)}
              </th>
            </tr>
          )}
          <tr style={{ height: DOW_H, background: "#fafafa" }}>
            {DOW_KO.map((dow, i) => (
              <th
                key={dow}
                style={{
                  height: DOW_H,
                  fontSize: 13,
                  fontWeight: 700,
                  color: i === 0 ? "#ff3b30" : i === 6 ? "#007aff" : "#8e8e93",
                  borderBottom: "1px solid #e5e5ea",
                  borderRight: i < 6 ? "1px solid #e5e5ea" : "none",
                  textAlign: "center",
                }}
              >
                {dow}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi} style={{ height: rowH }}>
              {week.map((cell, di) => {
                const day = cell.schedule;
                const boarding = day ? isBoardingDayLayout(days, day.myShift) : boardingMonth;
                const colors = day ? pillStyle(day.myShift) : null;
                const bottom = day && !boarding ? bottomText(day) : null;
                const bg = !cell.inMonth
                  ? "#fafafa"
                  : cell.isToday
                    ? "#fffbf0"
                    : "#ffffff";

                const n = day && colors ? (boarding || !bottom ? 1 : 2) : 0;
                const pillH =
                  n > 0 ? Math.floor((bodyAvail - PILL_GAP * (n - 1)) / n) : 0;
                const fontSize = n > 0 ? fontForHeight(pillH) : 12;

                return (
                  <td
                    key={cell.key}
                    style={{
                      height: rowH,
                      background: bg,
                      borderRight: di < 6 ? "1px solid #e5e5ea" : "none",
                      borderBottom: wi < weeks.length - 1 ? "1px solid #e5e5ea" : "none",
                      outline: cell.isToday ? "2px solid #ff3b30" : "none",
                      outlineOffset: -2,
                      padding: 0,
                      verticalAlign: "top",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        height: DATE_H,
                        lineHeight: `${DATE_H}px`,
                        padding: "0 8px",
                        fontSize: cell.isToday && cell.inMonth ? 15 : 18,
                        fontWeight: cell.isToday && cell.inMonth ? 800 : 700,
                        color:
                          cell.isToday && cell.inMonth
                            ? "#ff3b30"
                            : cell.inMonth
                              ? "#111"
                              : "#c7c7cc",
                        fontFamily: FONT,
                        textAlign: "left",
                      }}
                    >
                      {cell.isToday && cell.inMonth ? `TODAY ${cell.date}` : cell.date}
                    </div>

                    {cell.inMonth && day && colors && n > 0 ? (
                      <div
                        style={{
                          height: rowH,
                          boxSizing: "border-box",
                          paddingTop: DATE_H,
                          paddingLeft: 8,
                          paddingRight: 8,
                          paddingBottom: BODY_PAD_BOTTOM,
                        }}
                      >
                        {!boarding ? (
                          <>
                            <div style={{ height: pillH, marginBottom: bottom ? PILL_GAP : 0 }}>
                              <Pill
                                text={topText(day)}
                                bg={colors.background}
                                fg={colors.color}
                                h={pillH}
                                size={fontSize}
                              />
                            </div>
                            {bottom && (
                              <div style={{ height: pillH }}>
                                <Pill
                                  text={bottom}
                                  bg="#000"
                                  fg="#fff"
                                  h={pillH}
                                  size={fontSize}
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ height: pillH }}>
                            <Pill
                              text={boardingText(day)}
                              bg={colors.background}
                              fg={colors.color}
                              h={pillH}
                              size={fontSize}
                            />
                          </div>
                        )}
                      </div>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

WallpaperView.displayName = "WallpaperView";
export default WallpaperView;

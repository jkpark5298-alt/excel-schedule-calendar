"use client";

import { forwardRef, useMemo } from "react";
import { DaySchedule } from "@/types/schedule";
import { buildMergedMonthGrid } from "@/lib/mergeMonthGrid";
import { DOW_KO } from "@/lib/monthGrid";
import {
  formatShiftDisplay,
  getDualPairLabel,
  isRestShift,
  skdPillBoardingLinesDual,
  skdPillClass,
  skdPillTopLines,
} from "@/lib/shiftDisplay";
import { WALLPAPER_HEIGHT, WALLPAPER_WIDTH } from "@/lib/exportWallpaper";

interface Props {
  year: number;
  month: number;
  opsTarget: string;
  boardingTarget: string;
  opsDays: DaySchedule[];
  boardingDays: DaySchedule[];
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
const HEADER_H = 44;
const DOW_H = 24;
const PAD = 8;
const DATE_H = 30;
const PILL_GAP = 5;
const BODY_PAD_BOTTOM = 8;
/** 셀을 꽉 채우지 않고 박스를 조금 줄임 */
const BODY_SHRINK = 18;

function pillStyle(shift: string): { background: string; color: string } {
  const key = skdPillClass(shift);
  const c = PILL_COLORS[key] ?? PILL_COLORS["skd-pill-other"];
  return { background: c.bg, color: c.fg };
}

function opsText(day: DaySchedule): string {
  if (isRestShift(day.myShift)) {
    return `${day.isLeader ? "[L] " : ""}${formatShiftDisplay(day.myShift)}`;
  }
  return (skdPillTopLines(day)[0] ?? formatShiftDisplay(day.myShift)).replace(/👍/g, "[L] ");
}

function boardingText(day: DaySchedule): string {
  return skdPillBoardingLinesDual(day).join(" ").replace(/👍/g, "[L] ");
}

function fontForHeight(h: number): number {
  return Math.max(11, Math.min(15, Math.floor(h * 0.42)));
}

/** 단일 div — paddingTop으로 글자 세로 맞춤 */
function Pill({
  text,
  bg,
  fg,
  h,
  size,
  center = false,
}: {
  text: string;
  bg: string;
  fg: string;
  h: number;
  size: number;
  center?: boolean;
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
        paddingLeft: 6,
        paddingRight: 6,
        paddingBottom: 0,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        borderRadius: 4,
        textAlign: center ? "center" : "left",
      }}
    >
      {text}
    </div>
  );
}

const DualWallpaperView = forwardRef<HTMLDivElement, Props>(function DualWallpaperView(
  { year, month, opsTarget, boardingTarget, opsDays, boardingDays },
  ref,
) {
  const now = new Date();
  const today = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  const { weeks } = useMemo(
    () => buildMergedMonthGrid(year, month, opsDays, boardingDays, today),
    [year, month, opsDays, boardingDays, today.year, today.month, today.day],
  );

  const innerH = WALLPAPER_HEIGHT - PAD * 2;
  const rowH = Math.floor((innerH - HEADER_H - DOW_H) / Math.max(weeks.length, 1));
  const bodyAvail = Math.max(40, rowH - DATE_H - BODY_PAD_BOTTOM - BODY_SHRINK);

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
                padding: "0 16px",
                textAlign: "left",
                fontWeight: 400,
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ fontSize: 20, fontWeight: 700, color: "#ff3b30", width: "22%" }}>
                      {month}월
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                      <span style={{ color: "#7c3aed" }}>{opsTarget}</span>
                      {" + "}
                      <span style={{ color: "#0891b2" }}>{boardingTarget}</span>
                    </td>
                    <td
                      style={{
                        fontSize: 24,
                        fontWeight: 300,
                        color: "#000",
                        textAlign: "right",
                        width: "22%",
                      }}
                    >
                      {year}
                    </td>
                  </tr>
                </tbody>
              </table>
            </th>
          </tr>
          <tr style={{ height: DOW_H, background: "#fafafa" }}>
            {DOW_KO.map((dow, i) => (
              <th
                key={dow}
                style={{
                  height: DOW_H,
                  fontSize: 12,
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
                const pairLabel = cell.inMonth
                  ? getDualPairLabel(cell.opsDay?.myShift, cell.boardingDay?.myShift)
                  : null;
                const opsColors = cell.opsDay ? pillStyle(cell.opsDay.myShift) : null;
                const boardingColors = cell.boardingDay
                  ? pillStyle(cell.boardingDay.myShift)
                  : null;
                const bg = !cell.inMonth
                  ? "#fafafa"
                  : cell.isToday
                    ? "#fffbf0"
                    : "#ffffff";

                const hasPairSlot = cell.inMonth;
                const n = cell.inMonth ? 3 : 0;
                const pillH =
                  n > 0 ? Math.floor((bodyAvail - PILL_GAP * (n - 1)) / n) : 0;
                const pairH = hasPairSlot ? Math.max(18, Math.floor(pillH * 0.9)) : 0;
                // 3칸일 때 pair를 조금 낮추면 남는 높이를 ops/boarding에 분배
                const mainH =
                  hasPairSlot && n === 3
                    ? Math.floor((bodyAvail - pairH - PILL_GAP * 2) / 2)
                    : pillH;
                const fontSize = n > 0 ? fontForHeight(mainH) : 12;
                const pairFont = hasPairSlot ? Math.max(11, Math.min(16, Math.floor(pairH * 0.48))) : 11;

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
                        fontSize: cell.isToday && cell.inMonth ? 14 : 17,
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

                    {cell.inMonth && n > 0 ? (
                      <div
                        style={{
                          height: rowH,
                          boxSizing: "border-box",
                          paddingTop: DATE_H + Math.floor(BODY_SHRINK / 2),
                          paddingLeft: 6,
                          paddingRight: 6,
                          paddingBottom: BODY_PAD_BOTTOM + Math.ceil(BODY_SHRINK / 2),
                        }}
                      >
                        <div style={{ height: mainH, marginBottom: PILL_GAP }}>
                          {cell.opsDay && opsColors ? (
                            <Pill
                              text={opsText(cell.opsDay)}
                              bg={opsColors.background}
                              fg={opsColors.color}
                              h={mainH}
                              size={fontSize}
                            />
                          ) : (
                            <div
                              style={{
                                height: mainH,
                                lineHeight: `${mainH}px`,
                                fontSize: fontSize,
                                color: "#c7c7cc",
                                fontFamily: FONT,
                              }}
                            >
                              {opsTarget.slice(0, 1)} —
                            </div>
                          )}
                        </div>
                        <div style={{ height: pairH, marginBottom: PILL_GAP }}>
                          {pairLabel ? (
                            <Pill
                              text={pairLabel}
                              bg="#fef3c7"
                              fg="#92400e"
                              h={pairH}
                              size={pairFont}
                              center
                            />
                          ) : null}
                        </div>
                        <div style={{ height: mainH }}>
                          {cell.boardingDay && boardingColors ? (
                            <Pill
                              text={boardingText(cell.boardingDay)}
                              bg={boardingColors.background}
                              fg={boardingColors.color}
                              h={mainH}
                              size={fontSize}
                            />
                          ) : (
                            <div
                              style={{
                                height: mainH,
                                lineHeight: `${mainH}px`,
                                fontSize: fontSize,
                                color: "#c7c7cc",
                                fontFamily: FONT,
                              }}
                            >
                              {boardingTarget.slice(0, 1)} —
                            </div>
                          )}
                        </div>
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

DualWallpaperView.displayName = "DualWallpaperView";
export default DualWallpaperView;

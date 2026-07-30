"use client";

import { useMemo } from "react";
import { DaySchedule } from "@/types/schedule";
import { buildMergedMonthGrid } from "@/lib/mergeMonthGrid";
import {
  DOW_KO,
  skdPillClass,
} from "@/lib/monthGrid";
import { skdPillBoardingLinesDual, skdPillOpsLinesDual, getDualPairLabel } from "@/lib/shiftDisplay";
import { usePinchZoom } from "@/lib/usePinchZoom";

interface Props {
  year: number;
  month: number;
  opsDays: DaySchedule[];
  boardingDays: DaySchedule[];
  opsTarget: string;
  boardingTarget: string;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  selectedDate?: number | null;
  onSelectCell?: (cell: {
    date: number;
    dayOfWeek: string;
    inMonth: boolean;
    opsDay: DaySchedule | null;
    boardingDay: DaySchedule | null;
  }) => void;
}

/** 합쳐보기 — 김현숙 TYPE + 짧은 시간 */
function BoardingPill({ day }: { day: DaySchedule }) {
  const lines = skdPillBoardingLinesDual(day);
  return (
    <div className={`ios-skd-pill ios-skd-pill-boarding ios-skd-pill-boarding-dual ${skdPillClass(day.myShift)}`}>
      {lines.map((line, i) => (
        <span key={`${i}-${line}`} className="ios-skd-boarding-line">
          {line}
        </span>
      ))}
    </div>
  );
}

/** 합쳐보기 운항 — 김현숙과 동일 2줄 형식 (TYPE / 동료) */
function OpsPillDual({ day }: { day: DaySchedule }) {
  const lines = skdPillOpsLinesDual(day);
  return (
    <div
      className={`ios-skd-pill ios-skd-pill-boarding ios-skd-pill-boarding-dual ios-skd-pill-ops-dual ${day.isLeader ? "ios-skd-pill-leader" : ""} ${skdPillClass(day.myShift)}`}
    >
      {lines.map((line, i) => (
        <span key={`${i}-${line}`} className="ios-skd-boarding-line">
          {line}
        </span>
      ))}
    </div>
  );
}

function DualPairBadge({ label }: { label: string }) {
  return (
    <div className="merged-pair-badge" title={label}>
      <span className="merged-pair-badge-text">{label}</span>
    </div>
  );
}

export default function MergedMonthCalendar({
  year,
  month,
  opsDays,
  boardingDays,
  opsTarget,
  boardingTarget,
  zoom = 1,
  onZoomChange,
  selectedDate = null,
  onSelectCell,
}: Props) {
  const now = new Date();
  const today = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  const { pinchRef, isPinching } = usePinchZoom(zoom, onZoomChange ?? (() => {}));

  const { weeks } = useMemo(
    () => buildMergedMonthGrid(year, month, opsDays, boardingDays, today),
    [year, month, opsDays, boardingDays, today.year, today.month, today.day],
  );

  return (
    <div
      ref={onZoomChange ? pinchRef : undefined}
      className={`ios-month-zoom-wrap${isPinching ? " is-pinching" : ""}`}
      style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}
    >
      <div className="ios-month-wrap merged-month-wrap">
        <div className="ios-month-titlebar">
          <span className="ios-month-title-left">{month}월</span>
          <span className="ios-month-title-right">{year}</span>
        </div>

        <div className="merged-month-legend">
          <span className="merged-legend-ops">{opsTarget}</span>
          <span className="merged-legend-sep">·</span>
          <span className="merged-legend-boarding">{boardingTarget}</span>
        </div>

        <div className="ios-month-grid">
          <div className="ios-week-row ios-dow-header-row">
            {DOW_KO.map((dow, i) => (
              <div key={dow} className={`ios-dow ${i === 0 ? "sun" : i === 6 ? "sat" : ""}`}>
                {dow}
              </div>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div key={wi} className="ios-week-row">
              {week.map((cell) => {
                const hasSkd = !!(cell.opsDay || cell.boardingDay);
                const sel = selectedDate === cell.date && cell.inMonth;
                const clickable = cell.inMonth && hasSkd && !!onSelectCell;
                const pairLabel = cell.inMonth
                  ? getDualPairLabel(cell.opsDay?.myShift, cell.boardingDay?.myShift)
                  : null;
                const bothSchedules = !!(cell.opsDay && cell.boardingDay);
                const layoutClass = pairLabel
                  ? "has-pair"
                  : bothSchedules
                    ? "half-split"
                    : "single-side";

                return (
                  <button
                    key={cell.key}
                    type="button"
                    className={[
                      "ios-day-cell merged-day-cell",
                      !cell.inMonth ? "out-month" : "",
                      cell.isToday ? "today" : "",
                      sel ? "selected" : "",
                      hasSkd ? "has-skd" : "",
                      cell.inMonth && !hasSkd ? "empty-day" : "",
                    ].filter(Boolean).join(" ")}
                    disabled={!clickable}
                    onClick={() => onSelectCell?.({
                      date: cell.date,
                      dayOfWeek: cell.dayOfWeek,
                      inMonth: cell.inMonth,
                      opsDay: cell.opsDay,
                      boardingDay: cell.boardingDay,
                    })}
                  >
                    <span className={`ios-day-num ${cell.isToday ? "today-num" : ""}`}>
                      {cell.date}
                    </span>

                    <div className={`ios-day-events merged-day-events ${layoutClass}`}>
                      <div className="merged-ops-block">
                        {cell.opsDay ? (
                          <OpsPillDual day={cell.opsDay} />
                        ) : cell.inMonth ? (
                          <span className="merged-empty-tag">{opsTarget.slice(0, 1)} —</span>
                        ) : null}
                      </div>

                      {pairLabel ? <DualPairBadge label={pairLabel} /> : null}

                      <div className="merged-boarding-block">
                        {cell.boardingDay ? (
                          <BoardingPill day={cell.boardingDay} />
                        ) : cell.inMonth ? (
                          <span className="merged-empty-tag merged-empty-tag-boarding">
                            {boardingTarget.slice(0, 1)} —
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

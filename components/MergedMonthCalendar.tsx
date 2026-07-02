"use client";

import { useMemo } from "react";
import { DaySchedule } from "@/types/schedule";
import { buildMergedMonthGrid } from "@/lib/mergeMonthGrid";
import {
  DOW_KO,
  skdPillClass,
  skdPillLabel,
  skdPillBottomLabel,
  skdPillBoardingLabel,
} from "@/lib/monthGrid";

interface Props {
  year: number;
  month: number;
  opsDays: DaySchedule[];
  boardingDays: DaySchedule[];
  opsTarget: string;
  boardingTarget: string;
  zoom?: number;
  selectedDate?: number | null;
  onSelectCell?: (cell: {
    date: number;
    dayOfWeek: string;
    inMonth: boolean;
    opsDay: DaySchedule | null;
    boardingDay: DaySchedule | null;
  }) => void;
}

function OpsPills({ day }: { day: DaySchedule }) {
  const bottomLabel = skdPillBottomLabel(day);
  return (
    <>
      <div className="ios-day-slot ios-day-slot-top">
        <div className={`ios-skd-pill ${skdPillClass(day.myShift)}`}>
          {skdPillLabel(day)}
        </div>
      </div>
      <div className="ios-day-slot ios-day-slot-bottom">
        {bottomLabel && (
          <div className="ios-skd-pill ios-skd-pill-sub-names">{bottomLabel}</div>
        )}
      </div>
    </>
  );
}

function BoardingPill({ day }: { day: DaySchedule }) {
  return (
    <div className={`ios-skd-pill ios-skd-pill-boarding ${skdPillClass(day.myShift)}`}>
      {skdPillBoardingLabel(day)}
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
  selectedDate = null,
  onSelectCell,
}: Props) {
  const now = new Date();
  const today = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };

  const { weeks } = useMemo(
    () => buildMergedMonthGrid(year, month, opsDays, boardingDays, today),
    [year, month, opsDays, boardingDays, today.year, today.month, today.day],
  );

  return (
    <div className="ios-month-zoom-wrap" style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}>
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

                    <div className="ios-day-events merged-day-events">
                      <div className="merged-ops-block">
                        {cell.opsDay ? (
                          <OpsPills day={cell.opsDay} />
                        ) : cell.inMonth ? (
                          <>
                            <div className="ios-day-slot ios-day-slot-top">
                              <span className="merged-empty-tag">{opsTarget.slice(0, 1)} —</span>
                            </div>
                            <div className="ios-day-slot ios-day-slot-bottom" aria-hidden="true" />
                          </>
                        ) : (
                          <>
                            <div className="ios-day-slot ios-day-slot-top" aria-hidden="true" />
                            <div className="ios-day-slot ios-day-slot-bottom" aria-hidden="true" />
                          </>
                        )}
                      </div>

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

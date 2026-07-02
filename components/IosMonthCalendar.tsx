"use client";

import { useMemo } from "react";
import { DaySchedule } from "@/types/schedule";
import {
  DOW_KO,
  buildMonthGrid,
  skdPillClass,
  skdPillLabel,
  skdPillBottomLabel,
  skdPillBoardingLabel,
  isBoardingDayLayout,
} from "@/lib/monthGrid";

interface Props {
  year: number;
  month: number;
  days: DaySchedule[];
  selected: DaySchedule | null;
  zoom?: number;
  onSelect: (day: DaySchedule | null) => void;
  onEmptyDayClick?: (date: number, dayOfWeek: string) => void;
}

export default function IosMonthCalendar({
  year, month, days, selected, zoom = 1, onSelect, onEmptyDayClick,
}: Props) {
  const now = new Date();
  const today = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };

  const { weeks } = useMemo(
    () => buildMonthGrid(year, month, days, today),
    [year, month, days, today.year, today.month, today.day],
  );

  const isSelected = (cell: { schedule: DaySchedule | null }) =>
    selected && cell.schedule && selected.orderIndex === cell.schedule.orderIndex;

  return (
    <div className="ios-month-zoom-wrap" style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}>
      <div className="ios-month-wrap">
        <div className="ios-month-titlebar">
          <span className="ios-month-title-left">{month}월</span>
          <span className="ios-month-title-right">{year}</span>
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
                const hasSkd = !!cell.schedule;
                const sel = isSelected(cell);
                const schedule = cell.schedule;
                const boarding = schedule ? isBoardingDayLayout(days, schedule.myShift) : false;
                const bottomLabel = schedule && !boarding ? skdPillBottomLabel(schedule) : null;
                const clickable = hasSkd || (cell.inMonth && !!onEmptyDayClick);

                return (
                  <button
                    key={cell.key}
                    type="button"
                    className={[
                      "ios-day-cell",
                      !cell.inMonth ? "out-month" : "",
                      cell.isToday ? "today" : "",
                      sel ? "selected" : "",
                      hasSkd ? "has-skd" : "",
                      boarding ? "boarding-skd" : "",
                      cell.inMonth && !hasSkd ? "empty-day" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => {
                      if (cell.schedule) onSelect(cell.schedule);
                      else if (cell.inMonth && onEmptyDayClick) onEmptyDayClick(cell.date, cell.dayOfWeek);
                    }}
                    disabled={!clickable}
                  >
                    <span className={`ios-day-num ${cell.isToday ? "today-num" : ""}`}>
                      {cell.date}
                    </span>
                    <div className={`ios-day-events ${boarding ? "ios-day-events-boarding" : "ios-day-events-ops"}`}>
                      {!boarding ? (
                        <>
                          <div className="ios-day-slot ios-day-slot-top">
                            {schedule && (
                              <div className={`ios-skd-pill ${skdPillClass(schedule.myShift)}`}>
                                {skdPillLabel(schedule)}
                              </div>
                            )}
                          </div>
                          <div className="ios-day-slot ios-day-slot-bottom">
                            {bottomLabel && (
                              <div className="ios-skd-pill ios-skd-pill-sub-names">{bottomLabel}</div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="ios-day-slot ios-day-slot-spacer" aria-hidden="true" />
                          <div className="ios-day-slot ios-day-slot-bottom">
                            {schedule && (
                              <div className={`ios-skd-pill ios-skd-pill-boarding ${skdPillClass(schedule.myShift)}`}>
                                {skdPillBoardingLabel(schedule)}
                              </div>
                            )}
                          </div>
                        </>
                      )}
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

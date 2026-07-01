"use client";

import { useMemo } from "react";
import { DaySchedule } from "@/types/schedule";
import { DOW_KO, buildMonthGrid, skdPillClass, skdPillLabel } from "@/lib/monthGrid";

interface Props {
  year: number;
  month: number;
  days: DaySchedule[];
  selected: DaySchedule | null;
  onSelect: (day: DaySchedule | null) => void;
}

export default function IosMonthCalendar({ year, month, days, selected, onSelect }: Props) {
  const now = new Date();
  const today = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };

  const { weeks, weekNumbers } = useMemo(
    () => buildMonthGrid(year, month, days, today),
    [year, month, days, today.year, today.month, today.day],
  );

  const isSelected = (cell: { schedule: DaySchedule | null }) =>
    selected && cell.schedule && selected.orderIndex === cell.schedule.orderIndex;

  return (
    <div className="ios-month-wrap">
      <div className="ios-month-titlebar">
        <span className="ios-month-title-left">{month}월</span>
        <span className="ios-month-title-right">{year}</span>
      </div>

      <div className="ios-month-grid">
        <div className="ios-week-row-with-wn ios-dow-header-row">
          <div className="ios-weeknum ios-weeknum-header" />
          {DOW_KO.map((dow, i) => (
            <div key={dow} className={`ios-dow ${i === 0 ? "sun" : i === 6 ? "sat" : ""}`}>
              {dow}
            </div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className="ios-week-row-with-wn">
            <div className="ios-weeknum">{weekNumbers[wi]}</div>
            {week.map((cell) => {
              const hasSkd = !!cell.schedule;
              const sel = isSelected(cell);
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
                  ].filter(Boolean).join(" ")}
                  onClick={() => { if (cell.schedule) onSelect(cell.schedule); }}
                  disabled={!hasSkd}
                >
                  <span className={`ios-day-num ${cell.isToday ? "today-num" : ""}`}>
                    {cell.date}
                  </span>
                  <div className="ios-day-events">
                    {cell.schedule && (
                      <>
                        <div className={`ios-skd-pill ${skdPillClass(cell.schedule.myShift)}`}>
                          {skdPillLabel(cell.schedule)}
                        </div>
                        {cell.schedule.relatedCoworkers && cell.schedule.relatedCoworkers.names.length > 0 && (
                          <div className={`ios-skd-pill ios-skd-pill-sub ${skdPillClass(cell.schedule.relatedCoworkers.type)}`}>
                            {cell.schedule.relatedCoworkers.label}
                          </div>
                        )}
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
  );
}

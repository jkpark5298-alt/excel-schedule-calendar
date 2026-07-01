"use client";

import { DaySchedule } from "@/types/schedule";
import { groupDaysIntoWeeks, WEEKDAYS } from "@/lib/groupWeeks";
import CompactDayCell from "./CompactDayCell";

interface Props {
  days: DaySchedule[];
  onDayClick?: (day: DaySchedule) => void;
  filterShift?: string;
}

function shiftGroup(shift: string): string {
  if (shift === "C") return "C";
  if (shift === "A") return "A";
  if (shift === "당") return "당";
  if (shift === "休") return "休";
  return "기타";
}

function matchesFilter(day: DaySchedule, filterShift: string): boolean {
  if (filterShift === "전체") return true;
  if (filterShift === "休") return day.myShift === "休";
  return shiftGroup(day.myShift) === filterShift;
}

export default function WeekCalendar({ days, onDayClick, filterShift = "전체" }: Props) {
  const weeks = groupDaysIntoWeeks(days);

  return (
    <div className="week-calendar">
      <div className="week-header">
        {WEEKDAYS.map((dow, i) => (
          <div key={dow} className={`week-header-cell ${i === 0 ? "week-header-sun" : i === 6 ? "week-header-sat" : ""}`}>
            {dow}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="week-row">
          {week.map((day, di) => {
            if (!day) {
              return <div key={`empty-${wi}-${di}`} className="week-cell week-cell-empty" />;
            }
            if (!matchesFilter(day, filterShift)) {
              return (
                <div key={day.orderIndex} className="week-cell week-cell-empty week-cell-filtered">
                  <span className="week-cell-date-muted">{day.date}</span>
                </div>
              );
            }
            return (
              <div key={day.orderIndex} className="week-cell">
                <CompactDayCell day={day} onClick={() => onDayClick?.(day)} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

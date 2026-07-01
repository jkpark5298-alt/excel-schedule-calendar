"use client";

import { DaySchedule } from "@/types/schedule";
import ShiftBadge, { shiftClass } from "./ShiftBadge";

interface Props {
  day: DaySchedule;
  onClick?: () => void;
}

function shortNames(names: string[], max = 2): string {
  if (!names.length) return "";
  const shown = names.slice(0, max).map((n) => n.slice(0, 2)).join("·");
  const extra = names.length > max ? `+${names.length - max}` : "";
  return shown + extra;
}

export default function CompactDayCell({ day, onClick }: Props) {
  const isRest = day.myShift === "休";
  const hasRelated = !!(day.relatedCoworkers && day.relatedCoworkers.names.length > 0);

  return (
    <button type="button" className={`compact-day-cell ${isRest ? "rest" : ""}`} onClick={onClick}>
      <div className="compact-day-top">
        <span className="compact-day-date">{day.date}</span>
        <span className={`compact-day-shift ${shiftClass(day.myShift)}`}>
          {day.isLeader && <span className="compact-leader">👍</span>}
          {day.myShift}
        </span>
      </div>
      {!isRest && day.sameShiftCoworkers.length > 0 && (
        <div className={`compact-day-coworkers ${shiftClass(day.myShift)}`}>
          {shortNames(day.sameShiftCoworkers)}
        </div>
      )}
      {hasRelated && day.relatedCoworkers && (
        <div className="compact-day-related">
          <span className={shiftClass(day.relatedCoworkers.type)}>{day.relatedCoworkers.label}</span>
        </div>
      )}
    </button>
  );
}

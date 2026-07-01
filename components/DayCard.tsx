"use client";

import { DaySchedule } from "@/types/schedule";
import ShiftBadge, { shiftClass } from "./ShiftBadge";

interface Props {
  day: DaySchedule;
  onEdit?: (day: DaySchedule) => void;
  compact?: boolean;
}

const DOW_COLOR: Record<string, string> = {
  토: "text-blue-400",
  일: "text-red-400",
};

export default function DayCard({ day, onEdit, compact = false }: Props) {
  const isRest = day.myShift === "休";
  const dowColor = DOW_COLOR[day.dayOfWeek] || "text-slate-400";

  return (
    <div className={`day-card ${isRest ? "rest" : ""} ${compact ? "day-card-compact" : ""}`}>
      <div className={`flex items-center justify-between ${compact ? "mb-1.5" : "mb-3"}`}>
        <div className="flex items-baseline gap-1">
          <span className={`font-bold text-white ${compact ? "text-lg" : "text-2xl"}`}>{day.date}</span>
          {!compact && <span className={`text-sm font-medium ${dowColor}`}>{day.dayOfWeek}</span>}
        </div>
        <ShiftBadge shift={day.myShift} isLeader={day.isLeader} size={compact ? "sm" : "lg"} />
      </div>

      {!isRest && day.sameShiftCoworkers.length > 0 && (
        <div className={compact ? "mb-1" : "mb-2"}>
          {!compact && <span className="text-xs text-slate-500 mr-1">같은 근무:</span>}
          <span className={`${compact ? "text-xs" : "text-sm"} font-medium ${shiftClass(day.myShift)} leading-snug`}>
            {compact ? day.sameShiftCoworkers.join(", ") : day.sameShiftCoworkers.join(", ")}
          </span>
        </div>
      )}

      {day.relatedCoworkers && day.relatedCoworkers.names.length > 0 && (
        <div className={`related-row ${compact ? "related-row-compact" : ""}`}>
          <span className={`text-xs font-bold mr-1 ${shiftClass(day.relatedCoworkers.type)}`}>
            {day.relatedCoworkers.label}
          </span>
          <span className={`text-slate-400 ${compact ? "text-xs" : "text-sm"} leading-snug`}>
            {day.relatedCoworkers.names.join(", ")}
          </span>
        </div>
      )}

      {onEdit && compact && (
        <button
          type="button"
          className="mt-1 w-full text-left text-[10px] text-slate-500 hover:text-violet-400"
          onClick={() => onEdit(day)}
        >
          수정
        </button>
      )}

      {onEdit && !compact && (
        <div className="mt-3 flex justify-end">
          <button
            className="text-xs text-slate-500 hover:text-violet-400 transition-colors"
            onClick={() => onEdit(day)}
          >
            수정
          </button>
        </div>
      )}
    </div>
  );
}

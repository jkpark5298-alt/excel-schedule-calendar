"use client";

import { DaySchedule } from "@/types/schedule";
import ShiftBadge, { shiftClass } from "./ShiftBadge";

interface Props {
  day: DaySchedule;
  year: number;
  month: number;
  onEdit: () => void;
  onClose: () => void;
}

export default function DaySkdPanel({ day, year, month, onEdit, onClose }: Props) {
  const isRest = day.myShift === "休";

  return (
    <div className="day-skd-panel safe-bottom">
      <div className="day-skd-panel-handle" />
      <div className="day-skd-panel-header">
        <div>
          <p className="day-skd-panel-date">
            {year}년 {month}월 {day.date}일 ({day.dayOfWeek})
          </p>
          <p className="day-skd-panel-sub">확정 SKD</p>
        </div>
        <button type="button" className="day-skd-panel-close" onClick={onClose}>×</button>
      </div>

      <div className="day-skd-panel-body">
        <div className="day-skd-main">
          <ShiftBadge shift={day.myShift} isLeader={day.isLeader} size="lg" />
        </div>

        {!isRest && day.sameShiftCoworkers.length > 0 && (
          <div className="day-skd-row">
            <span className="day-skd-label">같은 근무</span>
            <span className={`day-skd-value ${shiftClass(day.myShift)}`}>
              {day.sameShiftCoworkers.join(", ")}
            </span>
          </div>
        )}

        {day.relatedCoworkers && day.relatedCoworkers.names.length > 0 && (
          <div className="day-skd-row">
            <span className="day-skd-label">{day.relatedCoworkers.label}</span>
            <span className={`day-skd-value ${shiftClass(day.relatedCoworkers.type)}`}>
              {day.relatedCoworkers.names.join(", ")}
            </span>
          </div>
        )}

        {isRest && (
          <p className="day-skd-rest-note">휴무일입니다.</p>
        )}
      </div>

      <div className="day-skd-panel-actions">
        <button type="button" className="btn btn-primary flex-1" onClick={onEdit}>수정</button>
        <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

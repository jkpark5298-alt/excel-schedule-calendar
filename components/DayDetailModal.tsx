"use client";

import { DaySchedule } from "@/types/schedule";
import ShiftBadge, { shiftClass } from "./ShiftBadge";

interface Props {
  day: DaySchedule;
  onEdit: () => void;
  onClose: () => void;
}

export default function DayDetailModal({ day, onEdit, onClose }: Props) {
  const isRest = day.myShift === "休";

  return (
    <div className="iphone-modal-overlay" onClick={onClose}>
      <div className="day-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="day-detail-header">
          <div>
            <span className="day-detail-date">{day.date}일</span>
            <span className="day-detail-dow">{day.dayOfWeek}</span>
          </div>
          <button type="button" className="iphone-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="day-detail-body">
          <div className="day-detail-shift">
            <ShiftBadge shift={day.myShift} isLeader={day.isLeader} size="lg" />
          </div>
          {!isRest && day.sameShiftCoworkers.length > 0 && (
            <div className="day-detail-section">
              <p className="day-detail-label">같은 근무</p>
              <p className={`day-detail-text ${shiftClass(day.myShift)}`}>
                {day.sameShiftCoworkers.join(", ")}
              </p>
            </div>
          )}
          {day.relatedCoworkers && day.relatedCoworkers.names.length > 0 && (
            <div className="day-detail-section">
              <p className="day-detail-label">{day.relatedCoworkers.label}</p>
              <p className="day-detail-text">{day.relatedCoworkers.names.join(", ")}</p>
            </div>
          )}
        </div>
        <div className="day-detail-actions">
          <button type="button" className="btn btn-primary flex-1" onClick={onEdit}>수정</button>
          <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}

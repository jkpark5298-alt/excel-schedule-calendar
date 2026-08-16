"use client";

import { DaySchedule } from "@/types/schedule";
import ShiftBadge from "./ShiftBadge";
import {
  isBoardingDayLayout,
  isRestShift,
  getDualPairLabel,
  skdPillBottomLines,
  skdPillBoardingLines,
  skdPillTopLines,
  shiftClass,
} from "@/lib/shiftDisplay";

interface Props {
  day: DaySchedule;
  year: number;
  month: number;
  boardingMode?: boolean;
  allDays?: DaySchedule[];
  overlayBoardingDay?: DaySchedule | null;
  overlayBoardingName?: string;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function DaySkdPanel({
  day, year, month, boardingMode = false, allDays = [], overlayBoardingDay = null, overlayBoardingName,
  onEdit, onDelete, onClose,
}: Props) {
  const isRest = isRestShift(day.myShift);
  const boarding = boardingMode && isBoardingDayLayout(allDays.length ? allDays : [day], day.myShift);
  const topLines = boarding ? skdPillBoardingLines(day) : skdPillTopLines(day);
  const bottomLines = !boarding ? skdPillBottomLines(day) : [];
  const pairLabel = overlayBoardingDay
    ? getDualPairLabel(day.myShift, overlayBoardingDay.myShift)
    : null;
  const overlayLines = overlayBoardingDay ? skdPillBoardingLines(overlayBoardingDay) : [];

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
          <div className="day-skd-display-stack">
            {topLines.map((line, i) => (
              <span key={`t-${i}`} className="day-skd-display-label">
                {line}
              </span>
            ))}
          </div>
        </div>

        {bottomLines.length > 0 && (
          <div className="ios-skd-pill ios-skd-pill-sub-names ios-skd-names-panel ios-skd-pill-stack">
            {bottomLines.map((line, i) => (
              <span key={`b-${i}`} className="ios-skd-line">
                {line}
              </span>
            ))}
          </div>
        )}

        {!isRest && !boarding && day.sameShiftCoworkers.length > 0 && (
          <div className="day-skd-row">
            <span className="day-skd-label">같은 근무</span>
            <span className={`day-skd-value ${shiftClass(day.myShift)}`}>
              {day.sameShiftCoworkers.join(", ")}
            </span>
          </div>
        )}

        {isRest && !boarding && (
          <p className="day-skd-rest-note">휴무일입니다.</p>
        )}

        {overlayBoardingName && (
          <div className="day-skd-overlay-block">
            <p className="day-skd-overlay-title">{overlayBoardingName}</p>
            {overlayBoardingDay ? (
              <>
                <div className="day-skd-main">
                  <ShiftBadge shift={overlayBoardingDay.myShift} size="md" />
                  <div className="day-skd-display-stack">
                    {overlayLines.map((line, i) => (
                      <span key={`ob-${i}`} className="day-skd-display-label">
                        {line}
                      </span>
                    ))}
                  </div>
                </div>
                {pairLabel && <p className="day-skd-overlay-pair">{pairLabel}</p>}
              </>
            ) : (
              <p className="day-skd-rest-note">일정 없음</p>
            )}
          </div>
        )}
      </div>

      <div className="day-skd-panel-actions">
        <button type="button" className="btn btn-primary flex-1" onClick={onEdit}>수정</button>
        <button type="button" className="btn btn-danger flex-1" onClick={onDelete}>삭제</button>
        <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

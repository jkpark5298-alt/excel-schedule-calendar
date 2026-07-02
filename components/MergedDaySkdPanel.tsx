"use client";

import { DaySchedule } from "@/types/schedule";
import ShiftBadge from "./ShiftBadge";
import {
  isBoardingSchedule,
  isBoardingDayLayout,
  isRestShift,
  skdPillBottomLabel,
  skdPillBoardingLabel,
  skdPillLabel,
  shiftClass,
} from "@/lib/shiftDisplay";

interface PersonSectionProps {
  name: string;
  day: DaySchedule | null;
  allDays: DaySchedule[];
  locked?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function PersonSection({ name, day, allDays, locked, onEdit, onDelete }: PersonSectionProps) {
  if (!day) {
    return (
      <section className="merged-panel-section merged-panel-section-empty">
        <h4 className="merged-panel-person">{name}</h4>
        <p className="merged-panel-empty">일정 없음</p>
      </section>
    );
  }

  const boardingMode = isBoardingSchedule(allDays);
  const boarding = boardingMode && isBoardingDayLayout(allDays, day.myShift);
  const bottomLabel = !boarding ? skdPillBottomLabel(day) : null;
  const isRest = isRestShift(day.myShift);

  return (
    <section className="merged-panel-section">
      <h4 className="merged-panel-person">{name}</h4>
      <div className="day-skd-main">
        <ShiftBadge shift={day.myShift} isLeader={day.isLeader} size="lg" />
        <span className="day-skd-display-label">
          {boarding ? skdPillBoardingLabel(day) : skdPillLabel(day)}
        </span>
      </div>

      {bottomLabel && (
        <div className="ios-skd-pill ios-skd-pill-sub-names ios-skd-names-panel">{bottomLabel}</div>
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

      {!locked && (
        <div className="merged-panel-section-actions">
          <button type="button" className="btn btn-sm btn-primary flex-1" onClick={onEdit}>수정</button>
          <button type="button" className="btn btn-sm btn-danger flex-1" onClick={onDelete}>삭제</button>
        </div>
      )}
    </section>
  );
}

interface Props {
  year: number;
  month: number;
  date: number;
  dayOfWeek: string;
  opsTarget: string;
  boardingTarget: string;
  opsDay: DaySchedule | null;
  boardingDay: DaySchedule | null;
  opsDays: DaySchedule[];
  boardingDays: DaySchedule[];
  opsLocked?: boolean;
  boardingLocked?: boolean;
  onEditOps: () => void;
  onDeleteOps: () => void;
  onEditBoarding: () => void;
  onDeleteBoarding: () => void;
  onClose: () => void;
}

export default function MergedDaySkdPanel({
  year,
  month,
  date,
  dayOfWeek,
  opsTarget,
  boardingTarget,
  opsDay,
  boardingDay,
  opsDays,
  boardingDays,
  opsLocked,
  boardingLocked,
  onEditOps,
  onDeleteOps,
  onEditBoarding,
  onDeleteBoarding,
  onClose,
}: Props) {
  return (
    <div className="day-skd-panel merged-day-skd-panel safe-bottom">
      <div className="day-skd-panel-handle" />
      <div className="day-skd-panel-header">
        <div>
          <p className="day-skd-panel-date">
            {year}년 {month}월 {date}일 ({dayOfWeek})
          </p>
          <p className="day-skd-panel-sub">{opsTarget} · {boardingTarget}</p>
        </div>
        <button type="button" className="day-skd-panel-close" onClick={onClose}>×</button>
      </div>

      <div className="day-skd-panel-body merged-day-skd-body">
        <PersonSection
          name={opsTarget}
          day={opsDay}
          allDays={opsDays}
          locked={opsLocked}
          onEdit={onEditOps}
          onDelete={onDeleteOps}
        />
        <PersonSection
          name={boardingTarget}
          day={boardingDay}
          allDays={boardingDays}
          locked={boardingLocked}
          onEdit={onEditBoarding}
          onDelete={onDeleteBoarding}
        />
      </div>

      <div className="day-skd-panel-actions">
        <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

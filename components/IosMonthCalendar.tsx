"use client";

import { useMemo } from "react";
import { DaySchedule } from "@/types/schedule";
import {
  DOW_KO,
  buildMonthGrid,
  skdPillClass,
  isBoardingDayLayout,
} from "@/lib/monthGrid";
import { computeOpsMonthStats, formatWon } from "@/lib/opsMonthStats";
import { usePinchZoom } from "@/lib/usePinchZoom";
import OpsSkdPills from "./OpsSkdPills";
import { getDualPairLabel, skdPillBoardingLinesDual } from "@/lib/shiftDisplay";

interface Props {
  year: number;
  month: number;
  days: DaySchedule[];
  selected: DaySchedule | null;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  onSelect: (day: DaySchedule | null) => void;
  onEmptyDayClick?: (date: number, dayOfWeek: string) => void;
  /** 박종규(운항) 월간 집계 표시 */
  showOpsStats?: boolean;
  /** 날짜 탭 시 리더 지정/해제 */
  leaderPickMode?: boolean;
  onToggleLeader?: (day: DaySchedule) => void;
  boardingDays?: DaySchedule[];
  showBoardingOverlay?: boolean;
}

export default function IosMonthCalendar({
  year, month, days, selected, zoom = 1, onZoomChange, onSelect,   onEmptyDayClick, showOpsStats = false, leaderPickMode = false, onToggleLeader,
  boardingDays = [], showBoardingOverlay = false,
}: Props) {
  const now = new Date();
  const today = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  const { pinchRef, isPinching } = usePinchZoom(zoom, onZoomChange ?? (() => {}));

  const { weeks } = useMemo(
    () => buildMonthGrid(year, month, days, today),
    [year, month, days, today.year, today.month, today.day],
  );

  const opsStats = useMemo(
    () => (showOpsStats ? computeOpsMonthStats(days) : null),
    [showOpsStats, days],
  );

  const boardingByDate = useMemo(() => {
    const map = new Map<number, DaySchedule>();
    if (!showBoardingOverlay) return map;
    for (const day of boardingDays) {
      const date = Number(day.date);
      if (!map.has(date)) map.set(date, day);
    }
    return map;
  }, [showBoardingOverlay, boardingDays]);

  const isSelected = (cell: { schedule: DaySchedule | null }) =>
    selected && cell.schedule && selected.orderIndex === cell.schedule.orderIndex;

  return (
    <div
      ref={onZoomChange ? pinchRef : undefined}
      className={`ios-month-zoom-wrap${isPinching ? " is-pinching" : ""}`}
      style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}
    >
      <div className="ios-month-wrap">
        <div className="ios-month-titlebar">
          <span className="ios-month-title-left">{month}월</span>
          <span className="ios-month-title-right">{year}</span>
        </div>
        {opsStats && (
          <div className="ios-month-ops-stats">
            <span>근무 {opsStats.workDays}일</span>
            <span>출근 {opsStats.attendanceDays}일</span>
            <span>식권 {opsStats.mealTickets}장</span>
            <span>식권비 {formatWon(opsStats.mealCost)}</span>
            <span>출근보조 {formatWon(opsStats.commuteAllowance)}</span>
          </div>
        )}

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
                const boardingLayout = schedule ? isBoardingDayLayout(days, schedule.myShift) : false;
                const overlayBoarding = cell.inMonth ? boardingByDate.get(cell.date) ?? null : null;
                const pairLabel = overlayBoarding
                  ? getDualPairLabel(schedule?.myShift, overlayBoarding.myShift)
                  : null;
                const withOverlay = showBoardingOverlay && cell.inMonth;
                const clickable = hasSkd || (cell.inMonth && !!onEmptyDayClick) || (leaderPickMode && cell.inMonth && !!schedule);

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
                      schedule?.isLeader ? "is-leader" : "",
                      leaderPickMode && cell.inMonth ? "leader-pick" : "",
                      boardingLayout ? "boarding-skd" : "",
                      withOverlay ? "ops-with-boarding" : "",
                      cell.inMonth && !hasSkd ? "empty-day" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => {
                      if (leaderPickMode && schedule && onToggleLeader) {
                        onToggleLeader(schedule);
                        return;
                      }
                      if (cell.schedule) onSelect(cell.schedule);
                      else if (cell.inMonth && onEmptyDayClick) onEmptyDayClick(cell.date, cell.dayOfWeek);
                    }}
                    disabled={!clickable}
                  >
                    <span className={`ios-day-num ${cell.isToday ? "today-num" : ""} ${schedule?.isLeader ? "is-leader" : ""}`}>
                      {schedule?.isLeader ? <span className="ios-day-leader" title="리더">👍</span> : null}
                      <span className="ios-day-num-text">{cell.date}</span>
                    </span>
                    <div className={`ios-day-events ${boardingLayout ? "ios-day-events-boarding" : "ios-day-events-ops"} ${withOverlay ? "ios-day-events-overlay" : ""}`}>
                      {!boardingLayout ? (
                        schedule ? <OpsSkdPills day={schedule} compact /> : (
                          <div className="ios-day-slot ios-day-slot-top ios-day-slot-auto" />
                        )
                      ) : (
                        <div className="ios-day-slot ios-day-slot-bottom ios-day-slot-boarding-stack">
                          {schedule && (
                            <div
                              className={`ios-skd-pill ios-skd-pill-boarding ios-skd-pill-boarding-dual ${skdPillClass(schedule.myShift)}`}
                            >
                              {skdPillBoardingLinesDual(schedule).map((line, i) => (
                                <span key={`${i}-${line}`} className="ios-skd-boarding-line">
                                  {line}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {withOverlay && pairLabel && (
                        <div className="merged-pair-badge" title={pairLabel}>
                          <span className="merged-pair-badge-text">{pairLabel}</span>
                        </div>
                      )}
                      {withOverlay && overlayBoarding && (
                        <div className="ios-day-slot ios-day-slot-bottom ios-day-slot-boarding-stack ios-ops-boarding-overlay">
                          <div
                            className={`ios-skd-pill ios-skd-pill-boarding ios-skd-pill-boarding-dual ${skdPillClass(overlayBoarding.myShift)}`}
                          >
                            {skdPillBoardingLinesDual(overlayBoarding).map((line, i) => (
                              <span key={`ob-${i}-${line}`} className="ios-skd-boarding-line">
                                {line}
                              </span>
                            ))}
                          </div>
                        </div>
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

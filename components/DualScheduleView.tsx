"use client";

import { useState } from "react";
import { ParsedSchedule } from "@/types/schedule";
import MergedMonthCalendar from "./MergedMonthCalendar";

const ZOOM_STEPS = [0.75, 0.85, 1, 1.1];

interface Props {
  year: number;
  month: number;
  opsTarget: string;
  boardingTarget: string;
  opsSchedule: ParsedSchedule | null;
  boardingSchedule: ParsedSchedule | null;
}

export default function DualScheduleView({
  year,
  month,
  opsTarget,
  boardingTarget,
  opsSchedule,
  boardingSchedule,
}: Props) {
  const [zoomIndex, setZoomIndex] = useState(2);
  const zoom = ZOOM_STEPS[zoomIndex];
  const hasAny = !!opsSchedule || !!boardingSchedule;

  return (
    <div className="iphone-schedule-body merged-schedule-body">
      <div className="iphone-saved-badge">
        <span className="iphone-saved-dot" />
        {year}년 {month}월 · {opsTarget} + {boardingTarget} 합쳐 보기
      </div>

      <div className="iphone-toolbar iphone-toolbar-compact">
        <div className="iphone-toolbar-btns">
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
            disabled={zoomIndex === 0}
          >
            −
          </button>
          <span className="iphone-zoom-label">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
          >
            +
          </button>
        </div>
      </div>

      {!hasAny ? (
        <div className="dual-calendar-empty dual-calendar-empty-main">
          <p>{year}년 {month}월 근무표가 없습니다.</p>
          <p className="dual-calendar-empty-hint">박종규·김현숙 탭에서 각각 업로드해 주세요.</p>
        </div>
      ) : (
        <MergedMonthCalendar
          year={year}
          month={month}
          opsDays={opsSchedule?.days ?? []}
          boardingDays={boardingSchedule?.days ?? []}
          opsTarget={opsTarget}
          boardingTarget={boardingTarget}
          zoom={zoom}
        />
      )}
    </div>
  );
}

"use client";

import { DaySchedule } from "@/types/schedule";
import {
  skdPillBottomLines,
  skdPillClass,
  skdPillTopLines,
  skdPillTypeLabel,
} from "@/lib/shiftDisplay";

interface Props {
  day: DaySchedule;
  /** 함께(합쳐보기) — 검정 하단(relatedCoworkers) 제외 */
  hideRelated?: boolean;
  /** 아이폰 단독 — 검정 TYPE+이름을 한 줄로, 빈 하단 슬롯 제거 */
  compact?: boolean;
}

/** 운항 셀: 상단 TYPE, 하단 검정 related(있을 때만) */
export default function OpsSkdPills({ day, hideRelated = false, compact = false }: Props) {
  const topLines = hideRelated
    ? (day.isLeader
        ? [skdPillTypeLabel(day), ...(day.sameShiftCoworkers?.slice(0, 1) ?? [])]
        : [skdPillTopLines(day)[0]])
    : compact
      ? (day.isLeader
          ? [skdPillTypeLabel(day), ...(day.sameShiftCoworkers?.slice(0, 1) ?? [])]
          : [skdPillTopLines(day)[0]])
      : skdPillTopLines(day);

  const rawBottom = hideRelated ? [] : skdPillBottomLines(day);
  // 검정: TYPE + 이름을 한 줄로 (아래 줄/여백 제거)
  const bottomLine =
    rawBottom.length === 0
      ? null
      : rawBottom.length === 1
        ? rawBottom[0]
        : `${rawBottom[0]} ${rawBottom.slice(1).join(" ")}`;

  return (
    <>
      <div
        className={`ios-day-slot ios-day-slot-top ${compact ? "ios-day-slot-compact" : "ios-day-slot-lines-2"}`}
      >
        <div
          className={`ios-skd-pill ios-skd-pill-stack ${day.isLeader ? "ios-skd-pill-leader" : ""} ${skdPillClass(day.myShift)}`}
        >
          {topLines.map((line, i) => (
            <span key={`t-${i}-${line}`} className="ios-skd-line">
              {line}
            </span>
          ))}
        </div>
      </div>
      {bottomLine && (
        <div
          className={`ios-day-slot ios-day-slot-bottom ${compact ? "ios-day-slot-compact" : "ios-day-slot-lines-2"}`}
        >
          <div className="ios-skd-pill ios-skd-pill-sub-names ios-skd-pill-stack ios-skd-pill-black-one">
            <span className="ios-skd-line">{bottomLine}</span>
          </div>
        </div>
      )}
    </>
  );
}

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
}

/** 운항 셀: 상단 TYPE→이름 칸 분리, 하단 검정 TYPE / 이름1 → 다음 이름 */
export default function OpsSkdPills({ day, hideRelated = false }: Props) {
  // 함께 보기: 좁은 셀이라 TYPE(+첫 동료 1명)만 — 잘림 방지
  const topLines = hideRelated
    ? (day.isLeader
        ? [skdPillTypeLabel(day), ...(day.sameShiftCoworkers?.slice(0, 1) ?? [])]
        : [skdPillTopLines(day)[0]])
    : skdPillTopLines(day);
  const bottomLines = hideRelated ? [] : skdPillBottomLines(day);

  return (
    <>
      <div className="ios-day-slot ios-day-slot-top ios-day-slot-lines-2">
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
      {!hideRelated && (
        <div className="ios-day-slot ios-day-slot-bottom ios-day-slot-lines-2">
          {bottomLines.length > 0 && (
            <div className="ios-skd-pill ios-skd-pill-sub-names ios-skd-pill-stack">
              {bottomLines.map((line, i) => (
                <span key={`b-${i}-${line}`} className="ios-skd-line">
                  {line}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

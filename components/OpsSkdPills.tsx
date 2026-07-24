"use client";

import { DaySchedule } from "@/types/schedule";
import {
  skdPillBottomLines,
  skdPillClass,
  skdPillTopLines,
} from "@/lib/shiftDisplay";

/** 운항 셀: 상단 TYPE→이름 칸 분리, 하단 검정 TYPE / 이름1 → 다음 이름 */
export default function OpsSkdPills({ day }: { day: DaySchedule }) {
  const topLines = skdPillTopLines(day);
  const bottomLines = skdPillBottomLines(day);

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
    </>
  );
}

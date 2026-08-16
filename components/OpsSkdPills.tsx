"use client";

import { type ReactNode } from "react";
import { DaySchedule } from "@/types/schedule";
import {
  formatShiftDisplay,
  isRestShift,
  skdPillClass,
  skdPillTypeLabel,
} from "@/lib/shiftDisplay";

interface Props {
  day: DaySchedule;
  /** 함께(합쳐보기) — 검정 하단(relatedCoworkers) 제외 */
  hideRelated?: boolean;
  /** 아이폰 — 내용 높이만큼만 */
  compact?: boolean;
}

/**
 * TYPE 접두 + 이름 열 맞춤
 * 예) A/최재성
 *         김국현
 *     C/최용준
 *         김국현
 * A(익일) — TYPE만 첫 행, 이름은 다음 행부터 열맞춤
 */
function TypeNamesBlock({
  prefix,
  names,
  compactFont = false,
  typeOwnLine = false,
}: {
  prefix: string;
  names: string[];
  compactFont?: boolean;
  /** A(익일)처럼 TYPE만 첫 행, 이름은 아래 열 */
  typeOwnLine?: boolean;
}) {
  if (names.length === 0) {
    return (
      <span className={`ios-skd-line ${compactFont ? "ios-skd-line-sm" : ""}`}>
        {prefix}
      </span>
    );
  }

  if (typeOwnLine) {
    // A(익일) — TYPE 단독 행, 이름은 아래 행부터 같은 열
    return (
      <div
        className={`ios-skd-type-own ${compactFont ? "ios-skd-type-grid-sm" : ""}`}
      >
        <div className="ios-skd-type-own-label">{prefix}</div>
        {names.map((name, i) => (
          <div key={`${i}-${name}`} className="ios-skd-type-own-name">
            {name}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`ios-skd-type-grid ${compactFont ? "ios-skd-type-grid-sm" : ""}`}
    >
      {names.map((name, i) => (
        <div key={`${i}-${name}`} className="ios-skd-type-row">
          <span className="ios-skd-type-prefix">
            {i === 0 ? prefix : "\u00a0"}
          </span>
          <span className="ios-skd-type-name">{name}</span>
        </div>
      ))}
    </div>
  );
}

/** 운항 셀 표기
 * 비리더: A/강정형 → 추가 이름 아래 열맞춤
 * 리더: C/이영식 (👍는 날짜 옆) → 추가 동료 열맞춤
 * 검정: C 김우석 → 아래 이름 열맞춤
 */
export default function OpsSkdPills({ day, hideRelated = false, compact = false }: Props) {
  const slotClass = compact ? "ios-day-slot-auto" : "ios-day-slot-lines-2";
  const type = formatShiftDisplay(day.myShift);
  const coworkers = day.sameShiftCoworkers ?? [];
  const rest = isRestShift(day.myShift);

  let topNode: ReactNode;
  if (hideRelated) {
    if (day.isLeader) {
      const first = coworkers[0];
      topNode = (
        <TypeNamesBlock
          prefix={`${skdPillTypeLabel(day)}/`}
          names={first ? [first] : []}
        />
      );
    } else if (rest || coworkers.length === 0) {
      topNode = <span className="ios-skd-line">{type}</span>;
    } else {
      topNode = <TypeNamesBlock prefix={`${type}/`} names={[coworkers[0]]} />;
    }
  } else if (day.isLeader) {
    const [first, ...more] = coworkers;
    topNode = (
      <TypeNamesBlock
        prefix={`${skdPillTypeLabel(day)}/`}
        names={first ? [first, ...more] : []}
      />
    );
  } else if (rest || coworkers.length === 0) {
    topNode = <span className="ios-skd-line">{type}</span>;
  } else {
    topNode = <TypeNamesBlock prefix={`${type}/`} names={coworkers} />;
  }

  const rc = !hideRelated ? day.relatedCoworkers : null;
  const blackNames = rc?.names ?? [];
  const blackLabel = rc ? rc.label || String(rc.type) : "";
  // A(익일): TYPE만 첫 행, 이름은 다음 행부터 열맞춤 / 그 외: C/김우석
  const blackIsNextDayA = blackLabel.includes("익일");
  const blackPrefix = blackIsNextDayA ? blackLabel : `${blackLabel}/`;

  return (
    <>
      <div className={`ios-day-slot ios-day-slot-top ${slotClass}`}>
        <div
          className={`ios-skd-pill ios-skd-pill-stack ${day.isLeader ? "ios-skd-pill-leader" : ""} ${skdPillClass(day.myShift)}`}
        >
          {topNode}
        </div>
      </div>
      {blackNames.length > 0 && (
        <div className={`ios-day-slot ios-day-slot-bottom ${slotClass}`}>
          <div className="ios-skd-pill ios-skd-pill-sub-names ios-skd-pill-stack">
            <TypeNamesBlock
              prefix={blackPrefix}
              names={blackNames}
              typeOwnLine={blackIsNextDayA}
            />
          </div>
        </div>
      )}
    </>
  );
}

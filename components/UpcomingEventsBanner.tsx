"use client";

import { useEffect, useMemo, useState } from "react";
import { ImportedCalendar, upcomingEvents } from "@/lib/eventStorage";
import { StoredCalendarData, getScheduleForPerson } from "@/lib/scheduleStorage";
import { formatShiftDisplay, isRestShift } from "@/lib/shiftDisplay";

interface Props {
  calendars: ImportedCalendar[];
  stored: StoredCalendarData;
  opsTarget: string;
}

/** 앱을 열었을 때 오늘·내일 일정을 위에 알려 준다 */
export default function UpcomingEventsBanner({ calendars, stored, opsTarget }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const items = useMemo(() => upcomingEvents(calendars, now).slice(0, 4), [calendars, now]);
  if (items.length === 0) return null;

  return (
    <div className="upcoming-banner" role="status">
      {items.map((e) => {
        // 종일 여러 날 일정이면 오늘/내일 그 날짜의 근무를 본다
        const dateKey = e.allDay && e.day === "내일"
          ? new Date(now + 9 * 3600_000 + 24 * 3600_000).toISOString().slice(0, 10)
          : e.allDay ? new Date(now + 9 * 3600_000).toISOString().slice(0, 10) : e.startDate;
        const [y, m, d] = dateKey.split("-").map(Number);
        const shift = getScheduleForPerson(stored, opsTarget, y, m)?.days.find((x) => Number(x.date) === d)?.myShift;
        const when = e.allDay ? `${e.day} 종일` : `${e.day} ${e.timeLabel}`;
        return (
          <div key={e.id} className="upcoming-item">
            <span className="events-icon" style={{ borderColor: e.color }}>{e.icon}</span>
            <span className="upcoming-when">{when}</span>
            <span className="upcoming-title">{e.title}</span>
            {shift && (
              <span className={`events-shift ${isRestShift(shift) ? "rest" : "working"}`}>
                {formatShiftDisplay(shift)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

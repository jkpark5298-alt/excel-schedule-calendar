"use client";

import { useMemo, useRef, useState } from "react";
import { ParsedSchedule } from "@/types/schedule";
import { parseIcs } from "@/lib/icsImport";
import {
  ALARM_OPTIONS, ICON_OPTIONS, ImportedCalendar, calendarIcon, eventsByDateForMonth, upsertCalendar,
} from "@/lib/eventStorage";
import { futureEvents, sendEventsToPhoneCalendar } from "@/lib/exportEventsIcs";
import { formatShiftDisplay, isRestShift } from "@/lib/shiftDisplay";
import { DOW_KO } from "@/lib/monthGrid";

interface Props {
  year: number;
  month: number;
  calendars: ImportedCalendar[];
  onChange: (next: ImportedCalendar[]) => void;
  /** 해당 월 박종규 근무 (겹침 표시용) */
  opsSchedule: ParsedSchedule | null;
}

export default function EventsPanel({ year, month, calendars, onChange, opsSchedule }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const byDate = useMemo(() => eventsByDateForMonth(calendars, year, month), [calendars, year, month]);
  const monthList = useMemo(
    () => [...byDate.entries()].sort((a, b) => a[0] - b[0]),
    [byDate],
  );

  const shiftOn = (date: number) => opsSchedule?.days.find((d) => Number(d.date) === date)?.myShift ?? null;

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    let next = calendars;
    const lines: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const parsed = parseIcs(await file.text());
        const name = parsed.calendarName || file.name.replace(/\.(ics|ical|ifb|icalendar)$/i, "");
        const result = upsertCalendar(next, name, parsed.events, file.name);
        next = result.next;
        lines.push(`✅ ${name}: 일정 ${parsed.events.length}건 ${result.replaced ? "(새 파일로 바꿈)" : "추가"}`);
        lines.push(...parsed.warnings.map((w) => `   ⚠️ ${w}`));
      } catch (e) {
        lines.push(`❌ ${file.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    onChange(next);
    setMessage(lines.join("\n"));
    setBusy(false);
  };

  const update = (id: string, patch: Partial<ImportedCalendar>) => {
    onChange(calendars.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const remove = (cal: ImportedCalendar) => {
    if (!confirm(`'${cal.name}' 일정 ${cal.events.length}건을 이 앱에서 삭제할까요?\n(휴대폰 캘린더로 보낸 일정은 그대로 남습니다)`)) return;
    onChange(calendars.filter((c) => c.id !== cal.id));
  };

  return (
    <div className="events-panel iphone-manage-panel">
      <div className="events-panel-head">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "읽는 중…" : "ICS 파일 가져오기"}
        </button>
        <span className="events-panel-note">모든 시간은 한국시간</span>
        <input
          ref={inputRef}
          type="file"
          accept=".ics,.ical,.icalendar,text/calendar"
          multiple
          className="hidden"
          onChange={(e) => { void handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {message && (
        <pre className="events-panel-message" onClick={() => setMessage(null)}>{message}</pre>
      )}

      {calendars.length === 0 ? (
        <p className="events-panel-empty">
          축구 경기 일정 등 .ics 파일을 가져오면 달력에 함께 표시됩니다.<br />
          같은 이름의 파일을 다시 가져오면 최신 일정으로 바뀝니다.
        </p>
      ) : (
        <ul className="events-cal-list">
          {calendars.map((cal) => (
            <li key={cal.id} className="events-cal-item">
              <div className="events-cal-row">
                <select
                  className="events-icon-select"
                  value={calendarIcon(cal)}
                  onChange={(e) => update(cal.id, { icon: e.target.value })}
                  aria-label="표시 아이콘"
                  style={{ borderColor: cal.color }}
                >
                  {[...new Set([calendarIcon(cal), ...ICON_OPTIONS])].map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
                <span className="events-cal-name">{cal.name}</span>
                <span className="events-cal-count">남은 일정 {futureEvents(cal).length}건</span>
              </div>
              <div className="events-cal-row events-cal-actions">
                <label className="events-alarm">
                  알림
                  <select
                    value={cal.alarmMinutes == null ? "" : String(cal.alarmMinutes)}
                    onChange={(e) => update(cal.id, { alarmMinutes: e.target.value === "" ? null : Number(e.target.value) })}
                  >
                    {ALARM_OPTIONS.map((o) => (
                      <option key={o.label} value={o.value == null ? "" : String(o.value)}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => { void sendEventsToPhoneCalendar(cal); }}
                  title="알림이 들어간 일정 파일을 휴대폰 캘린더에 넣습니다"
                >
                  🔔 휴대폰 캘린더로
                </button>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(cal)}>삭제</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {calendars.length > 0 && (
        <div className="events-month">
          <p className="events-month-title">{month}월 일정 {monthList.reduce((n, [, l]) => n + l.length, 0)}건</p>
          {monthList.length === 0 ? (
            <p className="events-panel-empty">이번 달 일정이 없습니다.</p>
          ) : (
            <ul className="events-month-list">
              {monthList.map(([date, list]) => {
                const shift = shiftOn(date);
                const working = shift != null && !isRestShift(shift);
                const dow = DOW_KO[new Date(year, month - 1, date).getDay()];
                return list.map((e, i) => (
                  <li key={`${date}-${e.id}`} className="events-month-item">
                    <span className="events-month-date">{i === 0 ? `${date}(${dow})` : ""}</span>
                    <span className="events-icon" style={{ borderColor: e.color }}>{e.icon}</span>
                    <span className="events-month-time">{e.timeLabel}</span>
                    <span className="events-month-body">
                      <span className="events-month-name">{e.title}</span>
                      {e.location && <span className="events-month-loc">{e.location}</span>}
                    </span>
                    {i === 0 && shift != null && (
                      <span className={`events-shift ${working ? "working" : "rest"}`}>
                        {formatShiftDisplay(shift)}
                      </span>
                    )}
                  </li>
                ));
              })}
            </ul>
          )}
        </div>
      )}

      <p className="events-panel-help">
        🔔 알림: &lsquo;휴대폰 캘린더로&rsquo;를 누르면 알림이 들어간 일정이 휴대폰 캘린더에 들어가,
        앱을 닫아 둬도 휴대폰이 알려 줍니다. 알림 시간을 바꿔 다시 보낼 때는 휴대폰 캘린더에서 이전에 넣은 일정을 먼저 지워 주세요.
      </p>
    </div>
  );
}

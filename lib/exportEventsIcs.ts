/**
 * 가져온 일정 → 알림(VALARM)이 들어간 ICS
 * 휴대폰 캘린더에 넣으면 앱을 닫아 둬도 휴대폰이 알림을 띄운다.
 */
import type { ImportedCalendar } from "@/lib/eventStorage";
import type { ImportedEvent } from "@/lib/icsImport";
import { shareOrDownloadIcs } from "@/lib/exportGoogleIcs";

function escapeIcsText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function utcStamp(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function dateOnly(key: string): string {
  return key.replace(/-/g, "");
}

function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** ASCII UID (한글 UID는 일부 캘린더가 거부) — 같은 일정은 항상 같은 UID라 다시 넣어도 중복되지 않음 */
function asciiUid(id: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < id.length; i++) {
    const c = id.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519);
  }
  return `${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}@excel-schedule-calendar.events`;
}

function alarmTrigger(e: ImportedEvent, minutes: number): string {
  if (e.allDay) {
    // 종일 일정: 하루 전이면 전날 오전 9시, 그 외는 당일 오전 9시
    return minutes >= 1440 ? "-PT15H" : "PT9H";
  }
  return `-PT${minutes}M`;
}

function buildVEvent(cal: ImportedCalendar, e: ImportedEvent, now: number): string {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${asciiUid(e.id)}`,
    `DTSTAMP:${utcStamp(now)}`,
  ];
  if (e.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${dateOnly(e.startDate)}`);
    lines.push(`DTEND;VALUE=DATE:${dateOnly(addDaysKey(e.lastDate, 1))}`);
  } else {
    lines.push(`DTSTART:${utcStamp(e.start)}`);
    lines.push(`DTEND:${utcStamp(Math.max(e.end, e.start))}`);
  }
  lines.push(`SUMMARY:${escapeIcsText(e.title)}`);
  if (e.location) lines.push(`LOCATION:${escapeIcsText(e.location)}`);
  const desc = [`[${cal.name}]`, e.description].filter(Boolean).join("\n");
  lines.push(`DESCRIPTION:${escapeIcsText(desc)}`);
  if (cal.alarmMinutes != null) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText(e.title)}`,
      `TRIGGER:${alarmTrigger(e, cal.alarmMinutes)}`,
      "END:VALARM",
    );
  }
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

/** 앞으로 남은 일정만 (이미 끝난 일정은 제외) */
export function futureEvents(cal: ImportedCalendar, now = Date.now()): ImportedEvent[] {
  return cal.events.filter((e) => e.end > now);
}

export function buildEventsIcs(cal: ImportedCalendar, now = Date.now()): string {
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ExcelScheduleCalendar//Imported Events//KO",
    "CALSCALE:GREGORIAN",
    ...futureEvents(cal, now).map((e) => buildVEvent(cal, e, now)),
    "END:VCALENDAR",
  ].join("\r\n");
  return `${body}\r\n`;
}

export async function sendEventsToPhoneCalendar(cal: ImportedCalendar): Promise<void> {
  const count = futureEvents(cal).length;
  if (count === 0) {
    alert("앞으로 남은 일정이 없습니다.");
    return;
  }
  const safeName = cal.name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 40);
  const result = await shareOrDownloadIcs(
    buildEventsIcs(cal),
    `${safeName}_알림.ics`,
    cal.name,
    `${cal.name} 일정 ${count}건`,
  );
  if (result === "downloaded") {
    window.setTimeout(() => {
      alert(
        `${cal.name} 일정 ${count}건 (${cal.alarmMinutes == null ? "알림 없음" : "알림 포함"}) 파일을 저장했습니다.\n\n` +
          "· 아이폰: 저장된 파일을 열고 '모두 추가'\n" +
          "· 구글 캘린더(PC): 설정 → 가져오기 → 이 파일 선택\n" +
          "  (구글 캘린더는 파일의 알림 대신 캘린더 기본 알림을 씁니다)",
      );
    }, 300);
  }
}

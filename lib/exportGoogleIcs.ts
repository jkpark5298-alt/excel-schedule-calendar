import { DaySchedule, ParsedSchedule } from "@/types/schedule";
import { SHIFT_TIME_LABELS, isRestShift } from "@/lib/shiftDisplay";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function escapeIcsText(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function shiftLabel(day: DaySchedule) {
  if (SHIFT_TIME_LABELS[day.myShift]) return SHIFT_TIME_LABELS[day.myShift];
  if (day.myShift === "C") return "C근무";
  if (day.myShift === "A") return "A근무";
  if (day.myShift === "당") return "당근무";
  if (isRestShift(day.myShift)) return "休(휴무)";
  return String(day.myShift);
}

function buildVEvent(day: DaySchedule, schedule: ParsedSchedule): string {
  const y = schedule.year;
  const m = pad(schedule.month);
  const d = pad(day.date);
  const start = new Date(y, schedule.month - 1, day.date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const dtStart = `${y}${m}${d}`;
  const dtEnd = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}`;

  const leader = day.isLeader ? " 리더" : "";
  const summary = escapeIcsText(`[${schedule.targetName}] ${shiftLabel(day)}${leader}`);
  const descParts = [shiftLabel(day) + leader];
  const coworkers = day.sameShiftCoworkers ?? [];
  if (coworkers.length) {
    descParts.push(`같은 근무: ${coworkers.join(", ")}`);
  }
  if (day.relatedCoworkers?.names?.length) {
    descParts.push(`${day.relatedCoworkers.label}: ${day.relatedCoworkers.names.join(", ")}`);
  }
  const description = escapeIcsText(descParts.join("\n"));
  const uid = `${schedule.targetName}-${dtStart}-${day.myShift}@work-schedule`.replace(/\s/g, "");
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
  ].join("\r\n");
}

/** 기본은 휴무 포함 — Google 가져오기 시 빈 파일 방지 */
export function buildMonthIcs(schedule: ParsedSchedule, includeRest = true): string {
  const days = (schedule.days ?? []).filter((d) => includeRest || !isRestShift(d.myShift));
  const events = days.map((d) => buildVEvent(d, schedule));
  const calName = escapeIcsText(
    `${schedule.targetName} ${schedule.year}-${pad(schedule.month)} 근무표`,
  );
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Work Schedule Calendar//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calName}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function countIcsEvents(schedule: ParsedSchedule, includeRest = true): number {
  return (schedule.days ?? []).filter((d) => includeRest || !isRestShift(d.myShift)).length;
}

export function downloadMonthIcs(schedule: ParsedSchedule, includeRest = true): void {
  const count = countIcsEvents(schedule, includeRest);
  if (count === 0) {
    alert("내보낼 일정이 없습니다. 월간 일정이 있는지 확인해 주세요.");
    return;
  }

  const ics = buildMonthIcs(schedule, includeRest);
  // UTF-8 BOM: 일부 캘린더 앱이 한글 SUMMARY를 깨뜨리지 않도록
  const blob = new Blob(["\uFEFF" + ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `schedule_${schedule.targetName}_${schedule.year}-${pad(schedule.month)}.ics`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // iOS/Safari: click 직후 revoke하면 빈 파일이 됨
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
}

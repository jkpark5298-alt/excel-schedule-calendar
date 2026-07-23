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
  if (day.sameShiftCoworkers.length) {
    descParts.push(`같은 근무: ${day.sameShiftCoworkers.join(", ")}`);
  }
  if (day.relatedCoworkers?.names.length) {
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

/** includeRest=false면 휴무 제외 */
export function buildMonthIcs(schedule: ParsedSchedule, includeRest = false): string {
  const days = schedule.days.filter((d) => includeRest || !isRestShift(d.myShift));
  const events = days.map((d) => buildVEvent(d, schedule)).join("\r\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Work Schedule Calendar//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadMonthIcs(schedule: ParsedSchedule, includeRest = false): void {
  const ics = buildMonthIcs(schedule, includeRest);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `근무표_${schedule.targetName}_${schedule.year}-${pad(schedule.month)}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

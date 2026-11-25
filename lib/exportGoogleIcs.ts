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
  return String(day.myShift || "근무");
}

function utcStamp(d = new Date()): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function validDays(schedule: ParsedSchedule, includeRest: boolean): DaySchedule[] {
  const dim = new Date(schedule.year, schedule.month, 0).getDate();
  return (schedule.days ?? []).filter((d) => {
    const date = Number(d.date);
    if (!Number.isInteger(date) || date < 1 || date > dim) return false;
    if (!includeRest && isRestShift(d.myShift)) return false;
    return true;
  });
}

function buildVEvent(day: DaySchedule, schedule: ParsedSchedule): string {
  const y = schedule.year;
  const m = pad(schedule.month);
  const dateNum = Number(day.date);
  const d = pad(dateNum);
  const end = new Date(y, schedule.month - 1, dateNum + 1);
  const dtStart = `${y}${m}${d}`;
  const dtEnd = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}`;

  const leader = day.isLeader ? " 리더" : "";
  const summary = escapeIcsText(`${schedule.targetName} ${shiftLabel(day)}${leader}`);
  const coworkers = day.sameShiftCoworkers ?? [];
  const descBits = [shiftLabel(day) + leader];
  if (coworkers.length) descBits.push(`같은 근무: ${coworkers.join(", ")}`);
  if (day.relatedCoworkers?.names?.length) {
    descBits.push(`${day.relatedCoworkers.label}: ${day.relatedCoworkers.names.join(", ")}`);
  }
  const description = escapeIcsText(descBits.join("\n"));
  // ASCII UID only — %인코딩/한글 UID는 Google 가져오기 실패 원인
  const uid = `${dtStart}-${day.orderIndex}-${schedule.month}@excel-schedule-calendar`;

  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${utcStamp()}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
  ].join("\r\n");
}

/**
 * Google Calendar 가져오기용 최소 ICS (RFC 5545, CRLF, trailing newline).
 * METHOD/X-WR/줄접기/BOM 없음 — Google이 거부하는 요소 제거.
 */
export function buildMonthIcs(schedule: ParsedSchedule, includeRest = true): string {
  const days = validDays(schedule, includeRest);
  const events = days.map((d) => buildVEvent(d, schedule));
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ExcelScheduleCalendar//Schedule Export//EN",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
  return `${body}\r\n`;
}

export function countIcsEvents(schedule: ParsedSchedule, includeRest = true): number {
  return validDays(schedule, includeRest).length;
}

function icsFilename(schedule: ParsedSchedule): string {
  return `schedule_${schedule.year}-${pad(schedule.month)}.ics`;
}

function triggerAnchorDownload(ics: string, filename: string): void {
  // string → Blob (Uint8Array BlobPart는 TS DOM lib와 충돌)
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * iPhone: Web Share / Desktop: 파일 다운로드
 */
export async function downloadMonthIcs(
  schedule: ParsedSchedule,
  includeRest = true,
): Promise<void> {
  const count = countIcsEvents(schedule, includeRest);
  if (count === 0) {
    alert("내보낼 일정이 없습니다. 월간 일정이 있는지 확인해 주세요.");
    return;
  }

  const ics = buildMonthIcs(schedule, includeRest);
  const filename = icsFilename(schedule);
  const file = new File([ics], filename, { type: "text/calendar;charset=utf-8" });

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  // 데스크톱(Google 가져오기용)은 공유보다 직접 다운로드가 안정적
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    try {
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({
          files: [file],
          title: `${schedule.targetName} ${schedule.year}-${pad(schedule.month)}`,
          text: `근무 일정 ${count}건 ICS`,
        });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }

  triggerAnchorDownload(ics, filename);
  if (!isMobile) {
    window.setTimeout(() => {
      alert(
        `ICS ${count}건 저장됨 (${filename})\n\nGoogle Calendar → 설정 → 가져오기 → 이 파일을 선택하세요.`,
      );
    }, 300);
  }
}

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

/** RFC 5545: content lines should be folded at 75 octets */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

function shiftLabel(day: DaySchedule) {
  if (SHIFT_TIME_LABELS[day.myShift]) return SHIFT_TIME_LABELS[day.myShift];
  if (day.myShift === "C") return "C근무";
  if (day.myShift === "A") return "A근무";
  if (day.myShift === "당") return "당근무";
  if (isRestShift(day.myShift)) return "休(휴무)";
  return String(day.myShift);
}

function asciiFileSlug(name: string): string {
  const ascii = name.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "");
  return ascii || "schedule";
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
  // UID는 ASCII만 (한글 UID는 일부 캘린더가 무시)
  const uid = `ws-${schedule.year}${m}${d}-${encodeURIComponent(String(day.myShift))}@work-schedule.local`;
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
    foldLine(`SUMMARY:${summary}`),
    foldLine(`DESCRIPTION:${description}`),
    "END:VEVENT",
  ].join("\r\n");
}

/** 기본은 휴무 포함 */
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
    foldLine(`X-WR-CALNAME:${calName}`),
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function countIcsEvents(schedule: ParsedSchedule, includeRest = true): number {
  return (schedule.days ?? []).filter((d) => includeRest || !isRestShift(d.myShift)).length;
}

function makeIcsFile(schedule: ParsedSchedule, includeRest: boolean): { file: File; ics: string; count: number; filename: string } {
  const count = countIcsEvents(schedule, includeRest);
  const ics = buildMonthIcs(schedule, includeRest);
  const filename = `schedule_${asciiFileSlug(schedule.targetName)}_${schedule.year}-${pad(schedule.month)}.ics`;
  // text/plain으로도 넣으면 iOS 공유 시트에 파일이 더 잘 뜸
  const file = new File([ics], filename, { type: "text/calendar;charset=utf-8" });
  return { file, ics, count, filename };
}

function triggerAnchorDownload(blob: Blob, filename: string): void {
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
 * iPhone: Web Share로 .ics 공유(캘린더/파일에 저장)
 * Desktop: 파일 다운로드
 */
export async function downloadMonthIcs(
  schedule: ParsedSchedule,
  includeRest = true,
): Promise<void> {
  const { file, ics, count, filename } = makeIcsFile(schedule, includeRest);
  if (count === 0) {
    alert("내보낼 일정이 없습니다. 월간 일정이 있는지 확인해 주세요.");
    return;
  }

  // 1) iOS/Android: 시스템 공유 시트 (가장 안정적)
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  try {
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({
        files: [file],
        title: `${schedule.targetName} ${schedule.year}-${pad(schedule.month)} 근무표`,
        text: `근무 일정 ${count}건`,
      });
      return;
    }
  } catch (e) {
    // 사용자가 공유 취소한 경우
    if (e instanceof DOMException && e.name === "AbortError") return;
  }

  // 2) 데스크톱 / 공유 불가: Blob 다운로드
  try {
    triggerAnchorDownload(
      new Blob([ics], { type: "text/calendar;charset=utf-8" }),
      filename,
    );
    return;
  } catch {
    // fall through
  }

  // 3) 최후: data URL로 열기 (Safari가 캘린더 추가 제안)
  const dataUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
  window.open(dataUrl, "_blank", "noopener,noreferrer");
}

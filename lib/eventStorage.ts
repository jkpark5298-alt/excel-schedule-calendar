/**
 * 가져온 ICS 일정 저장 (이 기기 브라우저 localStorage)
 * 근무표 데이터와 따로 저장한다 — 근무표 저장 코드가 이 데이터를 덮어쓰지 않게.
 */
import { ImportedEvent, kstDateKey, kstTimeLabel } from "@/lib/icsImport";

export interface ImportedCalendar {
  id: string;
  name: string;
  color: string;
  /** 알림: 시작 몇 분 전 (null = 알림 없음). 종일 일정은 당일 오전 9시 */
  alarmMinutes: number | null;
  importedAt: number;
  sourceFile?: string;
  /** 표시 아이콘 (⚽ 등). 없으면 이름·제목으로 추정 */
  icon?: string;
  events: ImportedEvent[];
}

export const ICON_OPTIONS = ["⚽", "⚾", "🏀", "🏐", "⛳", "🎾", "🏃", "🎵", "✈️", "📅"];

const ICON_RULES: Array<[RegExp, string]> = [
  [/축구|풋살|K\s?리그|K-?League|EPL|프리미어리그|라리가|분데스리가|세리에|챔피언스리그|월드컵|soccer|football|\bFC\b|FC(?=[가-힣])|유나이티드|\bUnited\b/i, "⚽"],
  [/야구|KBO|MLB|baseball|타이거즈|라이온즈|트윈스|베어스|랜더스|자이언츠|이글스|다이노스|히어로즈|위즈/i, "⚾"],
  [/농구|KBL|NBA|basketball/i, "🏀"],
  [/배구|V-?리그|volleyball/i, "🏐"],
  [/골프|golf/i, "⛳"],
  [/테니스|tennis/i, "🎾"],
  [/마라톤|러닝|marathon/i, "🏃"],
  [/콘서트|공연|concert/i, "🎵"],
];

/** 캘린더 이름 → 일정 제목 순서로 보고 아이콘을 고른다 (모르면 📅) */
export function guessIcon(name: string, events: ImportedEvent[] = []): string {
  const texts = [name, ...events.slice(0, 30).map((e) => e.title)];
  for (const [re, icon] of ICON_RULES) {
    if (re.test(name)) return icon;
  }
  for (const [re, icon] of ICON_RULES) {
    const hits = texts.slice(1).filter((t) => re.test(t)).length;
    if (hits > 0 && hits >= Math.min(3, texts.length - 1) / 2) return icon;
  }
  // 종목 단서가 없어도 "A vs B" 경기 일정이 대부분이면 축구로 본다 (탭에서 바꿀 수 있음)
  const matchLike = texts.slice(1).filter((t) => /\svs?\.?\s|경기/i.test(t)).length;
  if (texts.length > 1 && matchLike >= (texts.length - 1) / 2) return "⚽";
  return "📅";
}

export function calendarIcon(cal: ImportedCalendar): string {
  return cal.icon ?? guessIcon(cal.name, cal.events);
}

const STORAGE_KEY = "work-schedule-imported-calendars";

export const CALENDAR_COLORS = ["#16a34a", "#2563eb", "#db2777", "#ea580c", "#7c3aed", "#0891b2", "#ca8a04"];

export const ALARM_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: null, label: "알림 없음" },
  { value: 10, label: "10분 전" },
  { value: 30, label: "30분 전" },
  { value: 60, label: "1시간 전" },
  { value: 120, label: "2시간 전" },
  { value: 1440, label: "하루 전" },
];

export function loadImportedCalendars(): ImportedCalendar[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ImportedCalendar[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveImportedCalendars(calendars: ImportedCalendar[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(calendars));
  } catch {
    alert("일정을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.");
  }
}

/** 같은 이름의 캘린더가 있으면 내용만 바꾸고(색·알림 유지), 없으면 새로 추가 */
export function upsertCalendar(
  calendars: ImportedCalendar[],
  name: string,
  events: ImportedEvent[],
  sourceFile?: string,
): { next: ImportedCalendar[]; replaced: boolean } {
  const existing = calendars.find((c) => c.name === name);
  if (existing) {
    const updated = { ...existing, events, importedAt: Date.now(), sourceFile };
    return { next: calendars.map((c) => (c.id === existing.id ? updated : c)), replaced: true };
  }
  const used = new Set(calendars.map((c) => c.color));
  const color = CALENDAR_COLORS.find((c) => !used.has(c)) ?? CALENDAR_COLORS[calendars.length % CALENDAR_COLORS.length];
  const cal: ImportedCalendar = {
    id: `cal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name, color, alarmMinutes: 60, importedAt: Date.now(), sourceFile, events,
    icon: guessIcon(name, events),
  };
  return { next: [...calendars, cal], replaced: false };
}

export interface CalendarEventView extends ImportedEvent {
  calendarId: string;
  calendarName: string;
  color: string;
  icon: string;
  /** 표시용 한국시간 ("19:30" 또는 "종일") */
  timeLabel: string;
}

function toView(cal: ImportedCalendar, e: ImportedEvent): CalendarEventView {
  return {
    ...e,
    calendarId: cal.id,
    calendarName: cal.name,
    color: cal.color,
    icon: calendarIcon(cal),
    timeLabel: e.allDay ? "종일" : kstTimeLabel(e.start),
  };
}

/** 해당 월의 일정을 날짜(1~31)별로 — 종일 여러 날 일정은 각 날짜에 표시 */
export function eventsByDateForMonth(
  calendars: ImportedCalendar[],
  year: number,
  month: number,
): Map<number, CalendarEventView[]> {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  const dim = new Date(year, month, 0).getDate();
  const first = `${prefix}01`;
  const last = `${prefix}${String(dim).padStart(2, "0")}`;
  const map = new Map<number, CalendarEventView[]>();
  for (const cal of calendars) {
    for (const e of cal.events) {
      if (e.lastDate < first || e.startDate > last) continue;
      for (let d = 1; d <= dim; d++) {
        const key = `${prefix}${String(d).padStart(2, "0")}`;
        if (key < e.startDate || key > e.lastDate) continue;
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(toView(cal, e));
      }
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.allDay === b.allDay ? a.start - b.start : a.allDay ? -1 : 1));
  }
  return map;
}

/** 오늘·내일(한국 날짜) 일정 중 아직 끝나지 않은 것. 여러 날 종일 일정은 해당 날짜로 한 번씩 */
export function upcomingEvents(calendars: ImportedCalendar[], now = Date.now()): Array<CalendarEventView & { day: "오늘" | "내일" }> {
  const today = kstDateKey(now);
  const tomorrow = kstDateKey(now + 24 * 3600_000);
  const out: Array<CalendarEventView & { day: "오늘" | "내일" }> = [];
  for (const cal of calendars) {
    for (const e of cal.events) {
      if (e.end <= now) continue;
      if (e.allDay) {
        const day = today >= e.startDate && today <= e.lastDate ? "오늘"
          : tomorrow >= e.startDate && tomorrow <= e.lastDate ? "내일" : null;
        if (day) out.push({ ...toView(cal, e), day });
      } else if (e.startDate === today || e.startDate === tomorrow) {
        out.push({ ...toView(cal, e), day: e.startDate === today ? "오늘" : "내일" });
      }
    }
  }
  return out.sort((a, b) => (a.day === b.day ? a.start - b.start : a.day === "오늘" ? -1 : 1));
}

/** 백업 JSON에 함께 넣고 꺼낼 때 쓰는 필드 이름 */
export const BACKUP_FIELD = "importedCalendars";

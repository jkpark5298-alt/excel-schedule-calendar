/**
 * 구독 캘린더(주소·네이버 캘린더) 받기와 자동 갱신 — 브라우저에서 /api/fetch-calendar 호출
 */
import { parseIcs } from "@/lib/icsImport";
import { CalendarSource, ImportedCalendar, upsertCalendar } from "@/lib/eventStorage";
import { readApiJson } from "@/lib/readApiJson";

type RemoteCalendar = { name: string; href: string; ics: string };

/** 자동 갱신 간격: 앱을 열 때 이보다 오래된 구독만 다시 받는다 */
export const AUTO_SYNC_AGE_MS = 3 * 60 * 60 * 1000;

async function fetchRemote(body: Record<string, string | undefined>): Promise<RemoteCalendar[]> {
  const res = await fetch("/api/fetch-calendar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await readApiJson<{ calendars?: RemoteCalendar[]; error?: string }>(res);
  if (!res.ok || !data.calendars) throw new Error(data.error || `가져오기 실패 (${res.status})`);
  return data.calendars;
}

function displayHost(url: string): string {
  try {
    return new URL(url.replace(/^webcals?:/i, "https:")).hostname;
  } catch {
    return "구독 캘린더";
  }
}

/** 구독 주소 추가 */
export async function addUrlSubscription(
  calendars: ImportedCalendar[],
  url: string,
): Promise<{ next: ImportedCalendar[]; message: string }> {
  const [remote] = await fetchRemote({ type: "url", url });
  const parsed = parseIcs(remote.ics);
  const name = parsed.calendarName || displayHost(url);
  const { next, replaced } = upsertCalendar(calendars, name, parsed.events, undefined, { kind: "url", url: url.trim() });
  return { next, message: `✅ ${name}: 일정 ${parsed.events.length}건 ${replaced ? "(갱신)" : "구독 추가"}` };
}

/** 네이버 캘린더(CalDAV) 연결 — 계정의 캘린더마다 하나씩 추가 */
export async function addCaldavAccount(
  calendars: ImportedCalendar[],
  username: string,
  password: string,
  server?: string,
): Promise<{ next: ImportedCalendar[]; message: string }> {
  const remote = await fetchRemote({ type: "caldav", username, password, server });
  let next = calendars;
  const lines: string[] = [];
  for (const cal of remote) {
    const parsed = parseIcs(cal.ics.trim() ? cal.ics : "BEGIN:VCALENDAR\r\nEND:VCALENDAR");
    const name = `네이버 · ${cal.name}`;
    const source: CalendarSource = { kind: "caldav", server, username: username.trim(), password, href: cal.href };
    const result = upsertCalendar(next, name, parsed.events, undefined, source);
    next = result.next;
    lines.push(`✅ ${name}: 일정 ${parsed.events.length}건`);
  }
  return { next, message: lines.join("\n") };
}

/**
 * 구독 캘린더 다시 받기. maxAgeMs보다 오래된 것만 (0이면 전부)
 * 네이버 계정은 계정당 한 번만 요청한다.
 */
export async function refreshSubscriptions(
  calendars: ImportedCalendar[],
  maxAgeMs = 0,
): Promise<{ next: ImportedCalendar[]; refreshed: number; failed: number }> {
  const now = Date.now();
  const due = calendars.filter((c) => c.source && (maxAgeMs === 0 || !c.lastSyncedAt || now - c.lastSyncedAt > maxAgeMs));
  if (due.length === 0) return { next: calendars, refreshed: 0, failed: 0 };

  const updates = new Map<string, Partial<ImportedCalendar>>();
  const ok = (events: ImportedCalendar["events"]) => ({ events, lastSyncedAt: Date.now(), lastSyncError: undefined });
  const fail = (e: unknown) => ({ lastSyncError: e instanceof Error ? e.message : String(e) });

  // 주소 구독
  await Promise.all(due.filter((c) => c.source?.kind === "url").map(async (c) => {
    try {
      const [remote] = await fetchRemote({ type: "url", url: (c.source as { url: string }).url });
      updates.set(c.id, ok(parseIcs(remote.ics).events));
    } catch (e) {
      updates.set(c.id, fail(e));
    }
  }));

  // 네이버(CalDAV): 계정별로 묶어서
  const accounts = new Map<string, ImportedCalendar[]>();
  for (const c of due) {
    if (c.source?.kind !== "caldav") continue;
    const key = `${c.source.server ?? ""}|${c.source.username}`;
    accounts.set(key, [...(accounts.get(key) ?? []), c]);
  }
  for (const group of accounts.values()) {
    const src = group[0].source as Extract<CalendarSource, { kind: "caldav" }>;
    try {
      const remote = await fetchRemote({ type: "caldav", username: src.username, password: src.password, server: src.server });
      for (const c of group) {
        const href = (c.source as { href: string }).href;
        const match = remote.find((r) => r.href === href);
        if (match) updates.set(c.id, ok(parseIcs(match.ics.trim() ? match.ics : "BEGIN:VCALENDAR\r\nEND:VCALENDAR").events));
        else updates.set(c.id, fail(new Error("네이버에서 이 캘린더를 찾지 못했습니다 (삭제되었을 수 있음)")));
      }
    } catch (e) {
      for (const c of group) updates.set(c.id, fail(e));
    }
  }

  let failed = 0;
  const next = calendars.map((c) => {
    const u = updates.get(c.id);
    if (!u) return c;
    if (u.lastSyncError) failed++;
    return { ...c, ...u };
  });
  return { next, refreshed: updates.size - failed, failed };
}

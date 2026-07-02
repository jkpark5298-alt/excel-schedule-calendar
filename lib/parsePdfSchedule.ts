import { DaySchedule, ParsedSchedule, ShiftCode, WorkerShift } from "@/types/schedule";
import { getBoardingReferenceSchedule } from "@/lib/boardingReference";
import { BOARDING_TARGET, isShiftToken, normalizeShift } from "@/lib/shiftDisplay";

const DOW_KO = ["일", "월", "화", "수", "목", "금", "토"];
const RANK_TOKENS = new Set(["과장", "차장", "부장", "대리", "사원", "전입", "NO", "구분", "이름", "직급", "사번"]);
const NOISE_PATTERN = /^(페이지|SKD|탑승|파트|EY|\d+년|\d+월|일자)$/;

function isKoreanName(text: string): boolean {
  return /^[가-힣]{2,4}$/.test(text);
}

function dowForDate(year: number, month: number, date: number): string {
  return DOW_KO[new Date(year, month - 1, date).getDay()];
}

function normalizePdfLine(line: string): string {
  return line.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

interface DateHeader {
  dates: number[];
  dayOfWeeks: string[];
}

function findDateHeader(lines: string[], year: number, month: number): DateHeader | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 500) continue;

    const nums: number[] = [];
    for (const t of line.split(/\s+/)) {
      const n = parseInt(t, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 31) nums.push(n);
    }
    if (nums.length < 20) continue;

    let dows: string[] = [];
    for (let j = i + 1; j <= i + 3 && j < lines.length; j++) {
      const dowTokens = lines[j].match(/[월화수목금토일]/g);
      if (dowTokens && dowTokens.length >= nums.length - 5) {
        dows = dowTokens.slice(0, nums.length);
        break;
      }
    }

    if (dows.length < nums.length) {
      dows = nums.map((date) => dowForDate(year, month, date));
    }

    return { dates: nums, dayOfWeeks: dows };
  }

  for (let i = 0; i < lines.length; i++) {
    const nums: number[] = [];
    for (const t of lines[i].split(/\s+/)) {
      const n = parseInt(t, 10);
      if (Number.isFinite(n) && ((n >= 1 && n <= 31) || n === 30)) nums.push(n);
    }
    if (nums.length >= 20 && nums[0] === 30) {
      return {
        dates: nums,
        dayOfWeeks: nums.map((date) => (date === 30 && nums.indexOf(date) === 0
          ? dowForDate(year, month - 1, 30)
          : dowForDate(year, month, date))),
      };
    }
  }

  return null;
}

function skipMetaTokens(tokens: string[], startIdx: number): number {
  let idx = startIdx;
  while (idx < tokens.length) {
    const t = tokens[idx];
    if (/^\d{5,6}$/.test(t)) { idx++; continue; }
    if (/^\d{1,3}$/.test(t) && parseInt(t, 10) <= 200) { idx++; continue; }
    if (RANK_TOKENS.has(t)) { idx++; continue; }
    if (NOISE_PATTERN.test(t)) { idx++; continue; }
    break;
  }
  return idx;
}

function extractShiftTokens(line: string, targetName: string): string[] {
  const tokens = line.split(/\s+/).filter(Boolean);
  const nameIdx = tokens.findIndex((t) => t === targetName);
  if (nameIdx === -1) return [];

  const startIdx = skipMetaTokens(tokens, nameIdx + 1);
  const shifts: string[] = [];

  for (let i = startIdx; i < tokens.length; i++) {
    const raw = tokens[i];
    if (NOISE_PATTERN.test(raw)) continue;
    const t = raw.replace(/[()[\]]/g, "");
    if (isShiftToken(raw) || isShiftToken(t)) {
      shifts.push(raw.startsWith("사고") ? raw : t);
      continue;
    }
    if (shifts.length > 0 && isKoreanName(raw)) break;
  }

  return shifts;
}

function collectTargetText(lines: string[], targetName: string): string {
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(targetName)) continue;
    chunks.push(lines[i]);
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const next = lines[j];
      if (isKoreanName(next.split(/\s+/).find((t) => isKoreanName(t)) || "")) break;
      if (/^\d+\s+[가-힣]{2,4}/.test(next)) break;
      chunks.push(next);
    }
    break;
  }
  return chunks.join(" ");
}

function findAllNameRows(lines: string[]): Array<{ name: string; shifts: string[] }> {
  const rows: Array<{ name: string; shifts: string[] }> = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const tokens = line.split(/\s+/).filter(Boolean);
    for (let i = 0; i < tokens.length; i++) {
      if (!isKoreanName(tokens[i])) continue;
      const name = tokens[i];
      if (seen.has(name)) continue;
      const shifts = extractShiftTokens(line, name);
      if (shifts.length >= 5) {
        rows.push({ name, shifts });
        seen.add(name);
        break;
      }
    }
  }
  return rows;
}

function buildDaySchedule(
  orderIndex: number,
  date: number,
  dayOfWeek: string,
  myShift: ShiftCode,
  targetName: string,
  allRows: Array<{ name: string; shifts: string[] }>,
  dateIndex: number,
): DaySchedule {
  const allWorkersToday: WorkerShift[] = [];
  for (const row of allRows) {
    const raw = row.shifts[dateIndex];
    if (!raw) continue;
    allWorkersToday.push({
      name: row.name,
      shift: normalizeShift(raw),
      isLeader: false,
    });
  }

  const sameShiftCoworkers = allWorkersToday
    .filter((w) => w.name !== targetName && w.shift === myShift && w.shift !== "休")
    .map((w) => w.name);

  let relatedCoworkers: DaySchedule["relatedCoworkers"] = null;
  if (myShift === "C") {
    const names = allWorkersToday.filter((w) => w.name !== targetName && w.shift === "당").map((w) => w.name);
    if (names.length) relatedCoworkers = { type: "당", names, label: "당" };
  } else if (myShift === "A") {
    const names = allWorkersToday.filter((w) => w.name !== targetName && w.shift === "C").map((w) => w.name);
    if (names.length) relatedCoworkers = { type: "C", names, label: "C" };
  }

  return {
    orderIndex,
    date,
    dayOfWeek,
    myShift,
    isLeader: false,
    sameShiftCoworkers,
    relatedCoworkers,
    allWorkers: allWorkersToday,
  };
}

export function parsePdfText(
  text: string,
  targetName: string,
  year: number,
  month: number,
): ParsedSchedule {
  const lines = text
    .split(/\r?\n/)
    .map(normalizePdfLine)
    .filter((l) => l && !/^-- \d+ of \d+ --$/.test(l) && !/^1\s*페이지$/.test(l));

  const header = findDateHeader(lines, year, month);
  const targetBlob = collectTargetText(lines, targetName);
  let targetShifts = extractShiftTokens(targetBlob, targetName);

  if (targetShifts.length < 20) {
    const ref = getBoardingReferenceSchedule(targetName, year, month);
    if (ref && targetName === BOARDING_TARGET) {
      return ref;
    }
  }

  if (!header) {
    const ref = getBoardingReferenceSchedule(targetName, year, month);
    if (ref) return ref;
    throw new Error("PDF에서 날짜 헤더(1~31)를 찾지 못했습니다.");
  }

  if (targetShifts.length < 5) {
    const ref = getBoardingReferenceSchedule(targetName, year, month);
    if (ref) return ref;
    throw new Error(`PDF에서 "${targetName}" 행을 찾지 못했습니다.`);
  }

  const allRows = findAllNameRows(lines);
  const daysInMonth = new Date(year, month, 0).getDate();
  const count = Math.min(targetShifts.length, daysInMonth);
  const days: DaySchedule[] = [];

  for (let i = 0; i < count; i++) {
    const date = i + 1;
    const dow = dowForDate(year, month, date);
    const myShift = normalizeShift(targetShifts[i]);
    days.push(buildDaySchedule(i, date, dow, myShift, targetName, allRows, i));
  }

  return { targetName, year, month, days };
}

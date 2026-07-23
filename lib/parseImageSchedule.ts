import { DaySchedule, ParsedSchedule, ShiftCode, WorkerShift } from "@/types/schedule";
import { normalizeShift } from "@/lib/shiftDisplay";

const DOW_KO = ["일", "월", "화", "수", "목", "금", "토"];

function dowForDate(year: number, month: number, date: number): string {
  return DOW_KO[new Date(year, month - 1, date).getDay()];
}

type VisionRow = {
  name: string;
  shifts: string[];
};

type VisionPayload = {
  rows: VisionRow[];
};

function buildDaySchedule(
  orderIndex: number,
  date: number,
  dayOfWeek: string,
  myShift: ShiftCode,
  targetName: string,
  allRows: VisionRow[],
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
    const names = allWorkersToday
      .filter((w) => w.name !== targetName && w.shift === "당")
      .map((w) => w.name);
    if (names.length) relatedCoworkers = { type: "당", names, label: "당" };
  } else if (myShift === "A") {
    const names = allWorkersToday
      .filter((w) => w.name !== targetName && w.shift === "C")
      .map((w) => w.name);
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

function extractJsonObject(text: string): VisionPayload {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("이미지에서 근무표 JSON을 추출하지 못했습니다.");
  }
  return JSON.parse(raw.slice(start, end + 1)) as VisionPayload;
}

/** OpenAI Vision으로 근무표 이미지 → ParsedSchedule */
export async function parseScheduleImage(
  buffer: Buffer,
  mimeType: string,
  targetName: string,
  year: number,
  month: number,
): Promise<ParsedSchedule> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "이미지 근무표 인식에는 OPENAI_API_KEY가 필요합니다. Vercel 프로젝트 환경변수에 추가해 주세요.",
    );
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const b64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${b64}`;

  const prompt = `당신은 한국 항공사 CSM 월간 근무표 이미지를 읽는 파서입니다.
이미지에서 직원별 일자 근무코드를 추출해 JSON만 반환하세요.

규칙:
- year=${year}, month=${month}, 이 달의 일수는 ${daysInMonth}일
- 왼쪽에 성명(한글 2~4자), 가운데 1~${daysInMonth}일 근무코드가 있습니다.
- 근무코드 예: 당, A, C, X, 휴, 休, 전, 연, 노고, 쥬, 사고(내), 교육 등
- 워터마크("1 페이지" 등)와 오른쪽 합계/하단 메모는 무시
- 각 직원 shifts 배열 길이는 ${daysInMonth} (1일부터 순서대로). 비어 있으면 ""
- 대상자 "${targetName}" 행이 반드시 포함되어야 합니다.
- 가능하면 다른 직원 행도 함께 포함 (동료 표시용)

출력 형식(JSON only):
{
  "rows": [
    { "name": "박종규", "shifts": ["A","C","당", "... ${daysInMonth}개"] }
  ]
}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`이미지 인식 API 실패 (${res.status}): ${errText.slice(0, 200)}`);
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("이미지 인식 결과가 비어 있습니다.");

  const payload = extractJsonObject(content);
  const rows = (payload.rows ?? [])
    .map((r) => ({
      name: String(r.name || "").trim(),
      shifts: Array.isArray(r.shifts)
        ? r.shifts.map((s) => String(s ?? "").trim())
        : [],
    }))
    .filter((r) => /^[가-힣]{2,4}$/.test(r.name) && r.shifts.length >= 5);

  if (!rows.length) {
    throw new Error("이미지에서 직원 근무 행을 찾지 못했습니다. 더 선명한 사진을 올려 주세요.");
  }

  const target = rows.find((r) => r.name === targetName);
  if (!target) {
    const names = rows.map((r) => r.name).join(", ");
    throw new Error(`이미지에서 "${targetName}" 행을 찾지 못했습니다. (발견: ${names})`);
  }

  const count = Math.min(daysInMonth, Math.max(target.shifts.length, daysInMonth));
  const days: DaySchedule[] = [];
  for (let i = 0; i < Math.min(count, daysInMonth); i++) {
    const date = i + 1;
    const myShift = normalizeShift(target.shifts[i] || "");
    days.push(
      buildDaySchedule(
        i,
        date,
        dowForDate(year, month, date),
        myShift,
        targetName,
        rows,
        i,
      ),
    );
  }

  for (let i = 0; i < days.length; i++) {
    if (days[i].myShift !== "당") continue;
    const nextDay = days[i + 1];
    if (!nextDay) continue;
    const nextA = nextDay.allWorkers
      .filter((w) => w.name !== targetName && w.shift === "A")
      .map((w) => w.name);
    if (nextA.length) {
      days[i].relatedCoworkers = { type: "A", names: nextA, label: "A(익일)" };
    }
  }

  return { targetName, year, month, days };
}

export function isImageFileName(name: string): boolean {
  return /\.(png|jpe?g|webp|gif|heic|heif|bmp)$/i.test(name);
}

export function sniffImageMime(name: string, fallback?: string | null): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  if (fallback && fallback.startsWith("image/")) return fallback;
  return "image/jpeg";
}

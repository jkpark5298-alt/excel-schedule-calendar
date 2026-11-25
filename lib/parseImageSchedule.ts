import { createWorker } from "tesseract.js";
import { DaySchedule, ParsedSchedule, ShiftCode, WorkerShift } from "@/types/schedule";
import { normalizeShift } from "@/lib/shiftDisplay";
import { parsePdfText } from "@/lib/parsePdfSchedule";

const DOW_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** OpenAI 이미지 인식 응답을 기다리는 최대 시간 (서버 함수 제한 120초 안쪽) */
const OPENAI_TIMEOUT_MS = 80_000;
/** 대체 OCR(Tesseract) 최대 시간 */
const OCR_TIMEOUT_MS = 30_000;

const NO_KEY_MESSAGE =
  "이미지 근무표 인식에 필요한 OpenAI 키(OPENAI_API_KEY)가 서버에 설정되어 있지 않습니다. " +
  "원본 Excel(.xlsx) 파일을 업로드하거나, Vercel 프로젝트 설정 → Environment Variables에 OPENAI_API_KEY를 등록한 뒤 다시 배포해 주세요.";

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

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

function rowsToSchedule(
  rows: VisionRow[],
  targetName: string,
  year: number,
  month: number,
): ParsedSchedule {
  const daysInMonth = new Date(year, month, 0).getDate();
  const cleaned = rows
    .map((r) => ({
      name: String(r.name || "").trim(),
      shifts: Array.isArray(r.shifts)
        ? r.shifts.map((s) => String(s ?? "").trim())
        : [],
    }))
    .filter((r) => /^[가-힣]{2,4}$/.test(r.name) && r.shifts.length >= 5);

  if (!cleaned.length) {
    throw new Error("이미지에서 직원 근무 행을 찾지 못했습니다. 더 선명한 사진을 올려 주세요.");
  }

  const target = cleaned.find((r) => r.name === targetName);
  if (!target) {
    const names = cleaned.map((r) => r.name).join(", ");
    throw new Error(`이미지에서 "${targetName}" 행을 찾지 못했습니다. (발견: ${names})`);
  }

  const days: DaySchedule[] = [];
  for (let i = 0; i < daysInMonth; i++) {
    const date = i + 1;
    const myShift = normalizeShift(target.shifts[i] || "");
    days.push(
      buildDaySchedule(
        i,
        date,
        dowForDate(year, month, date),
        myShift,
        targetName,
        cleaned,
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

async function parseWithOpenAI(
  buffer: Buffer,
  mimeType: string,
  targetName: string,
  year: number,
  month: number,
): Promise<ParsedSchedule> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("NO_OPENAI_KEY");
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
  const prompt = `당신은 한국 항공사 근무표·캘린더 이미지를 읽는 파서입니다.
이미지에서 직원별 일자 근무코드를 추출해 JSON만 반환하세요.

지원 형식:
1) CSM 월간 근무표 — 왼쪽에 성명(한글 2~4자), 가운데 1~${daysInMonth}일 근무코드 행
2) 카톡/가족 캘린더 — 상단 "YYYY년 M월", 사람별 섹션, 날짜 숫자 아래 근무코드(오프, B7, A5, P, D, P6, 교육 등)

규칙:
- year=${year}, month=${month}, 이 달의 일수는 ${daysInMonth}일
- 근무코드 예: 당, A, C, X, 휴, 休, 전, 연, 오프, 노고, 쥬, 사고(내), 교육, B7, A5, P, D, P6 등
- "오프"는 휴무로 두고 shifts에 "오프" 원문 그대로 넣어도 됨
- 워터마크("1 페이지" 등)와 오른쪽 합계(당직 등)/하단 메모·집계표는 무시
- 1일 열 앞에 전월 말일 열(예: 30, 31)이 있으면 그 열은 무시하고 1일부터 담을 것
- 셀 안의 작은 글씨(예: "유급조합")도 그 글자 그대로 넣을 것
- 각 직원 shifts 배열 길이는 ${daysInMonth} (1일부터 순서대로). 비어 있으면 ""
- 대상자 "${targetName}" 행이 반드시 포함되어야 합니다 (예: 김현숙). 영문 축약명·빈 칸 사람은 선택
- 가능하면 다른 직원 행도 함께 포함 (동료 표시용)

출력 형식(JSON only):
{
  "rows": [
    { "name": "김현숙", "shifts": ["오프","B7","D", "... ${daysInMonth}개"] }
  ]
}`;

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
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
  } catch (e) {
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new Error(
        `OPENAI_TIMEOUT: 이미지 인식이 ${OPENAI_TIMEOUT_MS / 1000}초 안에 끝나지 않았습니다.`,
      );
    }
    throw e;
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const err = new Error(`OPENAI_${res.status}:${errText.slice(0, 240)}`);
    throw err;
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("이미지 인식 결과가 비어 있습니다.");
  const payload = extractJsonObject(content);
  return rowsToSchedule(payload.rows ?? [], targetName, year, month);
}

async function parseWithTesseract(
  buffer: Buffer,
  targetName: string,
  year: number,
  month: number,
): Promise<ParsedSchedule> {
  const worker = await createWorker("kor+eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    if (!text || text.replace(/\s/g, "").length < 20) {
      throw new Error("OCR 결과가 너무 짧습니다. 더 선명한 이미지를 올려 주세요.");
    }
    return parsePdfText(text, targetName, year, month);
  } finally {
    await worker.terminate().catch(() => undefined);
  }
}

/**
 * 이미지 근무표 → ParsedSchedule
 * 1) OpenAI Vision으로 인식한다.
 * 2) 로컬 개발 환경에서만 Tesseract OCR로 한 번 더 시도한다.
 *    (Vercel에서는 Tesseract 작업 파일을 찾지 못해 응답 없이 멈추므로 쓰지 않는다)
 * 어떤 경우에도 서버 시간 제한(504) 전에 원인이 담긴 오류를 돌려준다.
 */
export async function parseScheduleImage(
  buffer: Buffer,
  mimeType: string,
  targetName: string,
  year: number,
  month: number,
): Promise<ParsedSchedule> {
  let openaiError: string;

  try {
    return await parseWithOpenAI(buffer, mimeType, targetName, year, month);
  } catch (e) {
    openaiError = e instanceof Error ? e.message : String(e);
    console.error("OpenAI 이미지 인식 실패:", openaiError);
  }

  const reason = describeOpenAiError(openaiError);
  if (process.env.VERCEL === "1") {
    throw new Error(reason);
  }

  try {
    return await withTimeout(
      parseWithTesseract(buffer, targetName, year, month),
      OCR_TIMEOUT_MS,
      `대체 OCR이 ${OCR_TIMEOUT_MS / 1000}초 안에 끝나지 않았습니다.`,
    );
  } catch (e) {
    const ocrError = e instanceof Error ? e.message : String(e);
    throw new Error(`${reason} (대체 OCR도 실패: ${ocrError})`);
  }
}

/** OpenAI 실패 원인을 사용자가 할 수 있는 조치와 함께 설명한다. */
function describeOpenAiError(message: string): string {
  if (message.includes("NO_OPENAI_KEY")) return NO_KEY_MESSAGE;
  if (message.includes("OPENAI_TIMEOUT")) {
    return "이미지 인식 시간이 너무 오래 걸렸습니다. 원본 Excel(.xlsx) 파일을 업로드하거나, 근무표 부분만 잘라서 다시 올려 주세요.";
  }
  if (/OPENAI_401|invalid_api_key|Incorrect API key/i.test(message)) {
    return "서버에 등록된 OpenAI 키가 올바르지 않습니다. Vercel의 OPENAI_API_KEY 값을 확인해 주세요. (원본 Excel 업로드는 키 없이 됩니다)";
  }
  if (/OPENAI_429|quota|billing|insufficient_quota/i.test(message)) {
    return "OpenAI 사용량(쿼터)이 초과되어 이미지 인식을 할 수 없습니다. OpenAI 결제를 확인하거나 원본 Excel(.xlsx) 파일을 업로드해 주세요.";
  }
  if (message.startsWith("OPENAI_")) {
    return `OpenAI 이미지 인식 서버 오류입니다. 잠시 후 다시 시도하거나 원본 Excel(.xlsx) 파일을 업로드해 주세요. (${message.slice(0, 120)})`;
  }
  return `이미지에서 근무표를 읽지 못했습니다: ${message} 더 선명한 이미지나 원본 Excel(.xlsx) 파일을 올려 주세요.`;
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

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { DaySchedule, ParsedSchedule, WorkerShift } from "@/types/schedule";
import { normalizeShift, WORK_SHIFTS } from "@/lib/shiftDisplay";
import { parsePdfText } from "@/lib/parsePdfSchedule";
import {
  isImageFileName,
  parseScheduleImage,
  sniffImageMime,
} from "@/lib/parseImageSchedule";

export const runtime = "nodejs";
export const maxDuration = 120;

type UploadKind = "image" | "pdf" | "excel";

function detectUploadKind(name: string, mime: string, buf: Buffer): UploadKind {
  if (buf.length >= 4 && buf.subarray(0, 4).toString("ascii") === "%PDF") return "pdf";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image";
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "image";
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image";
  }
  if (isImageFileName(name) || String(mime || "").startsWith("image/")) return "image";
  if (/\.pdf$/i.test(name) || mime === "application/pdf") return "pdf";
  return "excel";
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "object" && "richText" in v) {
    return (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join("").trim();
  }
  if (typeof v === "object" && "result" in v) {
    return String((v as ExcelJS.CellFormulaValue).result ?? "").trim();
  }
  return String(v).trim();
}

/** 날짜 헤더 셀 → 일(1~31). 숫자·숫자 문자열·날짜 값(서식 d) 모두 지원 */
function headerDateNumber(cell: ExcelJS.Cell): number | null {
  const val = cell.value;
  let n: number | null = null;
  if (typeof val === "number") n = val;
  else if (val instanceof Date) n = val.getUTCDate();
  else if (typeof val === "object" && val && "result" in val) {
    const res = (val as ExcelJS.CellFormulaValue).result;
    if (typeof res === "number") n = res;
    else if (res instanceof Date) n = res.getUTCDate();
  } else if (typeof val === "string" && /^\d+$/.test(val.trim())) n = parseInt(val.trim(), 10);
  return n != null && Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
}

function isKoreanName(text: string): boolean {
  return /^[가-힣]{2,4}$/.test(text);
}

function hasDiagonalBorder(cell: ExcelJS.Cell): boolean {
  const border = cell.style?.border as Record<string, unknown> | undefined;
  if (!border) return false;
  const diag = border["diagonal"] as Record<string, unknown> | undefined;
  if (diag && diag["style"]) return true;
  const diagDown = border["diagonalDown"] as boolean | undefined;
  const diagUp = border["diagonalUp"] as boolean | undefined;
  return !!(diagDown || diagUp);
}

function isLeaderCell(cell: ExcelJS.Cell, rawShift: string): boolean {
  if (!WORK_SHIFTS.has(rawShift)) return false;
  return hasDiagonalBorder(cell);
}

interface SheetLayout {
  dateHeaderRow: number;
  dayOfWeekRow: number;
  nameCol: number;
  firstDateCol: number;
  colInfo: Record<number, { date: number; dayOfWeek: string }>;
}

function findSheetLayout(worksheet: ExcelJS.Worksheet): SheetLayout | null {
  let dateHeaderRow = -1;
  let nameCol = -1;

  worksheet.eachRow((row, rowNum) => {
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = cellText(cell);
      // 일자/성명이 한 칸에 줄바꿈·공백으로 섞인 병합 헤더도 허용
      if (text.replace(/\s+/g, "").startsWith("일자") && dateHeaderRow === -1) {
        dateHeaderRow = rowNum;
        nameCol = colNumber;
      }
    });
  });

  // 탑승수속팀 양식: "이름"(또는 "성명") 헤더 행이 요일 행, 바로 윗줄이 날짜(1~31) 행
  if (dateHeaderRow === -1) {
    worksheet.eachRow((row, rowNum) => {
      if (dateHeaderRow !== -1 || rowNum < 2) return;
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (dateHeaderRow !== -1) return;
        const text = cellText(cell);
        if (text !== "이름" && text !== "성명") return;
        const above = worksheet.getRow(rowNum - 1);
        let numericCount = 0;
        above.eachCell({ includeEmpty: false }, (c, col) => {
          if (col > colNumber && headerDateNumber(c) != null) numericCount++;
        });
        if (numericCount >= 28) {
          dateHeaderRow = rowNum - 1;
          nameCol = colNumber;
        }
      });
    });
  }

  if (dateHeaderRow === -1 || nameCol === -1) return null;

  const dayOfWeekRow = dateHeaderRow + 1;
  const dateRow = worksheet.getRow(dateHeaderRow);
  const dayRow = worksheet.getRow(dayOfWeekRow);
  const colInfo: Record<number, { date: number; dayOfWeek: string }> = {};

  dateRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    if (colNumber <= nameCol) return;
    const dateNum = headerDateNumber(cell);
    if (dateNum == null) return;
    const dow = cellText(dayRow.getCell(colNumber));
    colInfo[colNumber] = { date: dateNum, dayOfWeek: dow };
  });

  // 전월 말일 열(예: 첫 열 31) 제거: 1일 열 이전의 열은 버린다
  const orderedCols = Object.keys(colInfo).map(Number).sort((a, b) => a - b);
  const firstDayIdx = orderedCols.findIndex((c) => colInfo[c].date === 1);
  if (firstDayIdx > 0) {
    for (const c of orderedCols.slice(0, firstDayIdx)) delete colInfo[c];
  }

  const firstDateCol = Math.min(...Object.keys(colInfo).map(Number));
  if (!Number.isFinite(firstDateCol)) return null;

  return { dateHeaderRow, dayOfWeekRow, nameCol, firstDateCol, colInfo };
}

async function parseExcel(
  arrayBuffer: ArrayBuffer,
  targetName: string,
  resultYear: number,
  resultMonth: number,
): Promise<ParsedSchedule> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(arrayBuffer as any);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("워크시트를 찾을 수 없습니다.");

  const layout = findSheetLayout(worksheet);
  if (!layout) {
    throw new Error("근무표 형식을 찾을 수 없습니다. '일자' / '성명' 헤더 행이 있는지 확인해 주세요.");
  }

  const { nameCol, colInfo } = layout;
  const dateCols = Object.keys(colInfo).map(Number);

  let targetRowNum = -1;
  const allWorkerRows: Array<{ name: string; rowNum: number }> = [];
  const foundNames: string[] = [];

  worksheet.eachRow((row, rowNum) => {
    if (rowNum <= layout.dayOfWeekRow) return;
    const name = cellText(row.getCell(nameCol));
    if (!name || !isKoreanName(name)) return;
    foundNames.push(name);
    allWorkerRows.push({ name, rowNum });
    if (name === targetName) targetRowNum = rowNum;
  });

  if (targetRowNum === -1) {
    const hint = foundNames.length > 0 ? `발견된 이름: ${foundNames.join(", ")}` : "이름 열을 찾지 못했습니다.";
    throw new Error(`"${targetName}" 행을 찾을 수 없습니다. (${hint})`);
  }

  const workersByCol: Record<number, WorkerShift[]> = {};
  for (const colNum of dateCols) {
    workersByCol[colNum] = [];
  }

  for (const { name, rowNum } of allWorkerRows) {
    const row = worksheet.getRow(rowNum);
    for (const colNum of dateCols) {
      const cell = row.getCell(colNum);
      const raw = cellText(cell);
      if (!raw) continue;
      const normalized = normalizeShift(raw);
      const leader = isLeaderCell(cell, raw);
      workersByCol[colNum].push({ name, shift: normalized, isLeader: leader });
    }
  }

  const targetRow = worksheet.getRow(targetRowNum);
  const days: DaySchedule[] = [];
  const sortedCols = [...dateCols].sort((a, b) => a - b);

  for (let orderIndex = 0; orderIndex < sortedCols.length; orderIndex++) {
    const colNum = sortedCols[orderIndex];
    const { date, dayOfWeek } = colInfo[colNum];
    const cell = targetRow.getCell(colNum);
    const raw = cellText(cell);
    const myShift = normalizeShift(raw);
    const isLeader = isLeaderCell(cell, raw);
    const allWorkersToday = workersByCol[colNum] || [];

    const sameShiftCoworkers = allWorkersToday
      .filter(
        (w) =>
          w.name !== targetName &&
          w.shift === myShift &&
          w.shift !== "休",
      )
      .map((w) => w.name);

    let relatedCoworkers: DaySchedule["relatedCoworkers"] = null;

    if (myShift === "C") {
      const dangWorkers = allWorkersToday
        .filter((w) => w.name !== targetName && w.shift === "당")
        .map((w) => w.name);
      if (dangWorkers.length > 0) {
        relatedCoworkers = { type: "당", names: dangWorkers, label: "당" };
      }
    } else if (myShift === "A") {
      const cWorkers = allWorkersToday
        .filter((w) => w.name !== targetName && w.shift === "C")
        .map((w) => w.name);
      if (cWorkers.length > 0) {
        relatedCoworkers = { type: "C", names: cWorkers, label: "C" };
      }
    }

    days.push({
      orderIndex,
      date,
      dayOfWeek,
      myShift,
      isLeader,
      sameShiftCoworkers,
      relatedCoworkers,
      allWorkers: allWorkersToday,
    });
  }

  for (let i = 0; i < days.length; i++) {
    if (days[i].myShift === "당") {
      const nextDay = days[i + 1];
      if (nextDay) {
        const nextAWorkers = nextDay.allWorkers
          .filter((w) => w.name !== targetName && w.shift === "A")
          .map((w) => w.name);
        if (nextAWorkers.length > 0) {
          days[i].relatedCoworkers = { type: "A", names: nextAWorkers, label: "A(익일)" };
        }
      }
    }
  }

  return { targetName, month: resultMonth, year: resultYear, days };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const targetName = String(formData.get("targetName") || "박종규").trim();
    const yearParam = Number(formData.get("year"));
    const monthParam = Number(formData.get("month"));

    if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

    const now = new Date();
    const resultYear = yearParam >= 2026 && yearParam <= 2029 ? yearParam : now.getFullYear();
    const resultMonth = monthParam >= 1 && monthParam <= 12 ? monthParam : now.getMonth() + 1;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const kind = detectUploadKind(file.name, file.type, buffer);

    let result: ParsedSchedule;
    if (kind === "image") {
      result = await parseScheduleImage(
        buffer,
        sniffImageMime(file.name, file.type),
        targetName,
        resultYear,
        resultMonth,
      );
    } else if (kind === "pdf") {
      const { extractLargestPdfImage, extractPdfText, isUsablePdfText } = await import(
        "@/lib/pdfExtract"
      );
      const text = await extractPdfText(buffer);

      if (isUsablePdfText(text)) {
        try {
          result = parsePdfText(text, targetName, resultYear, resultMonth);
        } catch (textErr) {
          // Text PDF that still fails (odd layout) → try embedded page image.
          const embedded = await extractLargestPdfImage(buffer);
          if (!embedded) throw textErr;
          result = await parseScheduleImage(
            embedded.buffer,
            embedded.mimeType,
            targetName,
            resultYear,
            resultMonth,
          );
        }
      } else {
        // Scanned / photo PDF (e.g. Kakao IMG_*.pdf) has almost no extractable text.
        const embedded = await extractLargestPdfImage(buffer);
        if (!embedded) {
          throw new Error(
            "스캔(이미지) PDF에서 근무표 이미지를 찾지 못했습니다. PNG/JPG로 다시 업로드해 주세요.",
          );
        }
        result = await parseScheduleImage(
          embedded.buffer,
          embedded.mimeType,
          targetName,
          resultYear,
          resultMonth,
        );
      }
    } else {
      result = await parseExcel(arrayBuffer, targetName, resultYear, resultMonth);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

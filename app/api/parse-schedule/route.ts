import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { DaySchedule, ParsedSchedule, ShiftCode, WorkerShift } from "@/types/schedule";

const REST_SHIFTS = new Set(["전", "X", "휴", "休"]);
const WORK_SHIFTS = new Set(["C", "A", "당"]);

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

function normalizeShift(raw: string | null | undefined): ShiftCode {
  if (!raw) return "休";
  const s = String(raw).trim();
  if (REST_SHIFTS.has(s)) return "休";
  return s as ShiftCode;
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
      if (text === "일자" && dateHeaderRow === -1) {
        dateHeaderRow = rowNum;
        nameCol = colNumber;
      }
    });
  });

  if (dateHeaderRow === -1 || nameCol === -1) return null;

  const dayOfWeekRow = dateHeaderRow + 1;
  const dateRow = worksheet.getRow(dateHeaderRow);
  const dayRow = worksheet.getRow(dayOfWeekRow);
  const colInfo: Record<number, { date: number; dayOfWeek: string }> = {};

  dateRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    if (colNumber <= nameCol) return;
    const val = cell.value;
    const dateNum =
      typeof val === "number"
        ? val
        : typeof val === "string" && /^\d+$/.test(val.trim())
          ? parseInt(val.trim(), 10)
          : null;
    if (dateNum == null || dateNum < 1 || dateNum > 31) return;
    const dow = cellText(dayRow.getCell(colNumber));
    colInfo[colNumber] = { date: dateNum, dayOfWeek: dow };
  });

  const firstDateCol = Math.min(...Object.keys(colInfo).map(Number));
  if (!Number.isFinite(firstDateCol)) return null;

  return { dateHeaderRow, dayOfWeekRow, nameCol, firstDateCol, colInfo };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const targetName = String(formData.get("targetName") || "박종규").trim();
    const yearParam = Number(formData.get("year"));
    const monthParam = Number(formData.get("month"));

    if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(arrayBuffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) return NextResponse.json({ error: "워크시트를 찾을 수 없습니다." }, { status: 400 });

    const layout = findSheetLayout(worksheet);
    if (!layout) {
      return NextResponse.json(
        { error: "근무표 형식을 찾을 수 없습니다. '일자' / '성명' 헤더 행이 있는지 확인해 주세요." },
        { status: 400 },
      );
    }

    const { dateHeaderRow, nameCol, colInfo } = layout;
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
      return NextResponse.json(
        {
          error: `"${targetName}" 행을 찾을 수 없습니다.`,
          hint: foundNames.length > 0 ? `발견된 이름: ${foundNames.join(", ")}` : "이름 열을 찾지 못했습니다.",
        },
        { status: 400 },
      );
    }

    // Key by column number — date 30 can appear twice (prev month + current month)
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
            w.shift !== "休" &&
            !REST_SHIFTS.has(w.shift),
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

    const now = new Date();
    const resultYear = yearParam >= 2026 && yearParam <= 2029 ? yearParam : now.getFullYear();
    const resultMonth = monthParam >= 1 && monthParam <= 12 ? monthParam : now.getMonth() + 1;
    const result: ParsedSchedule = {
      targetName,
      month: resultMonth,
      year: resultYear,
      days,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

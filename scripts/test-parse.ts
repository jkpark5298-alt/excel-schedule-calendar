/**
 * Quick parser smoke test — run: npx tsx scripts/test-parse.ts
 */
import ExcelJS from "exceljs";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

const NAMES = ["박종규", "정찬호", "최재성"];
const SHIFTS = {
  박종규: ["A", "당", "전", "C", "A", "당", "전", "C", "당", "X", "C", "A", "C", "A", "C", "노교", "휴", "X", "A", "A", "A", "X", "휴", "휴", "휴", "휴", "당", "당", "휴", "당", "휴", "C"],
  정찬호: ["휴", "전", "당", "X", "C", "A", "X", "X", "휴", "C", "휴", "당", "휴", "C", "A", "당", "당", "휴", "휴", "당", "휴", "C", "A", "C", "당", "휴", "C", "A", "C", "휴", "당", "휴"],
  최재성: ["휴", "C", "당", "X", "휴", "X", "X", "당", "당", "휴", "C", "A", "휴", "당", "당", "휴", "C", "A", "휴", "휴", "당", "휴", "C", "A", "C", "휴", "휴", "C", "A", "C", "A", "C"],
};
const DOW = ["화", "수", "목", "금", "토", "일", "월", "화", "수", "목", "금", "토", "일", "월", "화", "수", "목", "금", "토", "일", "월", "화", "수", "목", "금", "토", "일", "월", "화", "수", "목", "금"];
const DATES = [30, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];

async function main() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("근무표");

  // Legend rows (skipped by parser)
  ws.getCell("A1").value = "근무유형";

  const headerRow = 20;
  ws.getCell(headerRow, 1).value = "구분";
  ws.getCell(headerRow, 2).value = "사번";
  ws.getCell(headerRow, 3).value = "일자";
  DATES.forEach((d, i) => { ws.getCell(headerRow, 4 + i).value = d; });

  ws.getCell(headerRow + 1, 3).value = "성명";
  DOW.forEach((d, i) => { ws.getCell(headerRow + 1, 4 + i).value = d; });

  NAMES.forEach((name, idx) => {
    const row = headerRow + 2 + idx;
    ws.getCell(row, 1).value = "CSM";
    ws.getCell(row, 2).value = `100${idx}`;
    ws.getCell(row, 3).value = name;
    SHIFTS[name as keyof typeof SHIFTS].forEach((s, i) => {
      ws.getCell(row, 4 + i).value = s;
    });
  });

  const outPath = path.join(process.cwd(), "test-schedule.xlsx");
  await wb.xlsx.writeFile(outPath);
  console.log("Created:", outPath);

  // Call API
  const buf = readFileSync(outPath);
  const fd = new FormData();
  fd.append("file", new Blob([buf]), "test-schedule.xlsx");
  fd.append("targetName", "박종규");

  const res = await fetch("http://localhost:3000/api/parse-schedule", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) {
    console.error("FAIL:", data);
    process.exit(1);
  }
  console.log("OK:", data.targetName, "days:", data.days.length);
  console.log("Sample days:");
  data.days.slice(0, 5).forEach((d: { date: number; dayOfWeek: string; myShift: string; sameShiftCoworkers: string[] }) => {
    console.log(`  ${d.date}(${d.dayOfWeek}) ${d.myShift} / ${d.sameShiftCoworkers.join(", ") || "-"}`);
  });
}

main().catch(console.error);

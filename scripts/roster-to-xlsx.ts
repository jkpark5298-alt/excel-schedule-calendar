/**
 * 근무표 이미지에서 읽어 낸 내용(JSON) → 앱이 읽는 CSM 근무표 엑셀(.xlsx)
 *
 *   npx tsx scripts/roster-to-xlsx.ts <입력.json> [출력.xlsx]
 *
 * 하는 일
 *  1) 직원별 근무가 그 달 일수만큼 있는지 확인
 *  2) 근무표 하단 집계표(당·C·A·휴 인원수)와 일자별로 대조 → 다른 날을 보여 줌
 *  3) 앱 양식(일자/성명 헤더, 요일 행, 노란 칸 = 리더)으로 엑셀 작성
 *  4) 앱의 실제 업로드 API 코드(app/api/parse-schedule)로 그 엑셀을 읽어 검사
 *
 * 종료 코드: 0 = 집계표와 모두 일치·앱에서 읽힘, 2 = 집계표와 다른 날 있음, 1 = 오류
 *
 * 입력 JSON 예:
 * {
 *   "year": 2026, "month": 12, "target": "박종규",
 *   "prevMonth": { "day": 30, "shifts": { "박종규": "당" } },          // 선택: 1일 앞 전월 열
 *   "rows": [ { "id": "100117", "name": "박종규", "shifts": ["전", "...31개"], "leaders": [4, 8] } ],
 *   "totals": { "당": [2, "...31개"], "휴": [0, null, "..."] }          // 선택: 하단 집계표, 모르는 칸은 null
 * }
 */
import ExcelJS from "exceljs";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

type Input = {
  year: number;
  month: number;
  target?: string;
  group?: string;
  prevMonth?: { day: number; shifts?: Record<string, string> };
  rows: Array<{ id?: string; name: string; shifts: string[]; leaders?: number[] }>;
  totals?: Record<string, Array<number | null>>;
};

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const YELLOW = "FFFFFF00";

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

async function main() {
  const [inputPath, outArg] = process.argv.slice(2);
  if (!inputPath) fail("사용법: npx tsx scripts/roster-to-xlsx.ts <입력.json> [출력.xlsx]");

  const input = JSON.parse(readFileSync(inputPath, "utf-8")) as Input;
  const { year, month } = input;
  const daysInMonth = new Date(year, month, 0).getDate();
  const target = input.target ?? input.rows[0]?.name;

  // 1) 길이 확인
  for (const row of input.rows) {
    if (row.shifts.length !== daysInMonth) {
      fail(`${row.name}: 근무가 ${row.shifts.length}개입니다. ${month}월은 ${daysInMonth}일입니다.`);
    }
  }

  // 2) 집계표 대조
  const mismatches: string[] = [];
  for (const [code, expected] of Object.entries(input.totals ?? {})) {
    for (let d = 0; d < daysInMonth; d++) {
      const want = expected[d];
      if (want == null) continue;
      const got = input.rows.filter((r) => r.shifts[d] === code).length;
      if (got !== want) {
        const who = input.rows.filter((r) => r.shifts[d] === code).map((r) => r.name);
        mismatches.push(`${d + 1}일 ${code}: 읽음 ${got}명 / 집계표 ${want}명  (읽은 ${code}: ${who.join(", ") || "없음"})`);
      }
    }
  }

  // 3) 엑셀 작성 (앱 파서가 찾는 양식)
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`${month}월 근무표`);
  const prev = input.prevMonth;
  const firstDateCol = prev ? 5 : 4; // 전월 열이 있으면 D열, 1일은 E열
  ws.getCell(1, 1).value = "구분";
  ws.getCell(1, 2).value = "사번";
  ws.getCell(1, 3).value = "일자";
  ws.getCell(2, 3).value = "성명";
  if (prev) {
    const prevDate = new Date(year, month - 1, 0); // 전월 말일 기준 요일 계산
    prevDate.setDate(prev.day);
    ws.getCell(1, 4).value = prev.day;
    ws.getCell(2, 4).value = DOW[prevDate.getDay()];
  }
  for (let d = 1; d <= daysInMonth; d++) {
    ws.getCell(1, firstDateCol + d - 1).value = d;
    ws.getCell(2, firstDateCol + d - 1).value = DOW[new Date(year, month - 1, d).getDay()];
  }
  input.rows.forEach((row, idx) => {
    const r = 3 + idx;
    ws.getCell(r, 1).value = input.group ?? "CSM";
    ws.getCell(r, 2).value = row.id ?? "";
    ws.getCell(r, 3).value = row.name;
    if (prev?.shifts?.[row.name]) ws.getCell(r, 4).value = prev.shifts[row.name];
    row.shifts.forEach((shift, d) => {
      const cell = ws.getCell(r, firstDateCol + d);
      cell.value = shift || null;
      if (row.leaders?.includes(d + 1)) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } };
      }
    });
  });
  ws.getColumn(3).width = 9;

  const outPath = path.resolve(outArg ?? `근무표_${year}-${String(month).padStart(2, "0")}.xlsx`);
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  writeFileSync(outPath, buffer);

  // 4) 앱의 실제 업로드 처리 코드로 읽어 보기
  const { POST } = await import("../app/api/parse-schedule/route");
  const fd = new FormData();
  fd.append("file", new Blob([buffer]), path.basename(outPath));
  fd.append("targetName", target ?? "");
  fd.append("year", String(year));
  fd.append("month", String(month));
  const res = await POST(new Request("http://local/api/parse-schedule", { method: "POST", body: fd }) as never);
  const data = (await res.json()) as {
    error?: string;
    days?: Array<{
      date: number;
      dayOfWeek: string;
      myShift: string;
      isLeader: boolean;
      sameShiftCoworkers: string[];
      relatedCoworkers: { label: string; names: string[] } | null;
    }>;
  };
  if (!res.ok || !data.days) fail(`앱이 이 엑셀을 읽지 못했습니다: ${data.error ?? res.status}`);

  console.log(`📄 엑셀 저장: ${outPath}`);
  console.log(`✅ 앱 업로드 검사 통과: ${target} ${year}년 ${month}월 ${data.days.length}일, 직원 ${input.rows.length}명`);
  console.log(`   ${target} 근무 (앱에 표시될 내용, ★=리더):`);
  for (const d of data.days) {
    const parts = [];
    if (d.sameShiftCoworkers.length) parts.push(`같은 근무: ${d.sameShiftCoworkers.join(", ")}`);
    if (d.relatedCoworkers) parts.push(`${d.relatedCoworkers.label}: ${d.relatedCoworkers.names.join(", ")}`);
    console.log(
      `   ${String(d.date).padStart(2)}일(${d.dayOfWeek}) ${d.myShift}${d.isLeader ? "★" : ""}` +
        (parts.length ? `  ${parts.join(" / ")}` : ""),
    );
  }

  if (mismatches.length) {
    console.log(`\n⚠️ 집계표와 다른 날 ${mismatches.length}건 — 이미지를 다시 확인해야 합니다:`);
    for (const m of mismatches) console.log(`   - ${m}`);
    process.exit(2);
  }
  console.log(input.totals ? "✅ 집계표와 모두 일치" : "ℹ️ 집계표 대조 없음(totals 미입력)");
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));

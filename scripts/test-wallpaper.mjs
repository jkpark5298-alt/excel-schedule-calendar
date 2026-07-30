/**
 * Wallpaper export smoke test (Playwright).
 * Seeds a sample 박종규 July 2026 schedule (app UI colors), then exports PNG.
 * Usage: node scripts/test-wallpaper.mjs
 * Optional: MODE=dual|boarding node scripts/test-wallpaper.mjs
 */
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const MODE = process.env.MODE === "dual" ? "dual" : process.env.MODE === "boarding" ? "boarding" : "ops";
const OUT_DIR = path.resolve("scripts/wallpaper-test-out");
fs.mkdirSync(OUT_DIR, { recursive: true });

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

function sampleOpsJuly2026() {
  const year = 2026;
  const month = 7;
  const daysInMonth = 31;
  const shifts = [
    null, "A", "休", "당", "C", "休", "A",
    "休", "당", "C", "休", "A", "休", "당",
    "C", "休", "A", "休", "당", "C", "休",
    "A", "休", "당", "C", "休", "A", "休",
    "당", "C", "休",
  ];
  const coworkers = {
    A: ["강정형", "이영식", "최재성"],
    C: ["이영식", "김우석", "최재성"],
    당: ["김지성", "정찬호"],
  };
  const related = {
    A: { type: "C", label: "C", names: ["김우석", "임성우"] },
    C: { type: "당", label: "당", names: ["김지성", "정찬호"] },
    당: { type: "A", label: "A(익일)", names: ["김우석", "강정형"] },
  };

  const days = [];
  for (let date = 1; date <= daysInMonth; date++) {
    const shift = shifts[date - 1] ?? "休";
    const d = new Date(year, month - 1, date);
    const dayOfWeek = DOW[d.getDay()];
    const isRest = shift === "休";
    const isLeader = shift === "당" || (shift === "C" && date % 5 === 0);
    days.push({
      orderIndex: date - 1,
      date,
      dayOfWeek,
      myShift: shift,
      isLeader,
      sameShiftCoworkers: isRest ? [] : (coworkers[shift] ?? []).slice(0, isLeader ? 2 : 1),
      relatedCoworkers: isRest ? null : (related[shift] ?? null),
      allWorkers: [],
    });
  }

  return {
    targetName: "박종규",
    year,
    month,
    days,
  };
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ acceptDownloads: true });
const page = await context.newPage();

page.on("dialog", async (dialog) => {
  console.log("alert:", dialog.message().split("\n")[0]);
  await dialog.accept();
});

await page.goto(`http://localhost:3000/?t=${Date.now()}`, { waitUntil: "networkidle" });

const ops = sampleOpsJuly2026();
await page.evaluate(async (schedule) => {
  const key = `${schedule.targetName}|${schedule.year}-${String(schedule.month).padStart(2, "0")}`;
  const data = {
    targetName: schedule.targetName,
    schedules: { [key]: schedule },
    lockedKeys: [],
    savedAt: Date.now(),
  };
  localStorage.setItem("work-schedule-iphone-calendar", JSON.stringify(data));
  localStorage.setItem("work-schedule-layout-mode", "pc");

  await new Promise((resolve, reject) => {
    const req = indexedDB.open("work-schedule-calendar-idb", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("data")) db.createObjectStore("data");
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("data", "readwrite");
      tx.objectStore("data").put(data, "main");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
}, ops);

await page.reload({ waitUntil: "networkidle" });

const title = page.locator(".iphone-nav-title");
await title.waitFor();

if (MODE === "dual") {
  await page.getByRole("button", { name: "함께" }).click();
} else if (MODE === "boarding") {
  await page.getByRole("button", { name: "김현숙" }).click();
} else {
  await page.getByRole("button", { name: "박종규" }).click();
}
await page.locator(".layout-mode-btn", { hasText: /^PC$/ }).click();

const titleText = await title.textContent();
if (!titleText?.includes("2026년 7월")) {
  for (let i = 0; i < 24; i++) {
    const t = await title.textContent();
    if (t?.includes("2026년 7월")) break;
    const next = page.getByRole("button", { name: "다음 달" });
    if (await next.isDisabled()) break;
    await next.click();
    await page.waitForTimeout(80);
  }
}

const wallpaperBtn = page.getByRole("button", { name: "배경화면" });
await wallpaperBtn.waitFor({ timeout: 10000 });

const [download] = await Promise.all([
  page.waitForEvent("download", { timeout: 60000 }),
  wallpaperBtn.click(),
]);

const suggested = download.suggestedFilename();
const safeName = `${MODE}-${Date.now()}.png`;
const savePath = path.join(OUT_DIR, safeName);
await download.saveAs(savePath);
// also keep readable copy if suggested name works
if (suggested) {
  try {
    const named = path.join(OUT_DIR, suggested);
    fs.copyFileSync(savePath, named);
  } catch {
    /* ignore unicode path issues */
  }
}

const stat = fs.statSync(savePath);
console.log(JSON.stringify({
  ok: true,
  mode: MODE,
  filename: suggested,
  bytes: stat.size,
  path: savePath,
}, null, 2));

if (stat.size < 10_000) {
  console.error("PNG too small — likely failed capture");
  process.exit(1);
}

await browser.close();

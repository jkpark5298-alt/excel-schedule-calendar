/**
 * Quick ICS smoke check (no deps). Run: node scripts/check-ics.mjs
 */
function pad(n) {
  return String(n).padStart(2, "0");
}
function escapeIcsText(s) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
function utcStamp(d = new Date()) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

const schedule = {
  targetName: "박종규",
  year: 2026,
  month: 8,
  days: [
    { orderIndex: 0, date: 1, myShift: "C", isLeader: true, sameShiftCoworkers: ["홍"], relatedCoworkers: null },
    { orderIndex: 1, date: 2, myShift: "休", isLeader: false, sameShiftCoworkers: [], relatedCoworkers: null },
    { orderIndex: 2, date: 15, myShift: "당", isLeader: false, sameShiftCoworkers: [], relatedCoworkers: null },
  ],
};

const events = schedule.days.map((day) => {
  const m = pad(schedule.month);
  const d = pad(day.date);
  const end = new Date(schedule.year, schedule.month - 1, day.date + 1);
  const dtStart = `${schedule.year}${m}${d}`;
  const dtEnd = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}`;
  const uid = `${dtStart}-${day.orderIndex}-${schedule.month}@excel-schedule-calendar`;
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${utcStamp()}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${escapeIcsText(schedule.targetName + " " + day.myShift)}`,
    "END:VEVENT",
  ].join("\r\n");
});

const ics =
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ExcelScheduleCalendar//Schedule Export//EN",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n") + "\r\n";

const vevents = (ics.match(/BEGIN:VEVENT/g) || []).length;
const hasBegin = ics.startsWith("BEGIN:VCALENDAR");
const hasEnd = ics.trimEnd().endsWith("END:VCALENDAR");
const hasPctUid = /UID:[^\r\n]*%/.test(ics);
console.log({ vevents, hasBegin, hasEnd, hasPctUid, bytes: Buffer.byteLength(ics, "utf8") });
console.log("---");
console.log(ics);
if (vevents !== 3 || !hasBegin || !hasEnd || hasPctUid) process.exit(1);

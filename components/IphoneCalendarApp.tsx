"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ParsedSchedule } from "@/types/schedule";
import {
  StoredCalendarData, canGoNext, canGoPrev, clampToRange, deleteScheduleForMonth,
  listStoredMonths, monthKey, readStoredCalendar, saveScheduleForMonth, shiftMonth, writeStoredCalendar,
} from "@/lib/scheduleStorage";
import MonthNavigator from "./MonthNavigator";
import UploadModal from "./UploadModal";
import ScheduleView from "./ScheduleView";

export default function IphoneCalendarApp() {
  const now = new Date();
  const today = clampToRange(now.getFullYear(), now.getMonth() + 1);

  const [stored, setStored] = useState<StoredCalendarData>({ targetName: "박종규", schedules: {} });
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);
  const [showUpload, setShowUpload] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStored(readStoredCalendar());
    setHydrated(true);
  }, []);

  const currentKey = monthKey(year, month);
  const schedule = stored.schedules[currentKey] ?? null;
  const storedMonths = useMemo(() => listStoredMonths(stored), [stored]);

  const goPrev = useCallback(() => {
    const next = shiftMonth(year, month, -1);
    if (canGoPrev(year, month)) { setYear(next.year); setMonth(next.month); }
  }, [year, month]);

  const goNext = useCallback(() => {
    const next = shiftMonth(year, month, 1);
    if (canGoNext(year, month)) { setYear(next.year); setMonth(next.month); }
  }, [year, month]);

  const goToday = useCallback(() => {
    setYear(today.year);
    setMonth(today.month);
  }, [today.year, today.month]);

  const handleUpload = useCallback(async (file: File, uploadYear: number, uploadMonth: number, targetName: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("targetName", targetName);
    fd.append("year", String(uploadYear));
    fd.append("month", String(uploadMonth));
    const res = await fetch("/api/parse-schedule", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.hint ? `${data.error} (${data.hint})` : data.error || "파싱 오류";
      throw new Error(msg);
    }
    const parsed = data as ParsedSchedule;
    setStored((prev) => saveScheduleForMonth(prev, parsed));
    setYear(uploadYear);
    setMonth(uploadMonth);
  }, []);

  const handleScheduleUpdate = useCallback((updated: ParsedSchedule) => {
    setStored((prev) => saveScheduleForMonth(prev, updated));
  }, []);

  const handleDeleteMonth = useCallback(() => {
    if (!confirm(`${year}년 ${month}월 근무표를 삭제할까요?`)) return;
    setStored((prev) => deleteScheduleForMonth(prev, year, month));
  }, [year, month]);

  const handleTargetNameChange = useCallback((name: string) => {
    setStored((prev) => {
      const next = { ...prev, targetName: name };
      writeStoredCalendar(next);
      return next;
    });
  }, []);

  if (!hydrated) {
    return <div className="iphone-loading-screen">로딩 중...</div>;
  }

  return (
    <div className="iphone-app safe-bottom">
      <MonthNavigator
        year={year}
        month={month}
        canPrev={canGoPrev(year, month)}
        canNext={canGoNext(year, month)}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
        targetName={stored.targetName}
        onUpload={() => setShowUpload(true)}
      />

      {schedule ? (
        <ScheduleView
          schedule={schedule}
          onScheduleUpdate={handleScheduleUpdate}
          onDelete={handleDeleteMonth}
          onReupload={() => setShowUpload(true)}
        />
      ) : (
        <div className="iphone-empty">
          <div className="iphone-empty-icon">📅</div>
          <h2>{year}년 {month}월 근무표 없음</h2>
          <p>Excel 근무표를 업로드하면 주간 캘린더로 표시됩니다.</p>
          <button type="button" className="btn btn-primary" onClick={() => setShowUpload(true)}>
            Excel 업로드
          </button>
          {storedMonths.length > 0 && (
            <div className="iphone-stored-months">
              <p className="iphone-stored-label">저장된 월</p>
              <div className="iphone-stored-chips">
                {storedMonths.map((key) => {
                  const [y, m] = key.split("-");
                  return (
                    <button
                      key={key}
                      type="button"
                      className="iphone-stored-chip"
                      onClick={() => { setYear(Number(y)); setMonth(Number(m)); }}
                    >
                      {y}년 {Number(m)}월
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {showUpload && (
        <UploadModal
          targetName={stored.targetName}
          year={year}
          month={month}
          onTargetNameChange={handleTargetNameChange}
          onUpload={handleUpload}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { DaySchedule, ParsedSchedule, ShiftCode } from "@/types/schedule";
import { getBoardingReferenceSchedule } from "@/lib/boardingReference";
import { readApiJson } from "@/lib/readApiJson";
import {
  BOARDING_SHIFT_OPTIONS,
  BOARDING_TARGET,
  formatShiftDisplay,
  skdPillClass,
} from "@/lib/shiftDisplay";
import { MAX_MONTH, MAX_YEAR, MIN_MONTH, MIN_YEAR, isWithinRange } from "@/lib/scheduleStorage";
import { DOW_KO } from "@/lib/monthGrid";

interface Props {
  year: number;
  month: number;
  initialDays?: DaySchedule[];
  onSave: (schedule: ParsedSchedule) => void;
  onClose: () => void;
}

export default function BoardingSkdInputView({
  year: initYear,
  month: initMonth,
  initialDays,
  onSave,
  onClose,
}: Props) {
  const [year, setYear] = useState(initYear);
  const [month, setMonth] = useState(initMonth);
  const [days, setDays] = useState<DaySchedule[]>(initialDays ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const years: number[] = [];
  for (let y = MIN_YEAR; y <= MAX_YEAR; y++) years.push(y);

  const sortedDays = [...days].sort((a, b) => a.orderIndex - b.orderIndex);

  const loadPdfReference = useCallback(() => {
    const ref = getBoardingReferenceSchedule(BOARDING_TARGET, year, month);
    if (!ref) {
      setError(`${year}년 ${month}월 PDF 기준 데이터가 없습니다.`);
      return;
    }
    setDays(ref.days);
    setError(null);
  }, [year, month]);

  useEffect(() => {
    if ((initialDays?.length ?? 0) === 0) {
      const ref = getBoardingReferenceSchedule(BOARDING_TARGET, year, month);
      if (ref) setDays(ref.days);
    }
  }, [initialDays, year, month]);

  const processFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|pdf|png|jpe?g|webp|gif|heic|heif|bmp)$/i) && !file.type.startsWith("image/")) {
      setError("Excel(.xlsx, .xls), PDF(.pdf) 또는 이미지만 업로드할 수 있습니다.");
      return;
    }
    if (!isWithinRange(year, month)) {
      setError(`${MIN_YEAR}년 ${MIN_MONTH}월 ~ ${MAX_YEAR}년 ${MAX_MONTH}월 범위만 지원합니다.`);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("targetName", BOARDING_TARGET);
      fd.append("year", String(year));
      fd.append("month", String(month));
      const res = await fetch("/api/parse-schedule", { method: "POST", body: fd });
      const data = await readApiJson<{ error?: string; hint?: string } & ParsedSchedule>(res);
      if (!res.ok) throw new Error(data.hint ? `${data.error} (${data.hint})` : data.error || "파싱 오류");
      setDays((data as ParsedSchedule).days);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const updateShift = useCallback((orderIndex: number, shift: ShiftCode) => {
    setDays((prev) =>
      prev.map((d) =>
        d.orderIndex === orderIndex
          ? { ...d, myShift: shift, sameShiftCoworkers: [], relatedCoworkers: null, allWorkers: [] }
          : d,
      ),
    );
  }, []);

  const handleSave = () => {
    if (days.length === 0) {
      setError("근무표 데이터가 없습니다. Excel/PDF를 업로드하거나 일자를 추가해 주세요.");
      return;
    }
    onSave({
      targetName: BOARDING_TARGET,
      year,
      month,
      days: sortedDays,
    });
    onClose();
  };

  const addEmptyDay = () => {
    const maxOrder = days.reduce((m, d) => Math.max(m, d.orderIndex), -1);
    const date = Math.min(days.length + 1, 31);
    const dow = DOW_KO[new Date(year, month - 1, date).getDay()];
    setDays((prev) => [
      ...prev,
      {
        orderIndex: maxOrder + 1,
        date,
        dayOfWeek: dow,
        myShift: "休",
        isLeader: false,
        sameShiftCoworkers: [],
        relatedCoworkers: null,
        allWorkers: [],
      },
    ]);
  };

  return (
    <div className="boarding-skd-view">
      <header className="boarding-skd-header safe-top">
        <button type="button" className="iphone-nav-link" onClick={onClose}>← 닫기</button>
        <h1 className="boarding-skd-title">{BOARDING_TARGET} 탑승수속 SKD</h1>
        <button type="button" className="iphone-nav-link iphone-nav-upload" onClick={handleSave}>저장</button>
      </header>

      <div className="boarding-skd-body">
        <div className="boarding-skd-meta">
          <div className="iphone-field-row">
            <div className="iphone-field-half">
              <label className="iphone-field-label">년도</label>
              <select className="iphone-input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => <option key={y} value={y}>{y}년</option>)}
              </select>
            </div>
            <div className="iphone-field-half">
              <label className="iphone-field-label">월</label>
              <select className="iphone-input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m} disabled={!isWithinRange(year, m)}>{m}월</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div
          className="upload-zone upload-zone-modal boarding-skd-upload"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.pdf,image/*,.png,.jpg,.jpeg,.webp,.heic"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void processFile(f); e.target.value = ""; }}
          />
          <div className="text-2xl mb-1">📁</div>
          <p className="text-white font-semibold text-sm">Excel / PDF / 이미지 업로드</p>
          <p className="text-slate-500 text-xs mt-1">탑승수속팀 SKD 파일 또는 사진</p>
        </div>

        <button type="button" className="btn btn-secondary boarding-skd-ref-btn" onClick={loadPdfReference}>
          PDF 기준 {year}년 {month}월 SKD 불러오기
        </button>

        {loading && <div className="iphone-loading">파일 분석 중...</div>}
        {error && <div className="iphone-error">{error}</div>}

        <div className="boarding-skd-legend">
          <span className={`boarding-legend-pill ${skdPillClass("B7")}`}>B7(11~20)</span>
          <span className={`boarding-legend-pill ${skdPillClass("A5")}`}>A5(05:40~14:40)</span>
          <span className={`boarding-legend-pill ${skdPillClass("P")}`}>P(13:00~22:00)</span>
          <span className={`boarding-legend-pill ${skdPillClass("D")}`}>D(05:00~11:30)</span>
          <span className={`boarding-legend-pill ${skdPillClass("P6")}`}>P6(13:30~22:30)</span>
          <span className={`boarding-legend-pill ${skdPillClass("休")}`}>주/연→休</span>
        </div>

        {sortedDays.length > 0 ? (
          <div className="boarding-skd-table-wrap">
            <table className="boarding-skd-table">
              <thead>
                <tr>
                  <th>일자</th>
                  <th>요일</th>
                  <th>코드</th>
                  <th>표기 (시간)</th>
                </tr>
              </thead>
              <tbody>
                {sortedDays.map((day) => (
                  <tr key={day.orderIndex}>
                    <td>{day.date}일</td>
                    <td>{day.dayOfWeek}</td>
                    <td>
                      <select
                        className="boarding-skd-select"
                        value={day.myShift}
                        onChange={(e) => updateShift(day.orderIndex, e.target.value as ShiftCode)}
                      >
                        {BOARDING_SHIFT_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`boarding-skd-display ${skdPillClass(day.myShift)}`}>
                        {formatShiftDisplay(day.myShift)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="boarding-skd-empty">파일을 업로드하면 일자별 코드·시간 표가 표시됩니다.</p>
        )}

        <button type="button" className="btn btn-secondary boarding-skd-add-btn" onClick={addEmptyDay}>
          + 일자 수동 추가
        </button>
      </div>
    </div>
  );
}

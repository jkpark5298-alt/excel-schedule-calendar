"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ParsedSchedule, DaySchedule } from "@/types/schedule";
import { DOW_KO } from "@/lib/monthGrid";
import { isBoardingSchedule, parseLeaderDateInput } from "@/lib/shiftDisplay";
import IosMonthCalendar from "./IosMonthCalendar";
import EditDayModal from "./EditDayModal";
import DaySkdPanel from "./DaySkdPanel";
import PrintView from "./PrintView";
import PinHelpBanner from "./PinHelpBanner";

interface Props {
  schedule: ParsedSchedule;
  isLocked?: boolean;
  onToggleLock?: () => void;
  onScheduleUpdate: (schedule: ParsedSchedule) => void;
  onDelete: () => void;
  onReupload: () => void;
  onBackup: () => void;
  onRestore: (file: File) => void;
  onBoardingInput?: () => void;
}

const ZOOM_STEPS = [0.75, 0.85, 1, 1.15, 1.3];

export default function ScheduleView({
  schedule, isLocked = false, onToggleLock, onScheduleUpdate, onDelete, onReupload, onBackup, onRestore, onBoardingInput,
}: Props) {
  const [days, setDays] = useState<DaySchedule[]>(schedule.days);
  const [selectedDay, setSelectedDay] = useState<DaySchedule | null>(null);
  const [editDay, setEditDay] = useState<DaySchedule | null>(null);
  const [addDay, setAddDay] = useState<{ date: number; dayOfWeek: string } | null>(null);
  const [showPinHelp, setShowPinHelp] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [leaderDateInput, setLeaderDateInput] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDays(schedule.days);
    setSelectedDay(null);
  }, [schedule]);

  const persist = useCallback((nextDays: DaySchedule[]) => {
    const sorted = [...nextDays].sort((a, b) => a.orderIndex - b.orderIndex);
    setDays(sorted);
    onScheduleUpdate({ ...schedule, days: sorted });
  }, [schedule, onScheduleUpdate]);

  const handleSaveEdit = useCallback((updated: DaySchedule) => {
    persist(days.map(d => d.orderIndex === updated.orderIndex ? updated : d));
    setSelectedDay(updated);
    setEditDay(null);
  }, [days, persist]);

  const handleAddSave = useCallback((newDay: DaySchedule) => {
    const maxOrder = days.reduce((m, d) => Math.max(m, d.orderIndex), -1);
    const entry = { ...newDay, orderIndex: maxOrder + 1 };
    persist([...days, entry]);
    setSelectedDay(entry);
    setAddDay(null);
  }, [days, persist]);

  const handleDeleteDay = useCallback((orderIndex: number) => {
    if (!confirm("이 날짜 일정을 삭제할까요?")) return;
    persist(days.filter(d => d.orderIndex !== orderIndex));
    setSelectedDay(null);
  }, [days, persist]);

  const handleSelect = useCallback((day: DaySchedule | null) => {
    setSelectedDay(day);
  }, []);

  const handleEmptyDayClick = useCallback((date: number, dayOfWeek: string) => {
    if (isLocked) return;
    setAddDay({ date, dayOfWeek });
  }, [isLocked]);

  const handleApplyLeaderDate = useCallback(() => {
    const dates = parseLeaderDateInput(leaderDateInput);
    if (dates.length === 0) {
      alert("1~31 사이 날짜를 쉼표로 입력해 주세요. (예: 1,3,5)");
      return;
    }
    const missing = dates.filter((d) => !days.some((day) => day.date === d));
    if (missing.length > 0) {
      alert(`${missing.join(", ")}일 일정이 없습니다. 먼저 일정을 추가하거나 업로드해 주세요.`);
      return;
    }
    const leaderIndexes = new Set(
      dates.map((d) => days.find((day) => day.date === d)!.orderIndex),
    );
    const nextDays = days.map((day) => ({
      ...day,
      isLeader: leaderIndexes.has(day.orderIndex),
    }));
    persist(nextDays);
    setLeaderDateInput("");
    const lastDate = dates[dates.length - 1];
    const lastTarget = nextDays.find((day) => day.date === lastDate);
    if (lastTarget) setSelectedDay(lastTarget);
  }, [days, leaderDateInput, persist]);

  const handlePDF = async () => {
    setIsPrinting(true);
    await new Promise(r => setTimeout(r, 100));
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");
      const el = printRef.current;
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      const pageH = pdf.internal.pageSize.getHeight();
      let yPos = 0;
      while (yPos < pdfH) {
        if (yPos > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -yPos, pdfW, pdfH);
        yPos += pageH;
      }
      pdf.save(`근무표_${schedule.targetName}_${schedule.year}년${schedule.month}월.pdf`);
    } finally {
      setIsPrinting(false);
    }
  };

  const zoom = ZOOM_STEPS[zoomIndex];
  const boardingMode = isBoardingSchedule(days);

  return (
    <div className={`iphone-schedule-body ${selectedDay ? "with-panel" : ""}`}>
      <div className="iphone-saved-badge">
        <span className={`iphone-saved-dot ${isLocked ? "locked" : ""}`} />
        {schedule.year}년 {schedule.month}월 {isLocked ? "확정됨" : "저장됨"} · 날짜 선택 시 SKD 표시
        <button type="button" className="iphone-saved-help" onClick={() => setShowPinHelp(true)}>고정 방법</button>
      </div>

      <div className="iphone-toolbar iphone-toolbar-compact">
        <div className="iphone-toolbar-btns">
          {onToggleLock && (
            <button
              type="button"
              className={`btn btn-sm ${isLocked ? "btn-secondary" : "btn-primary"}`}
              onClick={onToggleLock}
            >
              {isLocked ? "🔓 확정 해제" : "📌 확정"}
            </button>
          )}
          <button type="button" className="btn btn-sm btn-secondary" onClick={onBackup}>백업</button>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => restoreInputRef.current?.click()}>복원</button>
          <button type="button" className="btn btn-sm btn-pdf" onClick={handlePDF}>PDF</button>
          <button type="button" className="btn btn-sm btn-secondary" onClick={onReupload} disabled={isLocked}>
            {boardingMode ? "SKD 수정" : "재업로드"}
          </button>
          {onBoardingInput && (
            <button type="button" className="btn btn-sm btn-primary" onClick={onBoardingInput} disabled={isLocked}>SKD 입력</button>
          )}
          <button type="button" className="btn btn-sm btn-danger" onClick={onDelete} disabled={isLocked}>삭제</button>
        </div>
        <input ref={restoreInputRef} type="file" accept=".json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onRestore(f); e.target.value = ""; }} />
      </div>

      {!boardingMode && (
        <div className="iphone-toolbar iphone-toolbar-compact">
          <div className="iphone-toolbar-btns">
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setZoomIndex(i => Math.max(0, i - 1))} disabled={zoomIndex === 0}>−</button>
            <span className="iphone-zoom-label">{Math.round(zoom * 100)}%</span>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setZoomIndex(i => Math.min(ZOOM_STEPS.length - 1, i + 1))} disabled={zoomIndex === ZOOM_STEPS.length - 1}>+</button>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => {
              if (isLocked) return;
              const now = new Date();
              const inMonth = now.getFullYear() === schedule.year && now.getMonth() + 1 === schedule.month;
              const date = inMonth ? now.getDate() : 1;
              const dow = DOW_KO[new Date(schedule.year, schedule.month - 1, date).getDay()];
              setAddDay({ date, dayOfWeek: dow });
            }} disabled={isLocked}>일정 추가</button>
          </div>
          <div className="iphone-leader-row">
            <label className="iphone-leader-label">리더 날짜</label>
            <input
              type="text"
              className="iphone-leader-input"
              placeholder="1,3,5"
              value={leaderDateInput}
              onChange={(e) => setLeaderDateInput(e.target.value)}
            />
            <button type="button" className="btn btn-sm btn-secondary" onClick={handleApplyLeaderDate} disabled={isLocked}>👍 지정</button>
          </div>
        </div>
      )}

      {boardingMode && (
        <div className="iphone-toolbar iphone-toolbar-compact">
          <div className="iphone-toolbar-btns">
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setZoomIndex(i => Math.max(0, i - 1))} disabled={zoomIndex === 0}>−</button>
            <span className="iphone-zoom-label">{Math.round(zoom * 100)}%</span>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setZoomIndex(i => Math.min(ZOOM_STEPS.length - 1, i + 1))} disabled={zoomIndex === ZOOM_STEPS.length - 1}>+</button>
          </div>
        </div>
      )}

      <IosMonthCalendar
        year={schedule.year}
        month={schedule.month}
        days={days}
        selected={selectedDay}
        zoom={zoom}
        onSelect={(day) => handleSelect(day)}
        onEmptyDayClick={handleEmptyDayClick}
      />

      {selectedDay && !editDay && (
        <DaySkdPanel
          day={selectedDay}
          year={schedule.year}
          month={schedule.month}
          boardingMode={boardingMode}
          allDays={days}
          onEdit={() => { if (!isLocked) setEditDay(selectedDay); }}
          onDelete={() => { if (!isLocked) handleDeleteDay(selectedDay.orderIndex); }}
          onClose={() => setSelectedDay(null)}
        />
      )}
      {editDay && (
        <EditDayModal mode="edit" day={editDay} year={schedule.year} month={schedule.month} onSave={handleSaveEdit} onClose={() => setEditDay(null)} />
      )}
      {addDay && (
        <EditDayModal
          mode="add"
          year={schedule.year}
          month={schedule.month}
          day={{
            orderIndex: -1,
            date: addDay.date,
            dayOfWeek: addDay.dayOfWeek,
            myShift: "C",
            isLeader: false,
            sameShiftCoworkers: [],
            relatedCoworkers: null,
            allWorkers: [],
          }}
          onSave={handleAddSave}
          onClose={() => setAddDay(null)}
        />
      )}
      {showPinHelp && <PinHelpBanner onClose={() => setShowPinHelp(false)} />}

      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <PrintView ref={printRef} schedule={{ ...schedule, days }} days={days} />
      </div>

      {isPrinting && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 text-white">
            <div className="text-3xl mb-2 text-center">⏳</div>
            <p>PDF 생성 중...</p>
          </div>
        </div>
      )}
    </div>
  );
}

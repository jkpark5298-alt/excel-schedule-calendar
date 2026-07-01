"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ParsedSchedule, DaySchedule } from "@/types/schedule";
import IosMonthCalendar from "./IosMonthCalendar";
import EditDayModal from "./EditDayModal";
import DaySkdPanel from "./DaySkdPanel";
import PrintView from "./PrintView";
import PinHelpBanner from "./PinHelpBanner";

interface Props {
  schedule: ParsedSchedule;
  onScheduleUpdate: (schedule: ParsedSchedule) => void;
  onDelete: () => void;
  onReupload: () => void;
  onBackup: () => void;
  onRestore: (file: File) => void;
}

export default function ScheduleView({
  schedule, onScheduleUpdate, onDelete, onReupload, onBackup, onRestore,
}: Props) {
  const [days, setDays] = useState<DaySchedule[]>(schedule.days);
  const [selectedDay, setSelectedDay] = useState<DaySchedule | null>(null);
  const [editDay, setEditDay] = useState<DaySchedule | null>(null);
  const [showPinHelp, setShowPinHelp] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDays(schedule.days);
    setSelectedDay(null);
  }, [schedule]);

  const persist = useCallback((nextDays: DaySchedule[]) => {
    setDays(nextDays);
    onScheduleUpdate({ ...schedule, days: nextDays });
  }, [schedule, onScheduleUpdate]);

  const handleSaveEdit = useCallback((updated: DaySchedule) => {
    persist(days.map(d => d.orderIndex === updated.orderIndex ? updated : d));
    setSelectedDay(updated);
    setEditDay(null);
  }, [days, persist]);

  const handleSelect = useCallback((day: DaySchedule | null) => {
    setSelectedDay(day);
  }, []);

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

  return (
    <div className={`iphone-schedule-body ${selectedDay ? "with-panel" : ""}`}>
      <div className="iphone-saved-badge">
        <span className="iphone-saved-dot" />
        {schedule.year}년 {schedule.month}월 저장됨 · 날짜 선택 시 SKD 표시
        <button type="button" className="iphone-saved-help" onClick={() => setShowPinHelp(true)}>고정 방법</button>
      </div>

      <div className="iphone-toolbar iphone-toolbar-compact">
        <div className="iphone-toolbar-btns">
          <button type="button" className="btn btn-sm btn-secondary" onClick={onBackup}>백업</button>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => restoreInputRef.current?.click()}>복원</button>
          <button type="button" className="btn btn-sm btn-pdf" onClick={handlePDF}>PDF</button>
          <button type="button" className="btn btn-sm btn-secondary" onClick={onReupload}>재업로드</button>
          <button type="button" className="btn btn-sm btn-danger" onClick={onDelete}>삭제</button>
        </div>
        <input ref={restoreInputRef} type="file" accept=".json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onRestore(f); e.target.value = ""; }} />
      </div>

      <IosMonthCalendar
        year={schedule.year}
        month={schedule.month}
        days={days}
        selected={selectedDay}
        onSelect={(day) => handleSelect(day)}
      />

      {selectedDay && !editDay && (
        <DaySkdPanel
          day={selectedDay}
          year={schedule.year}
          month={schedule.month}
          onEdit={() => setEditDay(selectedDay)}
          onClose={() => setSelectedDay(null)}
        />
      )}
      {editDay && (
        <EditDayModal day={editDay} onSave={handleSaveEdit} onClose={() => setEditDay(null)} />
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

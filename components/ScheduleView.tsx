"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ParsedSchedule, DaySchedule } from "@/types/schedule";
import { DOW_KO } from "@/lib/monthGrid";
import { BOARDING_TARGET, applyLeaderDates, formatLeaderDateInput, parseLeaderDateInput } from "@/lib/shiftDisplay";
import IosMonthCalendar from "./IosMonthCalendar";
import EditDayModal from "./EditDayModal";
import DaySkdPanel from "./DaySkdPanel";
import PrintView from "./PrintView";
import WallpaperView from "./WallpaperView";
import PinHelpBanner from "./PinHelpBanner";
import LeaderDateBar from "./LeaderDateBar";
import type { PdfExportActions } from "./MonthNavigator";
import type { ToolPanel } from "./IphoneToolTabs";
import { downloadMonthIcs } from "@/lib/exportGoogleIcs";
import { exportElementAsPdf } from "@/lib/exportPdf";
import { exportElementAsWallpaper } from "@/lib/exportWallpaper";
import { ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, clampZoom } from "@/lib/usePinchZoom";
import { loadShowBoardingOnOps, saveShowBoardingOnOps } from "@/lib/overlayPref";

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
  onPdfExportReady?: (actions: PdfExportActions | null) => void;
  overlaySchedule?: ParsedSchedule | null;
  overlayName?: string;
  toolPanel?: ToolPanel;
}

export default function ScheduleView({
  schedule, isLocked = false, onToggleLock, onScheduleUpdate, onDelete, onReupload, onBackup, onRestore, onBoardingInput,
  onPdfExportReady, overlaySchedule = null, overlayName, toolPanel = null,
}: Props) {
  const [days, setDays] = useState<DaySchedule[]>(schedule.days);
  const [selectedDay, setSelectedDay] = useState<DaySchedule | null>(null);
  const [editDay, setEditDay] = useState<DaySchedule | null>(null);
  const [addDay, setAddDay] = useState<{ date: number; dayOfWeek: string } | null>(null);
  const [showPinHelp, setShowPinHelp] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isWallpaper, setIsWallpaper] = useState(false);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [leaderDateInput, setLeaderDateInput] = useState("");
  const [leaderPickMode, setLeaderPickMode] = useState(false);
  const [showBoardingOverlay, setShowBoardingOverlay] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const wallpaperRef = useRef<HTMLDivElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDays(schedule.days);
    setSelectedDay((prev) => {
      if (!prev) return null;
      return schedule.days.find((d) => d.orderIndex === prev.orderIndex) ?? null;
    });
  }, [schedule]);

  useEffect(() => {
    setLeaderDateInput(formatLeaderDateInput(schedule.days));
    setLeaderPickMode(false);
  }, [schedule.year, schedule.month, schedule.targetName]);

  useEffect(() => {
    setShowBoardingOverlay(loadShowBoardingOnOps());
  }, []);

  useEffect(() => {
    if (toolPanel !== "leader") setLeaderPickMode(false);
  }, [toolPanel]);

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
    const { nextDays, applied, missing } = applyLeaderDates(days, dates);
    if (applied.length === 0) {
      alert(`${missing.join(", ")}일 일정이 없습니다. 먼저 일정을 추가하거나 업로드해 주세요.`);
      return;
    }
    persist(nextDays);
    setLeaderDateInput(applied.join(","));
    const lastDate = applied[applied.length - 1];
    const lastTarget = nextDays.find((day) => Number(day.date) === lastDate);
    if (lastTarget) setSelectedDay(lastTarget);
    if (missing.length > 0) {
      alert(`${applied.join(", ")}일 리더 지정됨. ${missing.join(", ")}일은 일정이 없어 건너뛰었습니다.`);
    }
  }, [days, leaderDateInput, persist]);

  const handleToggleLeader = useCallback((day: DaySchedule) => {
    if (isLocked) {
      alert("확정된 달입니다. 확정 해제 후 리더 날짜를 지정할 수 있습니다.");
      return;
    }
    const nextDays = days.map((d) =>
      d.orderIndex === day.orderIndex ? { ...d, isLeader: !d.isLeader } : d,
    );
    persist(nextDays);
    setLeaderDateInput(formatLeaderDateInput(nextDays));
  }, [days, isLocked, persist]);

  const handlePDF = useCallback(async (mode: "download" | "share" | "auto" = "auto") => {
    setIsPrinting(true);
    await new Promise((r) => setTimeout(r, 100));
    try {
      const el = printRef.current;
      if (!el) return;
      const filename = `근무표_${schedule.targetName}_${schedule.year}년${schedule.month}월.pdf`;
      await exportElementAsPdf(el, filename, {
        mode,
        title: `${schedule.targetName} ${schedule.year}년 ${schedule.month}월 근무표`,
        text: `${schedule.targetName} 근무표 PDF`,
      });
    } catch (e) {
      console.error(e);
      alert("PDF 생성에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsPrinting(false);
    }
  }, [schedule.targetName, schedule.year, schedule.month]);

  useEffect(() => {
    if (!onPdfExportReady) return;
    onPdfExportReady({
      disabled: isPrinting || isWallpaper,
      onDownload: () => { void handlePDF("download"); },
      onShare: () => { void handlePDF("share"); },
    });
    return () => onPdfExportReady(null);
  }, [onPdfExportReady, handlePDF, isPrinting, isWallpaper]);

  const handleWallpaper = async () => {
    setIsWallpaper(true);
    await new Promise((r) => setTimeout(r, 350));
    try {
      const el = wallpaperRef.current;
      if (!el) return;
      const filename = `배경화면_${schedule.targetName}_${schedule.year}년${schedule.month}월_1600x900.png`;
      await exportElementAsWallpaper(el, filename);
      window.setTimeout(() => {
        alert(
          `배경화면 PNG가 저장되었습니다.\n(${filename})\n\nWindows: 설정 → 개인 설정 → 배경 에서 이미지를 지정하세요.`,
        );
      }, 300);
    } catch (e) {
      console.error(e);
      alert("배경화면 생성에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsWallpaper(false);
    }
  };

  const boardingMode = schedule.targetName === BOARDING_TARGET;
  const overlayEnabled = !boardingMode && showBoardingOverlay;
  const overlayDays = overlayEnabled ? (overlaySchedule?.days ?? []) : [];
  const overlayDayForSelected = selectedDay && overlayDays.length
    ? overlayDays.find((d) => Number(d.date) === Number(selectedDay.date)) ?? null
    : null;

  const toggleBoardingOverlay = () => {
    setShowBoardingOverlay((prev) => {
      const next = !prev;
      saveShowBoardingOnOps(next);
      return next;
    });
  };

  const zoomOut = () => setZoom((z) => clampZoom(z - ZOOM_STEP));
  const zoomIn = () => setZoom((z) => clampZoom(z + ZOOM_STEP));

  return (
    <div className={`iphone-schedule-body ${selectedDay ? "with-panel" : ""}`}>
      {!boardingMode && toolPanel === "leader" && (
        <LeaderDateBar
          value={leaderDateInput}
          pickMode={leaderPickMode}
          locked={isLocked}
          onChange={setLeaderDateInput}
          onApply={handleApplyLeaderDate}
          onTogglePickMode={() => setLeaderPickMode((v) => !v)}
        />
      )}

      {toolPanel === "manage2" && (
      <div className="iphone-toolbar iphone-toolbar-compact iphone-manage-panel">
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
          <button type="button" className="btn btn-sm btn-secondary" onClick={onBackup} title="전체 캘린더 JSON을 PC에 저장">PC 저장</button>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => restoreInputRef.current?.click()}>복원</button>
          <button type="button" className="btn btn-sm btn-secondary" disabled={isPrinting || isWallpaper} onClick={() => { void handleWallpaper(); }} title="PC 1600×900 PNG · TODAY 표시">배경화면</button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => {
              void downloadMonthIcs({ ...schedule, days });
            }}
          >
            ICS
          </button>
          <button type="button" className="btn btn-sm btn-secondary" onClick={onReupload} disabled={isLocked}>
            {boardingMode ? "SKD 수정" : "재업로드"}
          </button>
          {onBoardingInput && (
            <button type="button" className="btn btn-sm btn-primary" onClick={onBoardingInput} disabled={isLocked}>SKD 입력</button>
          )}
          <button type="button" className="btn btn-sm btn-secondary" onClick={zoomOut} disabled={zoom <= ZOOM_MIN}>−</button>
          <span className="iphone-zoom-label">{Math.round(zoom * 100)}%</span>
          <button type="button" className="btn btn-sm btn-secondary" onClick={zoomIn} disabled={zoom >= ZOOM_MAX}>+</button>
          <button type="button" className="iphone-saved-help" onClick={() => setShowPinHelp(true)}>고정 방법</button>
        </div>
      </div>
      )}
      <input ref={restoreInputRef} type="file" accept=".json" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onRestore(f); e.target.value = ""; }} />

      {!boardingMode && overlayName && (
        <button
          type="button"
          className={`btn btn-sm iphone-overlay-toggle ${showBoardingOverlay ? "btn-primary" : "btn-secondary"}`}
          onClick={toggleBoardingOverlay}
        >
          {showBoardingOverlay ? `${overlayName} 같이 보기 켜짐` : `${overlayName} 같이 보기`}
        </button>
      )}
      {!boardingMode && showBoardingOverlay && !overlaySchedule && overlayName && (
        <p className="iphone-overlay-hint">{overlayName} 탭에서 먼저 근무표를 업로드해 주세요.</p>
      )}

      {!boardingMode && (
        <div className="iphone-toolbar iphone-toolbar-compact iphone-toolbar-ops-edit">
          <div className="iphone-toolbar-btns iphone-toolbar-btns-inline">
            <button type="button" className="btn btn-sm btn-danger" onClick={onDelete} disabled={isLocked}>삭제</button>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => {
              if (isLocked) return;
              const now = new Date();
              const inMonth = now.getFullYear() === schedule.year && now.getMonth() + 1 === schedule.month;
              const date = inMonth ? now.getDate() : 1;
              const dow = DOW_KO[new Date(schedule.year, schedule.month - 1, date).getDay()];
              setAddDay({ date, dayOfWeek: dow });
            }} disabled={isLocked}>일정 추가</button>
          </div>
        </div>
      )}

      {boardingMode && (
        <div className="iphone-toolbar iphone-toolbar-compact">
          <div className="iphone-toolbar-btns">
            <button type="button" className="btn btn-sm btn-danger" onClick={onDelete} disabled={isLocked}>삭제</button>
          </div>
        </div>
      )}

      <IosMonthCalendar
        year={schedule.year}
        month={schedule.month}
        days={days}
        selected={selectedDay}
        zoom={zoom}
        onZoomChange={setZoom}
        onSelect={(day) => handleSelect(day)}
        onEmptyDayClick={handleEmptyDayClick}
        showOpsStats={!boardingMode}
        leaderPickMode={!boardingMode && leaderPickMode}
        onToggleLeader={!boardingMode ? handleToggleLeader : undefined}
        boardingDays={overlayDays}
        showBoardingOverlay={overlayEnabled && overlayDays.length > 0}
      />

      {selectedDay && !editDay && (
        <DaySkdPanel
          day={selectedDay}
          year={schedule.year}
          month={schedule.month}
          boardingMode={boardingMode}
          allDays={days}
          overlayBoardingDay={overlayDayForSelected}
          overlayBoardingName={overlayEnabled ? overlayName : undefined}
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

      <div
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
        aria-hidden
      >
        <PrintView ref={printRef} schedule={{ ...schedule, days }} days={days} />
        {isWallpaper && (
          <WallpaperView ref={wallpaperRef} schedule={{ ...schedule, days }} days={days} />
        )}
      </div>

      {(isPrinting || isWallpaper) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 text-white">
            <div className="text-3xl mb-2 text-center">⏳</div>
            <p>{isWallpaper ? "배경화면 생성 중..." : "PDF 생성 중..."}</p>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import { DaySchedule, ParsedSchedule } from "@/types/schedule";
import { BOARDING_SHIFT_OPTIONS } from "@/lib/shiftDisplay";
import MergedMonthCalendar from "./MergedMonthCalendar";
import MergedDaySkdPanel from "./MergedDaySkdPanel";
import EditDayModal from "./EditDayModal";
import DualPrintView from "./DualPrintView";
import { downloadMonthIcs } from "@/lib/exportGoogleIcs";
import { exportElementAsPdf } from "@/lib/exportPdf";
import { ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, clampZoom } from "@/lib/usePinchZoom";

export interface MergedSelectedDay {
  date: number;
  dayOfWeek: string;
  opsDay: DaySchedule | null;
  boardingDay: DaySchedule | null;
}

interface Props {
  year: number;
  month: number;
  opsTarget: string;
  boardingTarget: string;
  opsSchedule: ParsedSchedule | null;
  boardingSchedule: ParsedSchedule | null;
  opsLocked?: boolean;
  boardingLocked?: boolean;
  onOpsScheduleUpdate: (schedule: ParsedSchedule) => void;
  onBoardingScheduleUpdate: (schedule: ParsedSchedule) => void;
  onBackup?: () => void;
}

export default function DualScheduleView({
  year,
  month,
  opsTarget,
  boardingTarget,
  opsSchedule,
  boardingSchedule,
  opsLocked = false,
  boardingLocked = false,
  onOpsScheduleUpdate,
  onBoardingScheduleUpdate,
  onBackup,
}: Props) {
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [selected, setSelected] = useState<MergedSelectedDay | null>(null);
  const [editState, setEditState] = useState<{ target: "ops" | "boarding"; day: DaySchedule } | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const hasAny = !!opsSchedule || !!boardingSchedule;
  const opsDays = opsSchedule?.days ?? [];
  const boardingDays = boardingSchedule?.days ?? [];
  const zoomOut = () => setZoom((z) => clampZoom(z - ZOOM_STEP));
  const zoomIn = () => setZoom((z) => clampZoom(z + ZOOM_STEP));

  const pdfFilename = `함께근무표_${opsTarget}_${boardingTarget}_${year}년${month}월.pdf`;
  const pdfTitle = `함께 ${year}년 ${month}월 · ${opsTarget}+${boardingTarget}`;

  const handlePdf = useCallback(async (mode: "download" | "share") => {
    if (!hasAny) {
      alert("내보낼 함께 근무표가 없습니다. 먼저 일정을 업로드해 주세요.");
      return;
    }
    setIsPrinting(true);
    await new Promise((r) => setTimeout(r, 100));
    try {
      const el = printRef.current;
      if (!el) return;
      await exportElementAsPdf(el, pdfFilename, {
        mode,
        title: pdfTitle,
        text: `${opsTarget} + ${boardingTarget} 함께 근무표 PDF`,
      });
    } catch (e) {
      console.error(e);
      alert("PDF 생성에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsPrinting(false);
    }
  }, [hasAny, pdfFilename, pdfTitle, opsTarget, boardingTarget]);

  const refreshSelected = useCallback((nextOps: DaySchedule[], nextBoarding: DaySchedule[]) => {
    setSelected((prev) => {
      if (!prev) return null;
      const opsDay = nextOps.find((d) => d.date === prev.date) ?? null;
      const boardingDay = nextBoarding.find((d) => d.date === prev.date) ?? null;
      if (!opsDay && !boardingDay) return null;
      return { ...prev, opsDay, boardingDay };
    });
  }, []);

  const persistOps = useCallback((nextDays: DaySchedule[]) => {
    if (!opsSchedule) return;
    const sorted = [...nextDays].sort((a, b) => a.orderIndex - b.orderIndex);
    onOpsScheduleUpdate({ ...opsSchedule, days: sorted });
    refreshSelected(sorted, boardingDays);
  }, [opsSchedule, boardingDays, onOpsScheduleUpdate, refreshSelected]);

  const persistBoarding = useCallback((nextDays: DaySchedule[]) => {
    if (!boardingSchedule) return;
    const sorted = [...nextDays].sort((a, b) => a.orderIndex - b.orderIndex);
    onBoardingScheduleUpdate({ ...boardingSchedule, days: sorted });
    refreshSelected(opsDays, sorted);
  }, [boardingSchedule, opsDays, onBoardingScheduleUpdate, refreshSelected]);

  const handleDeleteOps = useCallback(() => {
    if (!selected?.opsDay || opsLocked || !opsSchedule) return;
    if (!confirm(`${selected.date}일 ${opsTarget} 일정을 삭제할까요?`)) return;
    persistOps(opsDays.filter((d) => d.orderIndex !== selected.opsDay!.orderIndex));
  }, [selected, opsLocked, opsSchedule, opsTarget, opsDays, persistOps]);

  const handleDeleteBoarding = useCallback(() => {
    if (!selected?.boardingDay || boardingLocked || !boardingSchedule) return;
    if (!confirm(`${selected.date}일 ${boardingTarget} 일정을 삭제할까요?`)) return;
    persistBoarding(boardingDays.filter((d) => d.orderIndex !== selected.boardingDay!.orderIndex));
  }, [selected, boardingLocked, boardingSchedule, boardingTarget, boardingDays, persistBoarding]);

  const handleSaveEdit = useCallback((updated: DaySchedule) => {
    if (!editState) return;
    if (editState.target === "ops") {
      persistOps(opsDays.map((d) => (d.orderIndex === updated.orderIndex ? updated : d)));
    } else {
      persistBoarding(boardingDays.map((d) => (d.orderIndex === updated.orderIndex ? updated : d)));
    }
    setEditState(null);
  }, [editState, opsDays, boardingDays, persistOps, persistBoarding]);

  return (
    <div className={`iphone-schedule-body merged-schedule-body ${selected ? "with-panel" : ""}`}>
      <div className="iphone-saved-badge">
        <span className="iphone-saved-dot" />
        {year}년 {month}월 · {opsTarget} + {boardingTarget} 합쳐 보기 · 날짜 선택 시 SKD 표시
      </div>

      <div className="iphone-toolbar iphone-toolbar-compact">
        <div className="iphone-toolbar-btns">
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN}
          >
            −
          </button>
          <span className="iphone-zoom-label">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={zoomIn}
            disabled={zoom >= ZOOM_MAX}
          >
            +
          </button>
          {onBackup && (
            <button type="button" className="btn btn-sm btn-secondary" onClick={onBackup}>
              PC 저장
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm btn-pdf"
            disabled={!hasAny || isPrinting}
            onClick={() => {
              void handlePdf("download");
            }}
          >
            PDF 저장
          </button>
          <button
            type="button"
            className="btn btn-sm btn-pdf"
            disabled={!hasAny || isPrinting}
            onClick={() => {
              void handlePdf("share");
            }}
          >
            PDF 공유
          </button>
          {opsSchedule && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                void downloadMonthIcs(opsSchedule);
              }}
            >
              ICS {opsTarget}
            </button>
          )}
          {boardingSchedule && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                void downloadMonthIcs(boardingSchedule);
              }}
            >
              ICS {boardingTarget}
            </button>
          )}
        </div>
      </div>

      {!hasAny ? (
        <div className="dual-calendar-empty dual-calendar-empty-main">
          <p>{year}년 {month}월 근무표가 없습니다.</p>
          <p className="dual-calendar-empty-hint">박종규·김현숙 탭에서 각각 업로드해 주세요.</p>
        </div>
      ) : (
        <MergedMonthCalendar
          year={year}
          month={month}
          opsDays={opsDays}
          boardingDays={boardingDays}
          opsTarget={opsTarget}
          boardingTarget={boardingTarget}
          zoom={zoom}
          onZoomChange={setZoom}
          selectedDate={selected?.date ?? null}
          onSelectCell={(cell) => {
            if (!cell.inMonth || (!cell.opsDay && !cell.boardingDay)) return;
            setSelected({
              date: cell.date,
              dayOfWeek: cell.dayOfWeek,
              opsDay: cell.opsDay,
              boardingDay: cell.boardingDay,
            });
          }}
        />
      )}

      {selected && !editState && (
        <MergedDaySkdPanel
          year={year}
          month={month}
          date={selected.date}
          dayOfWeek={selected.dayOfWeek}
          opsTarget={opsTarget}
          boardingTarget={boardingTarget}
          opsDay={selected.opsDay}
          boardingDay={selected.boardingDay}
          opsDays={opsDays}
          boardingDays={boardingDays}
          opsLocked={opsLocked}
          boardingLocked={boardingLocked}
          onEditOps={() => {
            if (selected.opsDay && !opsLocked) {
              setEditState({ target: "ops", day: selected.opsDay });
            }
          }}
          onDeleteOps={handleDeleteOps}
          onEditBoarding={() => {
            if (selected.boardingDay && !boardingLocked) {
              setEditState({ target: "boarding", day: selected.boardingDay });
            }
          }}
          onDeleteBoarding={handleDeleteBoarding}
          onClose={() => setSelected(null)}
        />
      )}

      {editState && (
        <EditDayModal
          mode="edit"
          day={editState.day}
          year={year}
          month={month}
          shiftOptions={editState.target === "boarding" ? BOARDING_SHIFT_OPTIONS : undefined}
          onSave={handleSaveEdit}
          onClose={() => setEditState(null)}
        />
      )}

      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <DualPrintView
          ref={printRef}
          year={year}
          month={month}
          opsTarget={opsTarget}
          boardingTarget={boardingTarget}
          opsDays={opsDays}
          boardingDays={boardingDays}
        />
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

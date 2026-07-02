"use client";

import { useCallback, useState } from "react";
import { DaySchedule, ParsedSchedule } from "@/types/schedule";
import { BOARDING_SHIFT_OPTIONS } from "@/lib/shiftDisplay";
import MergedMonthCalendar from "./MergedMonthCalendar";
import MergedDaySkdPanel from "./MergedDaySkdPanel";
import EditDayModal from "./EditDayModal";

const ZOOM_STEPS = [0.75, 0.85, 1, 1.1];

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
}: Props) {
  const [zoomIndex, setZoomIndex] = useState(2);
  const [selected, setSelected] = useState<MergedSelectedDay | null>(null);
  const [editState, setEditState] = useState<{ target: "ops" | "boarding"; day: DaySchedule } | null>(null);

  const zoom = ZOOM_STEPS[zoomIndex];
  const hasAny = !!opsSchedule || !!boardingSchedule;
  const opsDays = opsSchedule?.days ?? [];
  const boardingDays = boardingSchedule?.days ?? [];

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
            onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
            disabled={zoomIndex === 0}
          >
            −
          </button>
          <span className="iphone-zoom-label">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
          >
            +
          </button>
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
    </div>
  );
}

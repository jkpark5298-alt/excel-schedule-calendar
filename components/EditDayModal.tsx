"use client";

import { useMemo, useState } from "react";
import { DaySchedule, ShiftCode } from "@/types/schedule";
import { DOW_KO } from "@/lib/monthGrid";
import ShiftBadge from "./ShiftBadge";
import { PAIR_LABEL_PRESETS, SHIFT_OPTIONS } from "@/lib/shiftDisplay";

interface Props {
  mode?: "edit" | "add";
  day: DaySchedule;
  year?: number;
  month?: number;
  shiftOptions?: ShiftCode[];
  /** 페어 표기 편집 노출 여부 (함께 캘린더 연동 시) */
  showPairLabel?: boolean;
  pairLabelAuto?: string | null;
  pairLabelValue?: string;
  onPairLabelChange?: (value: string | undefined) => void;
  onSave: (updated: DaySchedule) => void;
  onClose: () => void;
}

/** 운항 SKD: A→C, C→당, 당→A(익일) */
function relatedMetaForShift(shift: ShiftCode): { type: ShiftCode; label: string } | null {
  if (shift === "A") return { type: "C", label: "C" };
  if (shift === "C") return { type: "당", label: "당" };
  if (shift === "당") return { type: "A", label: "A(익일)" };
  return null;
}

export default function EditDayModal({
  mode = "edit", day, year, month, shiftOptions = SHIFT_OPTIONS, showPairLabel = false,
  pairLabelAuto = null, pairLabelValue, onPairLabelChange, onSave, onClose,
}: Props) {
  const [date, setDate] = useState(day.date);
  const [dayOfWeek, setDayOfWeek] = useState(day.dayOfWeek);
  const [myShift, setMyShift] = useState<ShiftCode>(day.myShift);
  const [isLeader, setIsLeader] = useState(day.isLeader);
  const [coworkersText, setCoworkersText] = useState(day.sameShiftCoworkers.join(", "));
  const [relatedText, setRelatedText] = useState(day.relatedCoworkers?.names.join(", ") ?? "");

  const [pairLabel, setPairLabel] = useState<string | undefined>(pairLabelValue);

  const relatedMeta = useMemo(() => relatedMetaForShift(myShift), [myShift]);

  const handleDateChange = (nextDate: number) => {
    setDate(nextDate);
    if (year && month) {
      setDayOfWeek(DOW_KO[new Date(year, month - 1, nextDate).getDay()]);
    }
  };

  const handleShiftChange = (next: ShiftCode) => {
    const prevMeta = relatedMetaForShift(myShift);
    const nextMeta = relatedMetaForShift(next);
    setMyShift(next);
    if (!nextMeta) {
      setRelatedText("");
      return;
    }
    if (!prevMeta || prevMeta.type !== nextMeta.type) {
      setRelatedText(
        day.relatedCoworkers?.type === nextMeta.type
          ? day.relatedCoworkers.names.join(", ")
          : "",
      );
    }
  };

  const handleSave = () => {
    const sameShiftCoworkers = coworkersText
      .split(/[,，、]/)
      .map(s => s.trim())
      .filter(Boolean);

    const relatedNames = relatedText
      .split(/[,，、]/)
      .map(s => s.trim())
      .filter(Boolean);

    const meta = relatedMetaForShift(myShift);
    const relatedCoworkers = meta && relatedNames.length > 0
      ? { type: meta.type, names: relatedNames, label: meta.label }
      : null;

    if (showPairLabel && onPairLabelChange) onPairLabelChange(pairLabel);

    onSave({
      ...day,
      date,
      dayOfWeek,
      myShift,
      isLeader,
      sameShiftCoworkers,
      relatedCoworkers,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-white mb-4">
          {mode === "add" ? "일정 추가" : `${day.date}일 (${day.dayOfWeek}) 수정`}
        </h3>

        {mode === "add" && (
          <div className="mb-4">
            <label className="text-sm text-slate-400 mb-2 block">날짜</label>
            <input
              type="number"
              min={1}
              max={31}
              className="iphone-input w-full"
              value={date}
              onChange={(e) => handleDateChange(Number(e.target.value))}
            />
            <p className="text-xs text-slate-500 mt-1">요일: {dayOfWeek}</p>
          </div>
        )}

        <div className="mb-4">
          <label className="text-sm text-slate-400 mb-2 block">근무 형태</label>
          <div className="grid grid-cols-3 gap-2">
            {shiftOptions.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => handleShiftChange(s)}
                className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                  myShift === s
                    ? "border-violet-500 bg-violet-900/50"
                    : "border-slate-600 bg-slate-700 hover:border-slate-400"
                }`}
              >
                <ShiftBadge shift={s} />
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm text-slate-400 mb-2 block">같은 날 근무자 (쉼표 구분)</label>
          <input
            className="iphone-input w-full"
            value={coworkersText}
            onChange={(e) => setCoworkersText(e.target.value)}
            placeholder="김국현, 정찬호"
          />
        </div>

        {relatedMeta && (
          <div className="mb-4">
            <label className="text-sm text-slate-400 mb-2 block">
              {relatedMeta.label} 근무자 (쉼표 구분)
            </label>
            <input
              className="iphone-input w-full"
              value={relatedText}
              onChange={(e) => setRelatedText(e.target.value)}
              placeholder={
                relatedMeta.label === "C"
                  ? "C 근무자 이름"
                  : relatedMeta.label === "당"
                    ? "당 근무자 이름"
                    : "익일 A 근무자 이름"
              }
            />
          </div>
        )}

        {showPairLabel && (
          <div className="mb-4">
            <label className="text-sm text-slate-400 mb-2 block">
              함께 표기 (박종규 × 김현숙){pairLabel === undefined ? ` · 자동: ${pairLabelAuto ?? "없음"}` : ""}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                className={`btn btn-sm ${pairLabel === undefined ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setPairLabel(undefined)}
              >
                자동
              </button>
              <button
                type="button"
                className={`btn btn-sm ${pairLabel === "" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setPairLabel("")}
              >
                표기 없음
              </button>
              {PAIR_LABEL_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`btn btn-sm ${pairLabel === p ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setPairLabel(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              className="iphone-input w-full"
              value={pairLabel ?? ""}
              onChange={(e) => setPairLabel(e.target.value === "" ? "" : e.target.value)}
              placeholder="직접 입력 (예: 교대出退)"
            />
          </div>
        )}

        <div className="mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isLeader}
              onChange={e => setIsLeader(e.target.checked)}
              className="w-4 h-4 accent-violet-500"
            />
            <span className="text-slate-300 text-sm">👍 리더 표시 (예: [👍A] / 이름 | C(...))</span>
          </label>
        </div>

        <div className="flex gap-3">
          <button type="button" className="btn btn-primary flex-1" onClick={handleSave}>
            {mode === "add" ? "추가" : "저장"}
          </button>
          <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>취소</button>
        </div>
      </div>
    </div>
  );
}

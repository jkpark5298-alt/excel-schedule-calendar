"use client";

import { useState } from "react";
import { DaySchedule, ShiftCode } from "@/types/schedule";
import { DOW_KO } from "@/lib/monthGrid";
import ShiftBadge from "./ShiftBadge";
import { SHIFT_OPTIONS } from "@/lib/shiftDisplay";

interface Props {
  mode?: "edit" | "add";
  day: DaySchedule;
  year?: number;
  month?: number;
  onSave: (updated: DaySchedule) => void;
  onClose: () => void;
}

export default function EditDayModal({ mode = "edit", day, year, month, onSave, onClose }: Props) {
  const [date, setDate] = useState(day.date);
  const [dayOfWeek, setDayOfWeek] = useState(day.dayOfWeek);
  const [myShift, setMyShift] = useState<ShiftCode>(day.myShift);
  const [isLeader, setIsLeader] = useState(day.isLeader);
  const [coworkersText, setCoworkersText] = useState(day.sameShiftCoworkers.join(", "));

  const handleDateChange = (nextDate: number) => {
    setDate(nextDate);
    if (year && month) {
      setDayOfWeek(DOW_KO[new Date(year, month - 1, nextDate).getDay()]);
    }
  };

  const handleSave = () => {
    const sameShiftCoworkers = coworkersText
      .split(/[,，、]/)
      .map(s => s.trim())
      .filter(Boolean);
    onSave({
      ...day,
      date,
      dayOfWeek,
      myShift,
      isLeader,
      sameShiftCoworkers,
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
            {SHIFT_OPTIONS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setMyShift(s)}
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

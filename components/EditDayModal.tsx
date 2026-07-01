"use client";

import { useState } from "react";
import { DaySchedule, ShiftCode } from "@/types/schedule";
import ShiftBadge from "./ShiftBadge";

interface Props {
  day: DaySchedule;
  onSave: (updated: DaySchedule) => void;
  onClose: () => void;
}

const SHIFT_OPTIONS: ShiftCode[] = ["C", "A", "당", "休", "연", "N"];

export default function EditDayModal({ day, onSave, onClose }: Props) {
  const [myShift, setMyShift] = useState<ShiftCode>(day.myShift);
  const [isLeader, setIsLeader] = useState(day.isLeader);

  const handleSave = () => {
    onSave({ ...day, myShift, isLeader });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-4">
          {day.date}일 ({day.dayOfWeek}) 수정
        </h3>

        <div className="mb-4">
          <label className="text-sm text-slate-400 mb-2 block">근무 형태</label>
          <div className="grid grid-cols-3 gap-2">
            {SHIFT_OPTIONS.map(s => (
              <button
                key={s}
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

        <div className="mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isLeader}
              onChange={e => setIsLeader(e.target.checked)}
              className="w-4 h-4 accent-violet-500"
            />
            <span className="text-slate-300 text-sm">👍 리더 표시</span>
          </label>
        </div>

        <div className="flex gap-3">
          <button className="btn btn-primary flex-1" onClick={handleSave}>저장</button>
          <button className="btn btn-secondary flex-1" onClick={onClose}>취소</button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { DaySchedule, ParsedSchedule } from "@/types/schedule";

interface Props {
  schedule: ParsedSchedule;
  days: DaySchedule[];
  onClose: () => void;
}

function buildGoogleEvent(day: DaySchedule, schedule: ParsedSchedule) {
  const year = schedule.year;
  const month = String(schedule.month).padStart(2, "0");
  const dateStr = `${year}-${month}-${String(day.date).padStart(2, "0")}`;

  const shiftLabel =
    day.myShift === "C" ? "C근무" :
    day.myShift === "A" ? "A근무" :
    day.myShift === "당" ? "당근무" :
    day.myShift === "休" ? "休(휴무)" : day.myShift;

  const leaderStr = day.isLeader ? " 👍리더" : "";
  const coworkerStr = day.sameShiftCoworkers.length > 0 ? `\n같은 근무: ${day.sameShiftCoworkers.join(", ")}` : "";
  const relatedStr = day.relatedCoworkers?.names.length
    ? `\n${day.relatedCoworkers.label}: ${day.relatedCoworkers.names.join(", ")}`
    : "";

  return {
    summary: `[${schedule.targetName}] ${shiftLabel}${leaderStr}`,
    description: `${shiftLabel}${leaderStr}${coworkerStr}${relatedStr}`,
    start: { date: dateStr },
    end: { date: dateStr },
  };
}

export default function GoogleCalendarModal({ schedule, days, onClose }: Props) {
  const [step, setStep] = useState<"config" | "preview" | "syncing" | "done">("config");
  const [includeRest, setIncludeRest] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [results, setResults] = useState<Array<{ id: string; status: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const targetDays = days.filter(d => includeRest || d.myShift !== "休");
  const events = targetDays.map(d => buildGoogleEvent(d, schedule));

  const handleGetAuthUrl = async () => {
    const res = await fetch("/api/google-calendar?action=auth-url");
    const data = await res.json();
    if (data.url) {
      window.open(data.url, "_blank", "width=500,height=600");
    } else {
      setError(data.error || "OAuth URL 생성 실패 - .env.local에 GOOGLE_CLIENT_ID를 설정하세요.");
    }
  };

  const handleSync = async () => {
    if (!accessToken.trim()) {
      setError("Access Token을 입력하세요.");
      return;
    }
    setError(null);
    setStep("syncing");
    try {
      const res = await fetch("/api/google-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add-events", accessToken, events }),
      });
      const data = await res.json();
      setResults(data.results || []);
      setStep("done");
    } catch (e) {
      setError(String(e));
      setStep("preview");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">📅 Google Calendar 반영</h2>
          <button className="text-slate-400 hover:text-white text-2xl leading-none" onClick={onClose}>×</button>
        </div>

        {step === "config" && (
          <>
            <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4 mb-5 text-sm text-amber-300">
              <p className="font-semibold mb-1">⚙️ Google API 설정 필요</p>
              <ol className="list-decimal list-inside space-y-1 text-amber-200/80">
                <li><a href="https://console.cloud.google.com" target="_blank" className="underline">Google Cloud Console</a> → Calendar API 활성화</li>
                <li>OAuth 2.0 자격증명 생성 (웹 애플리케이션)</li>
                <li>.env.local에 GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET 설정</li>
                <li>아래 버튼으로 로그인 후 Access Token 입력</li>
              </ol>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input type="checkbox" checked={includeRest} onChange={e => setIncludeRest(e.target.checked)} className="w-4 h-4 accent-violet-500" />
                <span className="text-slate-300 text-sm">休(휴무)도 캘린더에 포함</span>
              </label>
              <p className="text-slate-400 text-sm">반영할 일정: <strong className="text-white">{targetDays.length}건</strong></p>
            </div>

            <div className="mb-4">
              <button className="btn btn-secondary w-full mb-3" onClick={handleGetAuthUrl}>
                🔐 Google 로그인 (OAuth)
              </button>
              <label className="block text-sm text-slate-400 mb-1">Access Token (로그인 후 콜백 URL에서 복사)</label>
              <textarea
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                rows={3}
                placeholder="ya29.xxxx..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs resize-none focus:outline-none focus:border-violet-500"
              />
            </div>

            {error && <div className="text-red-400 text-sm mb-3">⚠️ {error}</div>}

            <div className="flex gap-3">
              <button className="btn btn-primary flex-1" onClick={() => setStep("preview")}>
                미리보기 →
              </button>
              <button className="btn btn-secondary" onClick={onClose}>취소</button>
            </div>
          </>
        )}

        {step === "preview" && (
          <>
            <p className="text-slate-400 text-sm mb-4">다음 {events.length}건을 Google Calendar에 추가합니다:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto mb-5">
              {events.map((ev, i) => (
                <div key={i} className="bg-slate-700 rounded-lg px-3 py-2 text-sm">
                  <span className="text-white font-medium">{ev.summary}</span>
                  <span className="text-slate-400 ml-2">{ev.start.date}</span>
                </div>
              ))}
            </div>
            {error && <div className="text-red-400 text-sm mb-3">⚠️ {error}</div>}
            <div className="flex gap-3">
              <button className="btn btn-success flex-1" onClick={handleSync}>
                ✅ 캘린더에 반영
              </button>
              <button className="btn btn-secondary" onClick={() => setStep("config")}>← 뒤로</button>
            </div>
          </>
        )}

        {step === "syncing" && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3 animate-pulse">🔄</div>
            <p className="text-slate-300">Google Calendar에 반영 중...</p>
          </div>
        )}

        {step === "done" && (
          <>
            <div className="bg-emerald-900/40 border border-emerald-700 rounded-xl p-4 mb-5 text-emerald-300 text-sm">
              ✅ 완료! {results.filter(r => r.status === "success").length}건 성공
              {results.filter(r => r.status !== "success").length > 0 && (
                <span className="text-red-300 ml-2">/ {results.filter(r => r.status !== "success").length}건 실패</span>
              )}
            </div>
            <button className="btn btn-primary w-full" onClick={onClose}>닫기</button>
          </>
        )}
      </div>
    </div>
  );
}

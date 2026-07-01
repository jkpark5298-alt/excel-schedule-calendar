"use client";

import { WEEKDAYS } from "@/lib/groupWeeks";

interface Props {
  year: number;
  month: number;
  targetName: string;
  storedMonths: string[];
  onUpload: () => void;
  onSelectMonth: (year: number, month: number) => void;
}

export default function EmptyScheduleView({
  year,
  month,
  targetName,
  storedMonths,
  onUpload,
  onSelectMonth,
}: Props) {
  return (
    <div className="empty-hero">
      <div className="empty-hero-glow" aria-hidden />

      {/* 미니 주간 캘린더 미리보기 */}
      <div className="empty-preview-card">
        <div className="empty-preview-header">
          <span className="empty-preview-badge">주간 캘린더</span>
          <span className="empty-preview-month">{year}년 {month}월</span>
        </div>
        <div className="empty-preview-week-header">
          {WEEKDAYS.map((dow, i) => (
            <span
              key={dow}
              className={`empty-preview-dow ${i === 0 ? "sun" : i === 6 ? "sat" : ""}`}
            >
              {dow}
            </span>
          ))}
        </div>
        <div className="empty-preview-grid">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="empty-preview-cell">
              <span className="empty-preview-cell-dot" />
            </div>
          ))}
        </div>
        <p className="empty-preview-hint">업로드 후 이 형식으로 표시됩니다</p>
      </div>

      {/* 메인 메시지 */}
      <div className="empty-hero-content">
        <div className="empty-hero-icon-wrap">
          <span className="empty-hero-icon">📋</span>
        </div>
        <h2 className="empty-hero-title">
          <span className="empty-hero-title-accent">{year}년 {month}월</span>
          <br />
          근무표가 없습니다
        </h2>
        <p className="empty-hero-desc">
          <strong>{targetName}</strong>님의 Excel 근무표를 업로드하면
          <br />
          일요일 시작 주간 캘린더로 자동 정리됩니다.
        </p>

        <button type="button" className="empty-hero-cta" onClick={onUpload}>
          <span className="empty-hero-cta-icon">＋</span>
          Excel 근무표 업로드
        </button>

        <div className="empty-legend">
          <span className="empty-legend-item"><i className="dot dot-c" />C</span>
          <span className="empty-legend-item"><i className="dot dot-a" />A</span>
          <span className="empty-legend-item"><i className="dot dot-dang" />당</span>
          <span className="empty-legend-item"><i className="dot dot-rest" />休</span>
          <span className="empty-legend-item">👍 리더</span>
        </div>
      </div>

      {storedMonths.length > 0 && (
        <div className="empty-stored">
          <p className="empty-stored-label">저장된 다른 월</p>
          <div className="empty-stored-chips">
            {storedMonths.map((key) => {
              const [y, m] = key.split("-");
              const isCurrent = Number(y) === year && Number(m) === month;
              if (isCurrent) return null;
              return (
                <button
                  key={key}
                  type="button"
                  className="empty-stored-chip"
                  onClick={() => onSelectMonth(Number(y), Number(m))}
                >
                  {y}년 {Number(m)}월
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

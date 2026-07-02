"use client";

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
          <strong>{targetName}</strong>님의 Excel/PDF 근무표를 업로드하면
          <br />
          월간 캘린더로 자동 정리됩니다.
        </p>

        <button type="button" className="empty-hero-cta" onClick={onUpload}>
          <span className="empty-hero-cta-icon">＋</span>
          근무표 업로드 (Excel/PDF)
        </button>

        <div className="empty-legend">
          <span className="empty-legend-item"><i className="dot dot-c" />C</span>
          <span className="empty-legend-item"><i className="dot dot-a" />A</span>
          <span className="empty-legend-item"><i className="dot dot-dang" />당</span>
          <span className="empty-legend-item"><i className="dot dot-rest" />休</span>
          <span className="empty-legend-item">B7/A5/P/D/P6</span>
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

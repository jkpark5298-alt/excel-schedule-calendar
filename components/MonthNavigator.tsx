"use client";

export type PersonTab = "ops" | "boarding" | "dual";

interface Props {
  year: number;
  month: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  activeTab: PersonTab;
  onSwitchTab: (tab: PersonTab) => void;
  onUpload: () => void;
  opsTarget: string;
  boardingTarget: string;
}

export default function MonthNavigator({
  year, month, canPrev, canNext, onPrev, onNext, onToday, activeTab, onSwitchTab, onUpload,
  opsTarget, boardingTarget,
}: Props) {
  const subtitle = activeTab === "dual"
    ? `${opsTarget} + ${boardingTarget} 합침`
    : activeTab === "boarding"
      ? boardingTarget
      : opsTarget;

  return (
    <header className="iphone-nav safe-top">
      <div className="iphone-nav-top">
        <button type="button" className="iphone-nav-link" onClick={onToday}>오늘</button>
        <div className="iphone-person-tabs">
          <button
            type="button"
            className={`iphone-person-tab ${activeTab === "ops" ? "active" : ""}`}
            onClick={() => onSwitchTab("ops")}
          >
            {opsTarget}
          </button>
          <button
            type="button"
            className={`iphone-person-tab ${activeTab === "boarding" ? "active" : ""}`}
            onClick={() => onSwitchTab("boarding")}
          >
            {boardingTarget}
          </button>
          <button
            type="button"
            className={`iphone-person-tab iphone-person-tab-dual ${activeTab === "dual" ? "active" : ""}`}
            onClick={() => onSwitchTab("dual")}
          >
            함께
          </button>
        </div>
        {activeTab !== "dual" ? (
          <button type="button" className="iphone-nav-link iphone-nav-upload" onClick={onUpload}>+ 입력</button>
        ) : (
          <span className="iphone-nav-link iphone-nav-upload iphone-nav-upload-muted">보기</span>
        )}
      </div>
      <div className="iphone-nav-center">
        <button type="button" className="iphone-nav-arrow" disabled={!canPrev} onClick={onPrev} aria-label="이전 달">‹</button>
        <div className="iphone-nav-title-wrap">
          <h1 className="iphone-nav-title">{year}년 {month}월</h1>
          <p className="iphone-nav-sub">{subtitle}</p>
        </div>
        <button type="button" className="iphone-nav-arrow" disabled={!canNext} onClick={onNext} aria-label="다음 달">›</button>
      </div>
    </header>
  );
}

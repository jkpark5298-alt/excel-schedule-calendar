"use client";

interface Props {
  year: number;
  month: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  targetName: string;
  onUpload: () => void;
}

export default function MonthNavigator({
  year, month, canPrev, canNext, onPrev, onNext, onToday, targetName, onUpload,
}: Props) {
  return (
    <header className="iphone-nav safe-top">
      <div className="iphone-nav-top">
        <button type="button" className="iphone-nav-link" onClick={onToday}>오늘</button>
        <button type="button" className="iphone-nav-link iphone-nav-upload" onClick={onUpload}>+ 업로드</button>
      </div>
      <div className="iphone-nav-center">
        <button type="button" className="iphone-nav-arrow" disabled={!canPrev} onClick={onPrev} aria-label="이전 달">‹</button>
        <div className="iphone-nav-title-wrap">
          <h1 className="iphone-nav-title">{year}년 {month}월</h1>
          <p className="iphone-nav-sub">{targetName}</p>
        </div>
        <button type="button" className="iphone-nav-arrow" disabled={!canNext} onClick={onNext} aria-label="다음 달">›</button>
      </div>
    </header>
  );
}

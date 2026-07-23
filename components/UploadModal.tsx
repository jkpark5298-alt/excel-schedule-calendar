"use client";

import { useRef, useState, DragEvent } from "react";
import { MAX_MONTH, MAX_YEAR, MIN_MONTH, MIN_YEAR, isWithinRange } from "@/lib/scheduleStorage";

interface Props {
  targetName: string;
  year: number;
  month: number;
  onTargetNameChange: (name: string) => void;
  onUpload: (file: File, year: number, month: number, targetName: string) => Promise<void>;
  onClose: () => void;
}

export default function UploadModal({ targetName, year, month, onTargetNameChange, onUpload, onClose }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadYear, setUploadYear] = useState(year);
  const [uploadMonth, setUploadMonth] = useState(month);
  const inputRef = useRef<HTMLInputElement>(null);

  const years: number[] = [];
  for (let y = MIN_YEAR; y <= MAX_YEAR; y++) years.push(y);

  const processFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|pdf|png|jpe?g|webp|gif|heic|heif|bmp)$/i) && !file.type.startsWith("image/")) {
      setError("Excel(.xlsx, .xls), PDF(.pdf) 또는 이미지(.png, .jpg 등)만 업로드할 수 있습니다.");
      return;
    }
    if (!isWithinRange(uploadYear, uploadMonth)) {
      setError(`${MIN_YEAR}년 ${MIN_MONTH}월 ~ ${MAX_YEAR}년 ${MAX_MONTH}월 범위만 지원합니다.`);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onUpload(file, uploadYear, uploadMonth, targetName);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="iphone-modal-overlay" onClick={onClose}>
      <div className="iphone-modal" onClick={(e) => e.stopPropagation()}>
        <div className="iphone-modal-header">
          <h2>근무표 업로드</h2>
          <button type="button" className="iphone-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="iphone-modal-body">
          <label className="iphone-field-label">대상자</label>
          <input className="iphone-input" value={targetName} onChange={(e) => onTargetNameChange(e.target.value)} placeholder="박종규 / 김현숙" />
          <div className="iphone-field-row">
            <div className="iphone-field-half">
              <label className="iphone-field-label">년도</label>
              <select className="iphone-input" value={uploadYear} onChange={(e) => setUploadYear(Number(e.target.value))}>
                {years.map((y) => <option key={y} value={y}>{y}년</option>)}
              </select>
            </div>
            <div className="iphone-field-half">
              <label className="iphone-field-label">월</label>
              <select className="iphone-input" value={uploadMonth} onChange={(e) => setUploadMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m} disabled={!isWithinRange(uploadYear, m)}>{m}월</option>
                ))}
              </select>
            </div>
          </div>
          <div
            className={`upload-zone upload-zone-modal ${dragOver ? "drag-over" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) void processFile(f); }}
          >
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.pdf,image/*,.png,.jpg,.jpeg,.webp,.heic" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void processFile(f); }} />
            <div className="text-3xl mb-2">📁</div>
            <p className="text-white font-semibold text-sm">Excel / PDF / 이미지 선택</p>
            <p className="text-slate-500 text-xs mt-1">.xlsx, .xls, .pdf, .png, .jpg</p>
          </div>
          {error && <div className="iphone-error">{error}</div>}
          {loading && <div className="iphone-loading">파일 분석 중... (이미지는 최대 1~2분)</div>}
          <p className="iphone-hint">박종규(C/A/당) · 김현숙(B7/A5/P/D/P6) · 주/연→休</p>
          <p className="iphone-hint">이미지는 PNG/JPG 권장 · OpenAI 쿼터 부족 시 OCR로 재시도</p>
          <p className="iphone-hint">지원 기간: {MIN_YEAR}년 {MIN_MONTH}월 ~ {MAX_YEAR}년 {MAX_MONTH}월</p>
        </div>
      </div>
    </div>
  );
}

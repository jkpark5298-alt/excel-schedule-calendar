"use client";

interface Props {
  onClose: () => void;
}

export default function PinHelpBanner({ onClose }: Props) {
  return (
    <div className="iphone-modal-overlay" onClick={onClose}>
      <div className="pin-help-modal" onClick={(e) => e.stopPropagation()}>
        <h3>📌 월별 근무표 고정 방법</h3>
        <ol className="pin-help-list">
          <li>
            <strong>자동 저장</strong>
            <p>Excel 업로드 시 해당 월이 자동 저장됩니다. (브라우저 + IndexedDB)</p>
          </li>
          <li>
            <strong>홈 화면 추가 (권장)</strong>
            <p>Safari → 공유(□↑) → <strong>홈 화면에 추가</strong></p>
            <p className="pin-help-sub">앱처럼 실행되며 데이터가 더 안정적으로 유지됩니다.</p>
          </li>
          <li>
            <strong>백업 파일</strong>
            <p>상단 <strong>백업</strong> 버튼으로 JSON 저장 → 다른 기기에서 <strong>복원</strong></p>
          </li>
          <li>
            <strong>월 이동</strong>
            <p>‹ › 버튼으로 저장된 다른 월을 바로 확인할 수 있습니다.</p>
          </li>
        </ol>
        <button type="button" className="btn btn-primary w-full" onClick={onClose}>확인</button>
      </div>
    </div>
  );
}

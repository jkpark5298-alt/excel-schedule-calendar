"use client";

interface Props {
  onClose: () => void;
}

export default function PinHelpBanner({ onClose }: Props) {
  return (
    <div className="iphone-modal-overlay" onClick={onClose}>
      <div className="pin-help-modal" onClick={(e) => e.stopPropagation()}>
        <h3>📌 월별 근무표 사용·고정 방법</h3>
        <ol className="pin-help-list">
          <li>
            <strong>매달 업로드 (동일 방법)</strong>
            <p>박종규 / 김현숙 탭 → <strong>+ 입력</strong> → 년·월 선택 → Excel 또는 PDF 업로드</p>
            <p className="pin-help-sub">두 사람은 각각 업로드합니다. <strong>함께</strong> 탭에서 한 캘린더로 확인.</p>
          </li>
          <li>
            <strong>자동 저장</strong>
            <p>업로드 즉시 해당 월·대상자별로 브라우저에 저장됩니다. (localStorage + IndexedDB)</p>
          </li>
          <li>
            <strong>확정 (잠금)</strong>
            <p>상단 <strong>📌 확정</strong> 버튼 → 수정·삭제·재업로드 불가. <strong>🔓 확정 해제</strong>로 다시 편집.</p>
          </li>
          <li>
            <strong>홈 화면 추가 (권장)</strong>
            <p>Safari → 공유(□↑) → <strong>홈 화면에 추가</strong></p>
            <p className="pin-help-sub">앱처럼 실행되며 데이터가 더 안정적으로 유지됩니다.</p>
          </li>
          <li>
            <strong>백업 파일</strong>
            <p><strong>백업</strong> → JSON 저장 → 다른 기기·브라우저에서 <strong>복원</strong></p>
          </li>
        </ol>
        <button type="button" className="btn btn-primary w-full" onClick={onClose}>확인</button>
      </div>
    </div>
  );
}

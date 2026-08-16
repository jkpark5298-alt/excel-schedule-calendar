"use client";

interface Props {
  value: string;
  pickMode: boolean;
  locked?: boolean;
  label?: string;
  inputId?: string;
  onChange: (value: string) => void;
  onApply: () => void;
  onTogglePickMode: () => void;
}

function warnLocked() {
  alert("확정된 달입니다. 확정 해제 후 리더 날짜를 지정할 수 있습니다.");
}

export default function LeaderDateBar({
  value,
  pickMode,
  locked = false,
  label = "리더 날짜",
  inputId = "ops-leader-dates",
  onChange,
  onApply,
  onTogglePickMode,
}: Props) {
  return (
    <div className="iphone-leader-bar">
      <button
        type="button"
        className={`btn btn-sm iphone-leader-pick-btn ${pickMode ? "btn-primary" : "btn-secondary"}`}
        onClick={() => {
          if (locked) {
            warnLocked();
            return;
          }
          onTogglePickMode();
        }}
      >
        {pickMode ? "👍 선택 중 · 완료" : "👍 달력에서 날짜 선택"}
      </button>
      {pickMode && !locked && (
        <p className="iphone-leader-hint">리더로 표시할 날짜를 달력에서 누르세요. 다시 누르면 해제됩니다.</p>
      )}
      <div className="iphone-leader-row">
        <label htmlFor={inputId} className="iphone-leader-label">{label}</label>
        <input
          id={inputId}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="done"
          className="iphone-leader-input"
          placeholder="예: 1,3,5"
          value={value}
          readOnly={locked}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (locked) {
              e.preventDefault();
              warnLocked();
            }
          }}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (locked) {
                warnLocked();
                return;
              }
              onApply();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => {
            if (locked) {
              warnLocked();
              return;
            }
            onApply();
          }}
        >
          지정
        </button>
      </div>
    </div>
  );
}

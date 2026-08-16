"use client";

export type ToolPanel = "manage" | "manage2" | "leader" | null;

interface Props {
  active: ToolPanel;
  onChange: (panel: ToolPanel) => void;
  showLeader?: boolean;
}

export default function IphoneToolTabs({ active, onChange, showLeader = true }: Props) {
  const toggle = (panel: ToolPanel) => {
    onChange(active === panel ? null : panel);
  };

  return (
    <div className="iphone-tool-tabs" role="tablist" aria-label="도구">
      <button
        type="button"
        role="tab"
        aria-selected={active === "manage"}
        className={`btn btn-sm iphone-manage-btn ${active === "manage" ? "btn-primary" : "btn-secondary"}`}
        onClick={() => toggle("manage")}
      >
        관리
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "manage2"}
        className={`btn btn-sm iphone-manage-btn ${active === "manage2" ? "btn-primary" : "btn-secondary"}`}
        onClick={() => toggle("manage2")}
      >
        관리2
      </button>
      {showLeader && (
        <button
          type="button"
          role="tab"
          aria-selected={active === "leader"}
          className={`btn btn-sm iphone-manage-btn ${active === "leader" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => toggle("leader")}
        >
          리더
        </button>
      )}
    </div>
  );
}

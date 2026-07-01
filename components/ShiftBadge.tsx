import { ShiftCode } from "@/types/schedule";

interface Props {
  shift: ShiftCode;
  isLeader?: boolean;
  size?: "sm" | "md" | "lg";
}

export function shiftClass(shift: ShiftCode): string {
  if (shift === "C") return "shift-C";
  if (shift === "A") return "shift-A";
  if (shift === "당") return "shift-dang";
  if (shift === "休") return "shift-rest";
  return "shift-other";
}

export default function ShiftBadge({ shift, isLeader = false, size = "md" }: Props) {
  const sizeClass = size === "lg" ? "text-2xl" : size === "sm" ? "text-xs" : "text-base";

  return (
    <span className={`inline-flex items-center gap-1 font-bold ${sizeClass} ${shiftClass(shift)}`}>
      {isLeader && <span title="리더">👍</span>}
      {shift}
      {isLeader && (
        <span className="leader-badge ml-1 text-xs text-violet-300">리더</span>
      )}
    </span>
  );
}

import { ShiftCode } from "@/types/schedule";
import { formatShiftDisplay, shiftClass } from "@/lib/shiftDisplay";

interface Props {
  shift: ShiftCode;
  isLeader?: boolean;
  size?: "sm" | "md" | "lg";
}

export { shiftClass };

export default function ShiftBadge({ shift, isLeader = false, size = "md" }: Props) {
  const sizeClass = size === "lg" ? "text-2xl" : size === "sm" ? "text-xs" : "text-base";
  const display = formatShiftDisplay(shift);

  return (
    <span className={`inline-flex items-center gap-1 font-bold ${sizeClass} ${shiftClass(shift)}`}>
      {isLeader && <span title="리더">👍</span>}
      {formatShiftDisplay(shift)}
      {isLeader && (
        <span className="leader-badge ml-1 text-xs text-violet-300">리더</span>
      )}
    </span>
  );
}

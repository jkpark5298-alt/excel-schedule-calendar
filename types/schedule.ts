export type ShiftCode =
  | "C" | "A" | "당" | "休" | "전" | "X" | "N" | "연" | "사고대" | "노교"
  | "B7" | "A5" | "P" | "D" | "P6" | "교육" | "주"
  | string;

export interface WorkerShift {
  name: string;
  shift: ShiftCode;
  isLeader: boolean;
}

export interface DaySchedule {
  orderIndex: number; // Excel column order (unique key)
  date: number;      // day number (1-31)
  dayOfWeek: string; // 월/화/수/목/금/토/일
  myShift: ShiftCode;
  isLeader: boolean;
  sameShiftCoworkers: string[];    // same shift workers
  relatedCoworkers: {              // C→당, A→C, 당→익일A
    type: ShiftCode;
    names: string[];
    label: string;
  } | null;
  allWorkers: WorkerShift[];
}

export interface ParsedSchedule {
  targetName: string;
  month: number;
  year: number;
  days: DaySchedule[];
}

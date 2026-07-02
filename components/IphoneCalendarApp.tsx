"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

import { ParsedSchedule } from "@/types/schedule";

import { BOARDING_TARGET } from "@/lib/shiftDisplay";

import { getBoardingReferenceSchedule } from "@/lib/boardingReference";
import { readApiJson } from "@/lib/readApiJson";

import {

  StoredCalendarData, canGoNext, canGoPrev, clampToRange, deleteScheduleForMonth,

  downloadBackup, getScheduleForPerson, importBackupJson, isScheduleLocked, listStoredMonths, loadStoredCalendar,

  saveScheduleForMonth, shiftMonth, toggleScheduleLock, writeStoredCalendar,

} from "@/lib/scheduleStorage";

import MonthNavigator, { PersonTab } from "./MonthNavigator";

import UploadModal from "./UploadModal";

import ScheduleView from "./ScheduleView";

import DualScheduleView from "./DualScheduleView";

import EmptyScheduleView from "./EmptyScheduleView";

import BoardingSkdInputView from "./BoardingSkdInputView";



const OPS_TARGET = "박종규";



function tabToTargetName(tab: PersonTab): string {

  return tab === "boarding" ? BOARDING_TARGET : OPS_TARGET;

}



export default function IphoneCalendarApp() {

  const now = new Date();

  const today = clampToRange(now.getFullYear(), now.getMonth() + 1);



  const [stored, setStored] = useState<StoredCalendarData>({ targetName: OPS_TARGET, schedules: {} });

  const [year, setYear] = useState(today.year);

  const [month, setMonth] = useState(today.month);

  const [activeTab, setActiveTab] = useState<PersonTab>("ops");

  const [showUpload, setShowUpload] = useState(false);

  const [showBoardingInput, setShowBoardingInput] = useState(false);

  const [hydrated, setHydrated] = useState(false);



  useEffect(() => {

    void loadStoredCalendar().then(setStored);

    setHydrated(true);

  }, []);



  const activeTargetName = tabToTargetName(activeTab);

  const schedule = activeTab === "dual"

    ? null

    : getScheduleForPerson(stored, activeTargetName, year, month);

  const opsSchedule = getScheduleForPerson(stored, OPS_TARGET, year, month);

  const boardingScheduleStored = getScheduleForPerson(stored, BOARDING_TARGET, year, month);

  const boardingSchedule = boardingScheduleStored

    ?? getBoardingReferenceSchedule(BOARDING_TARGET, year, month);

  const storedMonths = useMemo(

    () => listStoredMonths(stored, activeTab === "dual" ? undefined : activeTargetName),

    [stored, activeTab, activeTargetName],

  );

  const isBoardingPerson = activeTab === "boarding";



  const goPrev = useCallback(() => {

    const next = shiftMonth(year, month, -1);

    if (canGoPrev(year, month)) { setYear(next.year); setMonth(next.month); }

  }, [year, month]);



  const goNext = useCallback(() => {

    const next = shiftMonth(year, month, 1);

    if (canGoNext(year, month)) { setYear(next.year); setMonth(next.month); }

  }, [year, month]);



  const goToday = useCallback(() => {

    setYear(today.year);

    setMonth(today.month);

  }, [today.year, today.month]);



  const handleUpload = useCallback(async (file: File, uploadYear: number, uploadMonth: number, targetName: string) => {

    const fd = new FormData();

    fd.append("file", file);

    fd.append("targetName", targetName);

    fd.append("year", String(uploadYear));

    fd.append("month", String(uploadMonth));

    const res = await fetch("/api/parse-schedule", { method: "POST", body: fd });

    const data = await readApiJson<{ error?: string; hint?: string } & ParsedSchedule>(res);

    if (!res.ok) {

      const msg = data.hint ? `${data.error} (${data.hint})` : data.error || "파싱 오류";

      throw new Error(msg);

    }

    const parsed = data as ParsedSchedule;

    setStored((prev) => saveScheduleForMonth(prev, parsed));

    setYear(uploadYear);

    setMonth(uploadMonth);

  }, []);



  const handleScheduleUpdate = useCallback((updated: ParsedSchedule) => {

    setStored((prev) => saveScheduleForMonth(prev, updated));

  }, []);



  const handleDeleteMonth = useCallback((targetName: string) => {

    if (!confirm(`${year}년 ${month}월 ${targetName} 근무표를 삭제할까요?`)) return;

    setStored((prev) => deleteScheduleForMonth(prev, targetName, year, month));

  }, [year, month]);



  const handleRestore = useCallback(async (file: File) => {

    try {

      const text = await file.text();

      const next = importBackupJson(text);

      setStored(next);

      alert(`복원 완료: ${listStoredMonths(next).length}개월`);

    } catch (e) {

      alert(String(e));

    }

  }, []);



  const handleBackup = useCallback(() => {

    downloadBackup(stored);

  }, [stored]);



  const handleToggleLock = useCallback(() => {

    if (!schedule) return;

    const locking = !isScheduleLocked(stored, schedule.targetName, schedule.year, schedule.month);

    if (locking && !confirm(`${schedule.year}년 ${schedule.month}월 ${schedule.targetName} 근무표를 확정할까요?\n확정 후에는 수정·삭제·재업로드가 불가합니다.`)) return;

    setStored((prev) => toggleScheduleLock(prev, schedule.targetName, schedule.year, schedule.month));

  }, [stored, schedule]);



  const monthLocked = schedule

    ? isScheduleLocked(stored, schedule.targetName, schedule.year, schedule.month)

    : false;



  const handleTargetNameChange = useCallback((name: string) => {

    setStored((prev) => {

      const next = { ...prev, targetName: name };

      writeStoredCalendar(next);

      return next;

    });

  }, []);



  const switchTab = useCallback((tab: PersonTab) => {

    setActiveTab(tab);

    if (tab !== "dual") {

      handleTargetNameChange(tabToTargetName(tab));

    }



    if (tab === "boarding") {

      const refYear = 2026;

      const refMonth = 7;

      const ref = getBoardingReferenceSchedule(BOARDING_TARGET, refYear, refMonth);

      if (ref && !getScheduleForPerson(stored, BOARDING_TARGET, refYear, refMonth)) {

        setYear(refYear);

        setMonth(refMonth);

        setStored((prev) => saveScheduleForMonth({ ...prev, targetName: BOARDING_TARGET }, ref));

        setShowBoardingInput(false);

        return;

      }

      if (!getScheduleForPerson(stored, BOARDING_TARGET, year, month)) {

        setShowBoardingInput(true);

      } else {

        setShowBoardingInput(false);

      }

      return;

    }



    setShowBoardingInput(false);



    if (tab === "dual") {

      const ref = getBoardingReferenceSchedule(BOARDING_TARGET, year, month);

      if (ref && !getScheduleForPerson(stored, BOARDING_TARGET, year, month)) {

        setStored((prev) => saveScheduleForMonth(prev, ref));

      }

      if (!opsSchedule && !boardingScheduleStored && year === today.year && month === today.month) {

        setYear(2026);

        setMonth(7);

        const julyRef = getBoardingReferenceSchedule(BOARDING_TARGET, 2026, 7);

        if (julyRef && !getScheduleForPerson(stored, BOARDING_TARGET, 2026, 7)) {

          setStored((prev) => saveScheduleForMonth(prev, julyRef));

        }

      }

    }

  }, [handleTargetNameChange, stored, year, month, today.year, today.month, opsSchedule, boardingScheduleStored]);



  const handleBoardingSave = useCallback((parsed: ParsedSchedule) => {

    setStored((prev) => saveScheduleForMonth({ ...prev, targetName: BOARDING_TARGET }, parsed));

    setYear(parsed.year);

    setMonth(parsed.month);

    setShowBoardingInput(false);

  }, []);



  if (!hydrated) {

    return <div className="iphone-loading-screen">로딩 중...</div>;

  }



  if (showBoardingInput && activeTab === "boarding") {

    return (

      <BoardingSkdInputView

        year={year}

        month={month}

        initialDays={schedule?.targetName === BOARDING_TARGET ? schedule.days : undefined}

        onSave={handleBoardingSave}

        onClose={() => setShowBoardingInput(false)}

      />

    );

  }



  return (

    <div className="iphone-app safe-bottom">

      <MonthNavigator

        year={year}

        month={month}

        canPrev={canGoPrev(year, month)}

        canNext={canGoNext(year, month)}

        onPrev={goPrev}

        onNext={goNext}

        onToday={goToday}

        activeTab={activeTab}

        onSwitchTab={switchTab}

        onUpload={() => (isBoardingPerson ? setShowBoardingInput(true) : setShowUpload(true))}

        opsTarget={OPS_TARGET}

        boardingTarget={BOARDING_TARGET}

      />



      {activeTab === "dual" ? (

        <DualScheduleView

          year={year}

          month={month}

          opsTarget={OPS_TARGET}

          boardingTarget={BOARDING_TARGET}

          opsSchedule={opsSchedule}

          boardingSchedule={boardingSchedule}

        />

      ) : schedule ? (

        <ScheduleView

          schedule={schedule}

          isLocked={monthLocked}

          onToggleLock={handleToggleLock}

          onScheduleUpdate={handleScheduleUpdate}

          onDelete={() => handleDeleteMonth(schedule.targetName)}

          onReupload={() => (isBoardingPerson ? setShowBoardingInput(true) : setShowUpload(true))}

          onBackup={handleBackup}

          onRestore={handleRestore}

          onBoardingInput={isBoardingPerson ? () => setShowBoardingInput(true) : undefined}

        />

      ) : (

        <EmptyScheduleView

          year={year}

          month={month}

          targetName={activeTargetName}

          storedMonths={storedMonths}

          onUpload={() => (isBoardingPerson ? setShowBoardingInput(true) : setShowUpload(true))}

          onSelectMonth={(y, m) => { setYear(y); setMonth(m); }}

        />

      )}



      {showUpload && !isBoardingPerson && (

        <UploadModal

          targetName={activeTargetName}

          year={year}

          month={month}

          onTargetNameChange={handleTargetNameChange}

          onUpload={handleUpload}

          onClose={() => setShowUpload(false)}

        />

      )}

    </div>

  );

}



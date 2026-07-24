"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export const ZOOM_MIN = 0.75;
export const ZOOM_MAX = 1.3;
export const ZOOM_STEP = 0.1;
export const ZOOM_DEFAULT = 1;

export function clampZoom(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));
}

function touchDistance(touches: TouchList): number {
  const a = touches.item(0);
  const b = touches.item(1);
  if (!a || !b) return 0;
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * 캘린더 영역 두 손가락 핀치 → zoom 배율 변경 (iPhone)
 */
export function usePinchZoom(
  zoom: number,
  onZoomChange: (zoom: number) => void,
): { pinchRef: RefObject<HTMLDivElement | null>; isPinching: boolean } {
  const pinchRef = useRef<HTMLDivElement | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const zoomRef = useRef(zoom);
  const startDistRef = useRef(0);
  const startZoomRef = useRef(zoom);
  const onZoomChangeRef = useRef(onZoomChange);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
  }, [onZoomChange]);

  const handleZoom = useCallback((next: number) => {
    onZoomChangeRef.current(clampZoom(next));
  }, []);

  useEffect(() => {
    const el = pinchRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      startDistRef.current = touchDistance(e.touches);
      startZoomRef.current = zoomRef.current;
      setIsPinching(true);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || startDistRef.current <= 0) return;
      e.preventDefault();
      const ratio = touchDistance(e.touches) / startDistRef.current;
      handleZoom(startZoomRef.current * ratio);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        startDistRef.current = 0;
        setIsPinching(false);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [handleZoom]);

  return { pinchRef, isPinching };
}

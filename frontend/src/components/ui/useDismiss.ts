"use client";
import { useEffect, useState } from "react";

/** Tutup saat klik di luar elemen atau menekan Escape. */
export function useDismiss(
  open: boolean,
  refs: Array<React.RefObject<HTMLElement | null>>,
  onDismiss: () => void
) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (refs.some((r) => r.current?.contains(t))) return;
      onDismiss();
    };
    // Fase capture + preventDefault: Esc hanya menutup popover ini, bukan
    // dialog di belakangnya (Dialog mengabaikan event yang sudah di-prevent).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onDismiss]);
}

/** true di layar < 640px (dipakai untuk mengganti popover jadi bottom sheet). */
export function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

/** Kunci scroll body selama overlay terbuka. */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

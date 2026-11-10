"use client";
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useScrollLock } from "./useDismiss";

// Tumpukan dialog yang terbuka: hanya dialog teratas yang merespons Esc/Tab.
const stack: object[] = [];

/**
 * Dialog modal. variant "center": kartu di tengah (bottom sheet di mobile);
 * variant "drawer": panel samping kanan (mis. tas belanja).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "center",
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "center" | "drawer";
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const token = {};
    stack.push(token);
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token || e.defaultPrevented) return;
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'
        );
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
        else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(token), 1);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const width = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" }[size];
  return createPortal(
    <div className={cn("fixed inset-0 z-[90] flex", variant === "drawer" ? "justify-end" : "items-end sm:items-center sm:justify-center sm:p-6")}>
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col bg-canvas outline-none",
          variant === "drawer"
            ? "h-full max-h-none max-w-[440px] border-l border-line animate-drawer-in"
            : cn("rounded-t-3xl sm:rounded-3xl border border-line animate-sheet-in sm:animate-pop-in", width)
        )}
      >
        {variant !== "drawer" && <span className="mx-auto mt-2.5 block h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" aria-hidden />}
        {(title || description) && (
          <div className="flex items-start gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              {title && <h2 className="font-display text-xl font-bold uppercase tracking-tight">{title}</h2>}
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="-mr-2 grid size-10 shrink-0 place-items-center rounded-full hover:bg-stone"
            >
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className={cn("flex-1 overflow-y-auto overscroll-contain px-5 pt-5 sm:px-6 sm:pb-5", footer ? "pb-5" : "pb-[max(1.25rem,env(safe-area-inset-bottom))]")}>{children}</div>
        {footer && <div className="border-t border-line bg-canvas px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-4">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/** Konfirmasi tindakan (mis. batalkan pesanan, hapus produk). */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Ya, lanjutkan",
  danger,
  loading,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-line bg-stone px-5 text-sm font-semibold hover:bg-stone-2">
            Kembali
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "h-11 rounded-xl px-5 text-sm font-semibold disabled:opacity-60",
              danger ? "bg-danger text-white" : "bg-ink text-canvas"
            )}
          >
            {loading ? "Memproses…" : confirmLabel}
          </button>
        </div>
      }
    >
      {description && <p className="text-sm leading-relaxed text-ink-3">{description}</p>}
      {children}
    </Dialog>
  );
}

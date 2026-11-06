"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { useDismiss } from "./useDismiss";

export type MenuItem =
  | {
      label: string;
      icon?: React.ReactNode;
      onSelect?: () => void;
      href?: string;
      danger?: boolean;
      disabled?: boolean;
      hint?: string;
    }
  | "separator";

/**
 * Menu dropdown aksi (akun, aksi baris tabel). Navigasi panah, Enter, Esc;
 * fokus kembali ke pemicu saat ditutup.
 */
export function Menu({
  trigger,
  items,
  align = "end",
  label,
  header,
  className,
}: {
  trigger: (props: { open: boolean; toggle: () => void; ref: React.Ref<HTMLButtonElement> }) => React.ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  label: string;
  header?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const actionable = items.map((it, i) => (it !== "separator" && !it.disabled ? i : -1)).filter((i) => i >= 0);

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);
  useDismiss(open, [triggerRef, panelRef], close);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const run = (i: number) => {
    const it = items[i];
    if (!it || it === "separator" || it.disabled) return;
    close();
    triggerRef.current?.focus();
    it.onSelect?.();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const pos = actionable.indexOf(active);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(actionable[(pos + 1) % actionable.length]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(actionable[(pos - 1 + actionable.length) % actionable.length]);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const it = items[active];
      if (it && it !== "separator" && it.href) {
        (panelRef.current?.querySelector(`[data-index="${active}"]`) as HTMLElement | null)?.click();
      } else run(active);
    } else if (e.key === "Tab") close();
  };

  return (
    <div className={cn("relative inline-block", className)}>
      {trigger({ open, toggle: () => (open ? close() : setOpen(true)), ref: triggerRef })}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className={cn(
            "absolute top-full z-50 mt-2 min-w-56 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-pop outline-none animate-pop-in",
            align === "end" ? "right-0" : "left-0"
          )}
        >
          {header && <div className="border-b border-line px-3 pb-2.5 pt-2">{header}</div>}
          {items.map((it, i) => {
            if (it === "separator") return <div key={"sep" + i} className="my-1 h-px bg-line" role="separator" />;
            const cls = cn(
              "flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors",
              i === active && "bg-stone",
              it.danger ? "text-danger" : "text-ink",
              it.disabled && "pointer-events-none opacity-40"
            );
            const content = (
              <>
                {it.icon && <span className={cn("shrink-0", it.danger ? "text-danger" : "text-muted")}>{it.icon}</span>}
                <span className="flex-1">{it.label}</span>
                {it.hint && <span className="text-xs text-muted">{it.hint}</span>}
              </>
            );
            return it.href ? (
              <Link
                key={it.label}
                href={it.href}
                role="menuitem"
                data-index={i}
                className={cls}
                onPointerMove={() => setActive(i)}
                onClick={close}
              >
                {content}
              </Link>
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                data-index={i}
                className={cls}
                onPointerMove={() => setActive(i)}
                onClick={() => run(i)}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

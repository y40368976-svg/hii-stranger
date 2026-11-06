"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useDismiss, useIsMobile, useScrollLock } from "./useDismiss";

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MINUTES = [0, 15, 30, 45];

const pad = (n: number) => String(n).padStart(2, "0");
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Label ringkas: "Sab, 24 Okt 2026 · 00.00". */
export function formatDateTimeLabel(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) +
    " · " +
    pad(d.getHours()) +
    "." +
    pad(d.getMinutes())
  );
}

type Props = {
  value: string | null;
  onChange: (iso: string | null) => void;
  placeholder?: string;
  /** Tanggal paling awal yang bisa dipilih (ISO). */
  min?: string | null;
  invalid?: boolean;
  id?: string;
  "aria-describedby"?: string;
  title?: string;
  /** Jam default saat memilih tanggal baru (mis. 0 untuk mulai, 23 untuk berakhir). */
  defaultHour?: number;
};

/**
 * Pemilih tanggal & jam: kalender bulan + pilihan jam/menit dalam popover
 * (desktop) atau bottom sheet (mobile). Pengganti <input type="datetime-local">.
 */
export function DateTimePicker({ value, onChange, placeholder = "Pilih tanggal & jam", min, invalid, id, title, defaultHour = 0, ...aria }: Props) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value) : null;
  const [draft, setDraft] = useState<Date | null>(selected);
  const [view, setView] = useState(() => {
    const d = selected ?? new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mobile = useIsMobile();
  const minDate = min ? new Date(min) : null;

  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, [triggerRef, panelRef], close);
  useScrollLock(open && mobile);

  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = 320;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    const below = window.innerHeight - r.bottom;
    setPos(below < 470 && r.top > below ? { left, bottom: window.innerHeight - r.top + 6 } : { left, top: r.bottom + 6 });
  }, []);

  useEffect(() => {
    if (!open || mobile) return;
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, mobile, place]);

  const openPanel = () => {
    const d = value ? new Date(value) : null;
    setDraft(d);
    const base = d ?? (minDate && minDate > new Date() ? minDate : new Date());
    setView(new Date(base.getFullYear(), base.getMonth(), 1));
    place();
    setOpen(true);
  };

  const cells = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Senin = 0
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [view]);

  const today = new Date();
  const pickDay = (d: Date) => {
    const n = new Date(d);
    if (draft) n.setHours(draft.getHours(), draft.getMinutes(), 0, 0);
    else n.setHours(defaultHour, defaultHour === 23 ? 59 : 0, 0, 0);
    setDraft(n);
  };
  const setTime = (h: number, m: number) => {
    const n = new Date(draft ?? startOfDay(new Date()));
    n.setHours(h, m, 0, 0);
    setDraft(n);
  };
  const quick = (fn: () => Date) => {
    const d = fn();
    setDraft(d);
    setView(new Date(d.getFullYear(), d.getMonth(), 1));
  };
  const apply = () => {
    onChange(draft ? draft.toISOString() : null);
    close();
    triggerRef.current?.focus();
  };
  const invalidDraft = !!(draft && minDate && draft <= minDate);

  const hourRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = draft?.getHours() ?? defaultHour;
    hourRef.current?.querySelector<HTMLElement>(`[data-h="${h}"]`)?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [open, draft, defaultHour]);

  const body = (
    <div className="w-full sm:w-[320px]">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pt-3">
        {[
          { label: "Sekarang", fn: () => new Date() },
          { label: "Besok 00.00", fn: () => { const d = startOfDay(new Date()); d.setDate(d.getDate() + 1); return d; } },
          { label: "+3 hari", fn: () => { const d = new Date(draft ?? new Date()); d.setDate(d.getDate() + 3); return d; } },
          { label: "+7 hari", fn: () => { const d = new Date(draft ?? new Date()); d.setDate(d.getDate() + 7); return d; } },
        ].map((q) => (
          <button key={q.label} type="button" onClick={() => quick(q.fn)} className="h-8 shrink-0 rounded-full border border-line bg-stone px-3 text-xs font-semibold hover:border-ink">
            {q.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 pb-1 pt-3">
        <button type="button" aria-label="Bulan sebelumnya" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="grid size-9 place-items-center rounded-full hover:bg-stone">
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-bold" aria-live="polite">
          {MONTHS[view.getMonth()]} {view.getFullYear()}
        </p>
        <button type="button" aria-label="Bulan berikutnya" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="grid size-9 place-items-center rounded-full hover:bg-stone">
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 px-3" role="grid">
        {DAYS.map((d) => (
          <span key={d} className="caps py-1.5 text-center text-faint">
            {d}
          </span>
        ))}
        {cells.map((d) => {
          const outside = d.getMonth() !== view.getMonth();
          const disabled = !!(minDate && startOfDay(d) < startOfDay(minDate));
          const isSel = draft && sameDay(d, draft);
          const isToday = sameDay(d, today);
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => pickDay(d)}
              aria-pressed={!!isSel}
              aria-label={d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              className={cn(
                "relative grid h-10 place-items-center rounded-xl text-sm font-semibold tabular transition-colors",
                isSel ? "bg-ink text-lime" : "hover:bg-stone",
                outside && !isSel && "text-faint",
                disabled && "cursor-not-allowed text-line-strong line-through hover:bg-transparent"
              )}
            >
              {d.getDate()}
              {isToday && !isSel && <span className="absolute bottom-1 size-1 rounded-full bg-ink" aria-hidden />}
            </button>
          );
        })}
      </div>

      <div className="mt-3 border-t border-line px-4 pt-3">
        <p className="caps mb-2 flex items-center gap-1.5 text-muted">
          <Clock className="size-3.5" /> Jam
        </p>
        <div ref={hourRef} className="no-scrollbar flex gap-1 overflow-x-auto pb-1">
          {Array.from({ length: 24 }, (_, h) => (
            <button
              key={h}
              data-h={h}
              type="button"
              onClick={() => setTime(h, draft?.getMinutes() ?? 0)}
              className={cn(
                "h-9 min-w-11 shrink-0 rounded-lg border text-sm font-semibold tabular",
                draft?.getHours() === h ? "border-ink bg-ink text-lime" : "border-line bg-white hover:border-ink"
              )}
            >
              {pad(h)}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1">
          {[...MINUTES, 59].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setTime(draft?.getHours() ?? defaultHour, m)}
              className={cn(
                "h-9 rounded-lg border text-sm font-semibold tabular",
                draft?.getMinutes() === m ? "border-ink bg-ink text-lime" : "border-line bg-white hover:border-ink"
              )}
            >
              :{pad(m)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-line p-3">
        <div className="min-w-0 flex-1 text-xs">
          {draft ? (
            <span className={cn("font-semibold", invalidDraft && "text-danger")}>{formatDateTimeLabel(draft.toISOString())}</span>
          ) : (
            <span className="text-muted">Belum dipilih</span>
          )}
          {invalidDraft && <span className="block text-danger">Harus setelah waktu mulai</span>}
        </div>
        <button type="button" onClick={() => setDraft(null)} className="h-9 rounded-lg px-3 text-xs font-semibold text-muted hover:bg-stone">
          Kosongkan
        </button>
        <button type="button" onClick={apply} disabled={invalidDraft} className="h-9 rounded-lg bg-ink px-4 text-xs font-semibold text-canvas disabled:opacity-40">
          Pakai
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        aria-describedby={aria["aria-describedby"]}
        onClick={() => (open ? close() : openPanel())}
        className={cn(
          "flex h-12 w-full items-center gap-2.5 rounded-xl border bg-white px-3.5 text-left text-sm transition-colors",
          open ? "border-ink" : invalid ? "border-danger" : "border-line hover:border-line-strong"
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-muted" />
        <span className={cn("min-w-0 flex-1 truncate", !value && "text-faint")}>{value ? formatDateTimeLabel(value) : placeholder}</span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Hapus tanggal"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                onChange(null);
              }
            }}
            className="grid size-7 shrink-0 place-items-center rounded-full text-muted hover:bg-stone hover:text-ink"
          >
            <X className="size-3.5" />
          </span>
        )}
      </button>

      {open &&
        !mobile &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={title ?? placeholder}
            style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom }}
            className="z-[120] overflow-hidden rounded-2xl border border-line bg-white shadow-pop animate-pop-in"
          >
            {body}
          </div>,
          document.body
        )}
      {open &&
        mobile &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex flex-col justify-end">
            <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={close} />
            <div ref={panelRef} role="dialog" aria-modal aria-label={title ?? placeholder} className="relative max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white pb-safe animate-sheet-in">
              <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong" aria-hidden />
              <div className="flex items-center justify-between px-4 pt-2">
                <span className="text-base font-bold">{title ?? placeholder}</span>
                <button type="button" aria-label="Tutup" onClick={close} className="grid size-10 place-items-center rounded-full hover:bg-stone">
                  <X className="size-5" />
                </button>
              </div>
              {body}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

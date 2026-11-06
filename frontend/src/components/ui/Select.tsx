"use client";
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useDismiss, useIsMobile, useScrollLock } from "./useDismiss";

export type SelectOption<V extends string = string> = {
  value: V;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

type SelectProps<V extends string> = {
  value: V | "" | null | undefined;
  onChange: (value: V) => void;
  options: SelectOption<V>[];
  placeholder?: string;
  /** Tampilkan kolom cari di dalam dropdown (untuk daftar panjang, mis. kota). */
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  loading?: boolean;
  invalid?: boolean;
  size?: "sm" | "md";
  /** Judul bottom sheet di layar kecil. */
  sheetTitle?: string;
  emptyText?: string;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  /** Tampilan tombol: input (default) atau chip (pill, untuk filter). */
  appearance?: "input" | "chip";
  leading?: React.ReactNode;
};

/**
 * Dropdown pilihan tunggal pengganti <select> bawaan: popover di desktop,
 * bottom sheet di mobile, navigasi keyboard (↑↓ Home End Enter Esc,
 * ketik huruf untuk melompat), opsi pencarian, dan atribut ARIA listbox.
 */
export function Select<V extends string>({
  value,
  onChange,
  options,
  placeholder = "Pilih…",
  searchable,
  searchPlaceholder = "Cari…",
  disabled,
  loading,
  invalid,
  size = "md",
  sheetTitle,
  emptyText = "Tidak ada pilihan",
  className,
  id,
  appearance = "input",
  leading,
  ...aria
}: SelectProps<V>) {
  const autoId = useId();
  const listId = (id ?? autoId) + "-list";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: "", at: 0 });
  const mobile = useIsMobile();

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q));
  }, [options, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);
  useDismiss(open, [triggerRef, panelRef], close);
  useScrollLock(open && mobile);

  const openPanel = () => {
    if (disabled || loading) return;
    place();
    const idx = Math.max(0, options.findIndex((o) => o.value === value));
    setActive(idx);
    setOpen(true);
  };

  // Popover dirender di portal (position: fixed) supaya tidak terpotong oleh
  // container yang overflow (mis. isi dialog).
  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom;
    const up = below < 300 && r.top > below;
    const width = Math.max(r.width, appearance === "chip" ? 256 : 0);
    const left = Math.min(r.left, window.innerWidth - width - 8);
    setPos(up ? { left, width, bottom: window.innerHeight - r.top + 6 } : { left, width, top: r.bottom + 6 });
  }, [appearance]);

  useEffect(() => {
    if (!open || mobile) return;
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, mobile, place]);

  useEffect(() => {
    if (!open) return;
    if (searchable) searchRef.current?.focus();
    else listRef.current?.focus();
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  useEffect(() => setActive(0), [query]);

  const choose = (o: SelectOption<V> | undefined) => {
    if (!o || o.disabled) return;
    onChange(o.value);
    close();
    triggerRef.current?.focus();
  };

  const move = (delta: number) => {
    if (!filtered.length) return;
    let i = active;
    for (let n = 0; n < filtered.length; n++) {
      i = (i + delta + filtered.length) % filtered.length;
      if (!filtered[i].disabled) break;
    }
    setActive(i);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openPanel();
        else move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) openPanel();
        else move(-1);
        break;
      case "Home":
        if (open) (e.preventDefault(), setActive(0));
        break;
      case "End":
        if (open) (e.preventDefault(), setActive(filtered.length - 1));
        break;
      case "Enter":
      case " ":
        if (e.key === " " && searchable && open) return;
        e.preventDefault();
        if (open) choose(filtered[active]);
        else openPanel();
        break;
      case "Escape":
        if (open) (e.preventDefault(), close());
        break;
      case "Tab":
        if (open) close();
        break;
      default:
        if (!searchable && open && e.key.length === 1) {
          const now = e.timeStamp;
          const t = typeahead.current;
          t.text = now - t.at > 600 ? e.key.toLowerCase() : t.text + e.key.toLowerCase();
          t.at = now;
          const i = filtered.findIndex((o) => o.label.toLowerCase().startsWith(t.text));
          if (i >= 0) setActive(i);
        }
    }
  };

  const list = (
    <ul
      ref={listRef}
      id={listId}
      role="listbox"
      tabIndex={-1}
      aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
      onKeyDown={onKeyDown}
      className="max-h-[min(320px,55vh)] overflow-y-auto overscroll-contain p-1.5 outline-none"
    >
      {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">{emptyText}</li>}
      {filtered.map((o, i) => {
        const isSel = o.value === value;
        return (
          <li
            key={o.value}
            id={`${listId}-${i}`}
            data-index={i}
            role="option"
            aria-selected={isSel}
            aria-disabled={o.disabled || undefined}
            onPointerMove={() => !o.disabled && setActive(i)}
            onClick={() => choose(o)}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              i === active && "bg-stone",
              isSel && "font-semibold",
              o.disabled && "cursor-not-allowed opacity-40"
            )}
          >
            {o.icon && <span className="shrink-0 text-muted">{o.icon}</span>}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{o.label}</span>
              {o.description && <span className="truncate text-xs font-normal text-muted">{o.description}</span>}
            </span>
            {isSel && <Check className="size-4 shrink-0" aria-hidden />}
          </li>
        );
      })}
    </ul>
  );

  const search = searchable && (
    <div className="border-b border-line p-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={searchPlaceholder}
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-autocomplete="list"
          className="h-10 w-full rounded-lg bg-stone pl-9 pr-3 text-ink outline-none placeholder:text-faint"
        />
      </div>
    </div>
  );

  const triggerCls =
    appearance === "chip"
      ? cn(
          "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition-colors",
          selected && selected.value !== "" ? "border-ink bg-ink text-lime" : "border-line bg-stone text-ink-3 hover:border-line-strong"
        )
      : cn(
          "flex w-full items-center gap-2 rounded-xl border bg-white px-3.5 text-left transition-colors outline-none",
          size === "sm" ? "h-10 text-[13px]" : "h-12",
          open ? "border-ink" : invalid ? "border-danger" : "border-line hover:border-line-strong",
          (disabled || loading) && "cursor-not-allowed bg-stone text-muted"
        );

  return (
    <div className={cn("relative", appearance === "chip" ? "inline-block" : "w-full", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        aria-label={aria["aria-label"]}
        aria-describedby={aria["aria-describedby"]}
        disabled={disabled}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={onKeyDown}
        className={triggerCls}
      >
        {leading && <span className="shrink-0 text-muted">{leading}</span>}
        <span className={cn("min-w-0 flex-1 truncate", !selected && appearance === "input" && "text-faint")}>
          {selected ? selected.label : placeholder}
        </span>
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted" aria-hidden />
        ) : (
          <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
        )}
      </button>

      {open &&
        !mobile &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
            className="z-[120] overflow-hidden rounded-xl border border-line bg-white shadow-pop animate-pop-in"
          >
            {search}
            {list}
          </div>,
          document.body
        )}

      {open &&
        mobile &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={close} />
            <div
              ref={panelRef}
              role="dialog"
              aria-modal
              aria-label={sheetTitle ?? placeholder}
              className="relative max-h-[80vh] rounded-t-3xl bg-white pb-safe animate-sheet-in"
            >
              <div className="flex items-center justify-between px-4 pb-1 pt-3">
                <span className="text-base font-bold">{sheetTitle ?? placeholder}</span>
                <button type="button" aria-label="Tutup" onClick={close} className="grid size-10 place-items-center rounded-full hover:bg-stone">
                  <X className="size-5" />
                </button>
              </div>
              {search}
              {list}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

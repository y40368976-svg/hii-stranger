"use client";
import React, { useRef, useState, useSyncExternalStore } from "react";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, ImagePlus, Link2, Loader2, Search, Trash2 } from "lucide-react";
import { adminService } from "@/services";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/misc";

/** Jalankan aksi dengan toast sukses/gagal. undefined = gagal. */
export async function run<T>(
  fn: () => Promise<T>,
  success?: string,
): Promise<T | true | undefined> {
  try {
    const r = await fn();
    if (success) toast.success(success);
    return r === undefined ? true : r;
  } catch (err) {
    toast.error(errorMessage(err));
    return undefined;
  }
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="break-words font-display text-[28px] font-extrabold uppercase leading-none tracking-tight md:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border border-line bg-white", className)}>
      {children}
    </div>
  );
}

/** Tabel responsif: di layar kecil baris tetap bisa digeser horizontal. */
export function Table({
  head,
  children,
  className,
}: {
  head: React.ReactNode[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-160 text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            {head.map((h, i) => (
              <th
                key={i}
                className="caps whitespace-nowrap px-4 py-3 font-bold text-muted first:pl-5 last:pr-5"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export const td = "px-4 py-3.5 align-middle first:pl-5 last:pr-5";

/** Daftar kartu untuk layar kecil (pengganti tabel di < md). */
export function MobileList({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-line md:hidden">{children}</ul>;
}

/** Bungkus tabel supaya hanya tampil di md ke atas. */
export function DesktopOnly({ children }: { children: React.ReactNode }) {
  return <div className="hidden md:block">{children}</div>;
}

/**
 * Field gambar: unggah ke Cloudinary atau tempel URL, dengan pratinjau dan
 * informasi ukuran yang direkomendasikan.
 */
export function ImageField({
  value,
  onChange,
  recommended,
  aspect = "aspect-[16/9]",
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  recommended?: string;
  aspect?: string;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dims, setDims] = useState<string | null>(null);
  const [mode, setMode] = useState<"upload" | "url">("upload");

  const upload = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return toast.error("Gunakan JPG, PNG, atau WebP.");
    if (file.size > 5 * 1024 * 1024)
      return toast.error("Ukuran gambar maksimal 5 MB.");
    setBusy(true);
    try {
      const { url } = await adminService.uploadImage(file);
      onChange(url);
      toast.success("Gambar terunggah.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {label && <p className="mb-1.5 text-[13px] font-semibold">{label}</p>}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => (upload(e.target.files?.[0]), (e.target.value = ""))}
      />
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-dashed border-line-strong bg-stone",
          aspect,
        )}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className="size-full object-cover"
              onLoad={(e) =>
                setDims(
                  `${e.currentTarget.naturalWidth}×${e.currentTarget.naturalHeight}px`,
                )
              }
            />
            <div className="absolute right-2 top-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => ref.current?.click()}
                className="caps rounded-lg bg-white/90 px-2.5 py-1.5 backdrop-blur hover:bg-white"
              >
                Ganti
              </button>
              <button
                type="button"
                aria-label="Hapus gambar"
                onClick={() => (onChange(""), setDims(null))}
                className="grid size-8 place-items-center rounded-lg bg-white/90 text-danger backdrop-blur hover:bg-white"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            {dims && (
              <span className="caps absolute bottom-2 left-2 rounded-md bg-ink/80 px-2 py-1 text-canvas">
                {dims}
              </span>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="flex size-full flex-col items-center justify-center gap-2 p-4 text-center text-muted hover:text-ink"
          >
            {busy ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <ImagePlus className="size-6" />
            )}
            <span className="text-sm font-semibold">
              {busy ? "Mengunggah…" : "Unggah gambar"}
            </span>
            {recommended && (
              <span className="text-xs">Rekomendasi {recommended}</span>
            )}
          </button>
        )}
        {busy && value && (
          <div className="absolute inset-0 grid place-items-center bg-white/60">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {recommended && (
          <p className="text-xs text-muted">
            Ukuran ideal: <b className="text-ink">{recommended}</b> ·
            JPG/PNG/WebP ≤ 5 MB
          </p>
        )}
        <button
          type="button"
          onClick={() => setMode(mode === "url" ? "upload" : "url")}
          className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-semibold underline underline-offset-4"
        >
          <Link2 className="size-3" /> {mode === "url" ? "Tutup" : "Pakai URL"}
        </button>
      </div>
      {mode === "url" && (
        <Input
          className="mt-2 h-10"
          placeholder="https://…"
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          aria-label="URL gambar"
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ringkasan mobile: 5 item per halaman + kolom cari dengan tombol.    */
/* Hanya berlaku di < md (768px); desktop memakai Pagination biasa.    */
/* ------------------------------------------------------------------ */

export const MOBILE_PAGE = 5;
const MOBILE_MQ = "(max-width: 767px)";

function subscribeMobile(cb: () => void) {
  const m = window.matchMedia(MOBILE_MQ);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

/** true di layar < md. Di server selalu false. */
export function useIsMobile() {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(MOBILE_MQ).matches,
    () => false,
  );
}

/**
 * Limit paginasi server: 5 di mobile, `desktop` di layar besar.
 * `onChange` dipanggil (mis. kembali ke halaman 1) saat limit berganti.
 */
export function useMobileLimit(desktop: number, onChange: () => void) {
  const mobile = useIsMobile();
  const limit = mobile ? MOBILE_PAGE : desktop;
  const [prev, setPrev] = useState(limit);
  if (prev !== limit) {
    setPrev(limit);
    onChange();
  }
  return { mobile, limit };
}

/** Kolom cari khusus mobile: pencarian jalan saat tombol "Cari" / Enter. */
export function MobileSearch({
  value,
  onSearch,
  placeholder,
  className,
}: {
  value: string;
  onSearch: (q: string) => void;
  placeholder: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <form
      role="search"
      className={cn("flex min-w-0 gap-2 md:hidden", className)}
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(draft.trim());
      }}
    >
      <div className="min-w-0 flex-1">
        <Input
          type="search"
          enterKeyHint="search"
          leading={<Search className="size-4" />}
          className="h-11"
          placeholder={placeholder}
          aria-label={placeholder}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            // Mengosongkan kolom langsung menampilkan semua lagi.
            if (!e.target.value && value) onSearch("");
          }}
        />
      </div>
      <Button type="submit" variant="dark" className="shrink-0">
        Cari
      </Button>
    </form>
  );
}

/** Navigasi "sebelumnya / 5 berikutnya" khusus mobile. */
export function MobilePager({
  page,
  total,
  size = MOBILE_PAGE,
  onPage,
  className,
}: {
  page: number;
  total: number;
  size?: number;
  onPage: (p: number) => void;
  className?: string;
}) {
  if (total <= size) return null;
  const pages = Math.ceil(total / size);
  const from = (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  const go = (p: number) => {
    onPage(p);
    // Kembali ke awal daftar supaya item baru langsung terlihat.
    requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  };
  return (
    <nav
      aria-label="Halaman daftar"
      className={cn("flex items-center gap-2 border-t border-line p-3 md:hidden", className)}
    >
      <Button
        variant="soft"
        className="shrink-0 px-3"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
        aria-label={size + " sebelumnya"}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <p className="min-w-0 flex-1 text-center text-xs text-muted tabular">
        {from}–{to} dari {total}
      </p>
      <Button
        variant="soft"
        className="shrink-0"
        disabled={page >= pages}
        onClick={() => go(page + 1)}
      >
        {size} berikutnya <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}

/** Pager gabungan untuk daftar berpaginasi server: Pagination di desktop, MobilePager di mobile. */
export function ListPager({
  page,
  limit,
  total,
  onPage,
}: {
  page: number;
  limit: number;
  total: number;
  onPage: (p: number) => void;
}) {
  return (
    <>
      {total > limit && (
        <div className="hidden border-t border-line p-4 md:block">
          <Pagination page={page} limit={limit} total={total} onPage={onPage} />
        </div>
      )}
      <MobilePager page={page} size={limit} total={total} onPage={onPage} />
    </>
  );
}

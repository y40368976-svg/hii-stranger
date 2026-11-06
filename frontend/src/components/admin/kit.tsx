"use client";
import React, { useRef, useState } from "react";
import toast from "react-hot-toast";
import { ImagePlus, Link2, Loader2, Trash2 } from "lucide-react";
import { adminService } from "@/services";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/Field";

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
      <div>
        <h1 className="font-display text-[28px] font-extrabold uppercase leading-none tracking-tight md:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
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

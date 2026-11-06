"use client";
import React, { useEffect, useRef, useState } from "react";
import { FileText, ImagePlus, RefreshCw, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { paymentService } from "@/services";
import { errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { ApiPayment } from "@/types/api";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const sizeLabel = (n: number) => (n < 1024 * 1024 ? Math.round(n / 1024) + " KB" : (n / 1024 / 1024).toFixed(1) + " MB");

/**
 * Unggah bukti bayar: pilih/seret berkas -> pratinjau -> tombol Kirim.
 * Berkas baru dikirim setelah pelanggan menekan Kirim (tidak otomatis).
 */
export function ProofUpload({ orderId, onUploaded }: { orderId: string; onUploaded: (p: ApiPayment) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (f: File | undefined) => {
    setError(null);
    if (!f) return;
    if (!TYPES.includes(f.type)) return setError("Format tidak didukung. Pakai JPG, PNG, WebP, atau PDF.");
    if (f.size > MAX_BYTES) return setError(`Ukuran ${sizeLabel(f.size)} melebihi batas 2 MB. Kirim tangkapan layar yang lebih kecil.`);
    setFile(f);
  };

  const send = async () => {
    if (!file) return;
    setSending(true);
    try {
      const p = await paymentService.uploadProof(orderId, file);
      toast.success("Bukti terkirim. Admin akan memverifikasi.");
      setFile(null);
      onUploaded(p);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => (e.preventDefault(), setDrag(true))}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
            drag ? "border-ink bg-lime/20" : "border-line-strong bg-stone hover:border-ink"
          )}
        >
          <span className="grid size-12 place-items-center rounded-xl bg-ink text-lime">
            <ImagePlus className="size-6" />
          </span>
          <span className="text-[15px] font-semibold">Pilih tangkapan layar bukti bayar</span>
          <span className="text-xs text-muted">Ketuk untuk membuka galeri · atau seret berkas ke sini · JPG, PNG, WebP, PDF maks 2 MB</span>
        </button>
      ) : (
        <div className="rounded-2xl border border-ink bg-white p-3">
          <div className="flex items-center gap-3">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-stone">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Pratinjau bukti" className="size-full object-cover" />
              ) : (
                <FileText className="size-8 text-muted" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{file.name}</p>
              <p className="text-xs text-muted">{sizeLabel(file.size)} · siap dikirim</p>
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4"
              >
                <RefreshCw className="size-3" /> Ganti berkas
              </button>
            </div>
            <button
              type="button"
              aria-label="Batalkan berkas"
              onClick={() => setFile(null)}
              className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-stone"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-[13px] font-medium text-danger">{error}</p>}

      <Button variant="primary" size="lg" block className="mt-4" disabled={!file} loading={sending} onClick={send}>
        <Send className="size-4" /> Kirim bukti pembayaran
      </Button>
      <p className="mt-2 text-center text-xs text-muted">Pastikan nominal, tanggal, dan status &quot;Berhasil&quot; terlihat jelas.</p>
    </div>
  );
}

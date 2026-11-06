"use client";
import { useState } from "react";
import { MailWarning } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/app/context/AuthContext";
import { authService } from "@/services";
import { errorMessage } from "@/lib/api";

/** Pengingat untuk pelanggan yang belum memverifikasi email (wajib sebelum checkout). */
export default function VerifyNotice() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  if (!user || user.role !== "customer" || user.email_verified_at) return null;

  return (
    <div className="border-b border-line bg-ink text-canvas">
      <div className="container-x flex flex-col gap-2 py-2.5 text-[13px] sm:flex-row sm:items-center sm:gap-4">
        <span className="flex items-center gap-2">
          <MailWarning className="size-4 shrink-0 text-lime" aria-hidden />
          <span>
            Verifikasi email <b className="font-semibold">{user.email}</b> untuk bisa checkout.
          </span>
        </span>
        <button
          type="button"
          disabled={busy || sent}
          onClick={async () => {
            setBusy(true);
            try {
              await authService.resendVerification();
              setSent(true);
              toast.success("Tautan verifikasi dikirim. Cek inbox/spam.");
            } catch (e) {
              toast.error(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
          className="caps self-start rounded-full bg-lime px-3 py-1.5 text-ink disabled:opacity-60 sm:ml-auto"
        >
          {sent ? "Terkirim" : busy ? "Mengirim…" : "Kirim ulang tautan"}
        </button>
      </div>
    </div>
  );
}

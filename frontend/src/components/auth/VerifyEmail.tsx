"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Loader2, MailX } from "lucide-react";
import { authService } from "@/services";
import { useAuth } from "@/app/context/AuthContext";
import { errorMessage } from "@/lib/api";
import { LinkButton } from "@/components/ui/Button";
import { AuthShell } from "./AuthShell";

export default function VerifyEmail() {
  const token = useSearchParams().get("token") ?? "";
  const { user, refreshUser } = useAuth();
  const [status, setState] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMsg] = useState("");
  const state = token ? status : "error";
  const msg = token ? message : "Tautan verifikasi tidak lengkap.";
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !token) return;
    ran.current = true;
    authService
      .verifyEmail(token)
      .then(() => {
        setState("ok");
        refreshUser().catch(() => {});
      })
      .catch((e) => {
        setState("error");
        setMsg(errorMessage(e));
      });
  }, [token, refreshUser]);

  return (
    <AuthShell eyebrow="Verifikasi email" title={state === "ok" ? "Email terverifikasi" : state === "error" ? "Tautan tidak berlaku" : "Memverifikasi…"}>
      {state === "loading" && <Loader2 className="size-8 animate-spin text-muted" />}
      {state === "ok" && (
        <div>
          <BadgeCheck className="mb-4 size-10" />
          <p className="text-[15px] text-ink-3">Akunmu sudah aktif penuh. Sekarang kamu bisa checkout dan membayar dengan QRIS.</p>
          <div className="mt-7 flex flex-wrap gap-2">
            <LinkButton href={user ? "/checkout" : "/signin"} variant="primary" size="lg">
              {user ? "Lanjut checkout" : "Masuk"}
            </LinkButton>
            <LinkButton href="/shop" variant="soft" size="lg">
              Katalog
            </LinkButton>
          </div>
        </div>
      )}
      {state === "error" && (
        <div>
          <MailX className="mb-4 size-10 text-danger" />
          <p className="text-[15px] text-ink-3">{msg}</p>
          <p className="mt-2 text-sm text-muted">Masuk lalu minta tautan baru dari halaman Akun &gt; Profil.</p>
          <LinkButton href={user ? "/my-account?tab=profile" : "/signin?next=/my-account?tab=profile"} variant="dark" size="lg" className="mt-7">
            {user ? "Kirim ulang tautan" : "Masuk"}
          </LinkButton>
        </div>
      )}
    </AuthShell>
  );
}

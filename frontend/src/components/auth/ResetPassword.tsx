"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, MailX } from "lucide-react";
import { authService } from "@/services";
import { errorMessage } from "@/lib/api";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { AuthShell, PasswordInput } from "./AuthShell";

export default function ResetPassword() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"form" | "ok" | "invalid">(token ? "form" : "invalid");

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;

  if (state === "ok")
    return (
      <AuthShell eyebrow="Atur ulang password" title="Password diperbarui">
        <div className="flex items-start gap-3 rounded-2xl bg-stone p-4">
          <BadgeCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p className="text-sm text-ink-3">Password baru sudah aktif. Silakan masuk memakai password tersebut.</p>
        </div>
        <LinkButton href="/signin" variant="dark" size="lg" block className="mt-6">
          Masuk
        </LinkButton>
      </AuthShell>
    );

  if (state === "invalid")
    return (
      <AuthShell eyebrow="Atur ulang password" title="Tautan tidak berlaku">
        <div className="flex items-start gap-3 rounded-2xl bg-danger-soft p-4">
          <MailX className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
          <p className="text-sm text-ink-3">{error ?? "Tautan reset tidak lengkap."} Minta tautan baru, tautan hanya berlaku 1 jam dan sekali pakai.</p>
        </div>
        <LinkButton href="/forgot-password" variant="dark" size="lg" block className="mt-6">
          Minta tautan baru
        </LinkButton>
      </AuthShell>
    );

  return (
    <AuthShell eyebrow="Atur ulang password" title="Buat password baru">
      <form
        className="space-y-4"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (tooShort || mismatch || !password) return;
          setError(null);
          setBusy(true);
          try {
            await authService.resetPassword(token, password);
            setState("ok");
          } catch (err) {
            const status = (err as { status?: number })?.status;
            setError(errorMessage(err));
            if (status === 410) setState("invalid");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Password baru" hint="Minimal 8 karakter." error={tooShort ? "Password minimal 8 karakter." : undefined}>
          {(id) => <PasswordInput id={id} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />}
        </Field>
        <Field label="Ulangi password baru" error={mismatch ? "Password tidak sama." : undefined}>
          {(id) => <PasswordInput id={id} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />}
        </Field>
        {error && <p className="rounded-xl bg-danger-soft px-3 py-2.5 text-[13px] font-medium text-danger">{error}</p>}
        <Button type="submit" variant="dark" size="lg" block loading={busy} disabled={!password || !confirm || tooShort || mismatch}>
          Simpan password
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/signin" className="font-semibold text-ink underline underline-offset-4">
          Kembali ke halaman masuk
        </Link>
      </p>
    </AuthShell>
  );
}

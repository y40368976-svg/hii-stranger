"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { authService } from "@/services";
import { errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AuthShell } from "./AuthShell";

const RESEND_SECONDS = 60;

export default function ForgotPassword() {
  const [email, setEmail] = useState(useSearchParams().get("email") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async (target: string) => {
    setError(null);
    setBusy(true);
    try {
      await authService.forgotPassword(target);
      setSentTo(target);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (sentTo)
    return (
      <AuthShell eyebrow="Lupa password" title="Cek email kamu">
        <div className="flex items-start gap-3 rounded-2xl bg-stone p-4">
          <MailCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p className="text-sm text-ink-3">
            Kalau <b className="break-all text-ink">{sentTo}</b> terdaftar, tautan untuk membuat password baru sudah kami kirim. Tautan berlaku 1 jam.
          </p>
        </div>
        <p className="mt-4 text-[13px] text-muted">Tidak ada di kotak masuk? Cek folder spam atau promosi.</p>
        {error && <p className="mt-4 rounded-xl bg-danger-soft px-3 py-2.5 text-[13px] font-medium text-danger">{error}</p>}
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" size="lg" block loading={busy} disabled={cooldown > 0} onClick={() => send(sentTo)}>
            {cooldown > 0 ? `Kirim ulang (${cooldown} dtk)` : "Kirim ulang"}
          </Button>
          <Button type="button" variant="dark" size="lg" block onClick={() => setSentTo(null)}>
            Ganti email
          </Button>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Sudah ingat?{" "}
          <Link href="/signin" className="font-semibold text-ink underline underline-offset-4">
            Masuk
          </Link>
        </p>
      </AuthShell>
    );

  return (
    <AuthShell eyebrow="Lupa password" title="Atur ulang password" aside="Masukkan email akunmu. Kami kirim tautan untuk membuat password baru.">
      <p className="mb-5 text-sm text-muted">Masukkan email akun kamu, nanti kami kirim tautan untuk membuat password baru.</p>
      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) send(email.trim());
        }}
      >
        <Field label="Email">
          {(id) => (
            <Input id={id} type="email" autoComplete="email" inputMode="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          )}
        </Field>
        {error && <p className="rounded-xl bg-danger-soft px-3 py-2.5 text-[13px] font-medium text-danger">{error}</p>}
        <Button type="submit" variant="dark" size="lg" block loading={busy} disabled={!email.trim()}>
          Kirim tautan reset
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Sudah ingat?{" "}
        <Link href="/signin" className="font-semibold text-ink underline underline-offset-4">
          Masuk
        </Link>
      </p>
    </AuthShell>
  );
}

"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { ApiError, errorMessage } from "@/lib/api";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { AuthShell, PasswordInput } from "./AuthShell";
import { safeNext } from "./Signin";

function strength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

export default function Signup() {
  const { register } = useAuth();
  const next = safeNext(useSearchParams().get("next"));
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const st = strength(f.password);

  if (done)
    return (
      <AuthShell eyebrow="Satu langkah lagi" title="Cek email kamu">
        <div className="flex flex-col items-start">
          <span className="mb-5 grid size-14 place-items-center rounded-2xl bg-ink text-lime">
            <MailCheck className="size-6" />
          </span>
          <p className="text-[15px] leading-relaxed text-ink-3">
            Kami mengirim tautan verifikasi ke <b className="text-ink">{done}</b>. Klik tautannya untuk mengaktifkan checkout. Tidak ada di inbox? Cek folder spam/promosi.
          </p>
          <p className="mt-3 text-sm text-muted">Kamu sudah masuk dan bisa menyimpan barang ke tas sambil menunggu.</p>
          <LinkButton href={next ?? "/shop"} variant="dark" size="lg" className="mt-7">
            Lanjut belanja
          </LinkButton>
        </div>
      </AuthShell>
    );

  const set = (k: keyof typeof f, v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  return (
    <AuthShell eyebrow="Daftar" title="Buat akun" aside="Verifikasi email sekali, lalu checkout dengan QRIS dalam hitungan menit.">
      <form
        className="space-y-4"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const errs: Record<string, string> = {};
          if (!f.name.trim()) errs.name = "Nama wajib diisi.";
          if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) errs.email = "Format email tidak valid.";
          if (f.password.length < 8) errs.password = "Minimal 8 karakter.";
          if (f.phone && !/^\+?[0-9 ()-]{6,20}$/.test(f.phone.trim())) errs.phone = "Nomor HP tidak valid.";
          setErrors(errs);
          if (Object.keys(errs).length) return;
          setBusy(true);
          try {
            const u = await register({ name: f.name.trim(), email: f.email.trim(), password: f.password, phone: f.phone.trim() || null });
            setDone(u.email);
          } catch (err) {
            if (err instanceof ApiError && err.details.length) {
              setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
            } else if (err instanceof ApiError && err.status === 409) {
              setErrors({ email: err.message });
            } else setErrors({ form: errorMessage(err) });
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Nama lengkap" required error={errors.name}>
          {(id, d) => <Input id={id} aria-describedby={d} autoComplete="name" value={f.name} invalid={!!errors.name} onChange={(e) => set("name", e.target.value)} />}
        </Field>
        <Field label="Email" required error={errors.email} hint="Tautan verifikasi dikirim ke sini.">
          {(id, d) => <Input id={id} aria-describedby={d} type="email" inputMode="email" autoComplete="email" value={f.email} invalid={!!errors.email} onChange={(e) => set("email", e.target.value)} />}
        </Field>
        <Field label="No. HP (opsional)" error={errors.phone}>
          {(id, d) => <Input id={id} aria-describedby={d} type="tel" autoComplete="tel" value={f.phone} invalid={!!errors.phone} onChange={(e) => set("phone", e.target.value)} />}
        </Field>
        <Field label="Password" required error={errors.password}>
          {(id, d) => (
            <div>
              <PasswordInput id={id} aria-describedby={d} autoComplete="new-password" value={f.password} invalid={!!errors.password} onChange={(e) => set("password", e.target.value)} />
              {f.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="grid flex-1 grid-cols-4 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={cn("h-1 rounded-full", i < st ? (st >= 3 ? "bg-success" : "bg-ink") : "bg-line")} />
                    ))}
                  </div>
                  <span className="text-xs text-muted">{["Terlalu lemah", "Lemah", "Cukup", "Kuat", "Sangat kuat"][st]}</span>
                </div>
              )}
            </div>
          )}
        </Field>
        {errors.form && <p className="rounded-xl bg-danger-soft px-3 py-2.5 text-[13px] font-medium text-danger">{errors.form}</p>}
        <Button type="submit" variant="dark" size="lg" block loading={busy}>
          Daftar
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Sudah punya akun?{" "}
        <Link href={"/signin" + (next ? "?next=" + encodeURIComponent(next) : "")} className="font-semibold text-ink underline underline-offset-4">
          Masuk
        </Link>
      </p>
    </AuthShell>
  );
}

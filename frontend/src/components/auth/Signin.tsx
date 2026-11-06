"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/app/context/AuthContext";
import { errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AuthShell, PasswordInput } from "./AuthShell";

/** Hanya path internal yang boleh dipakai sebagai tujuan setelah login. */
export function safeNext(v: string | null) {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : null;
}

export default function Signin() {
  const { login, user, loading, isStaff, isCopywriter } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    router.replace(isStaff ? (isCopywriter ? "/admin?tab=journal" : "/admin") : next ?? "/");
  }, [loading, user, isStaff, isCopywriter, next, router]);

  return (
    <AuthShell eyebrow="Masuk" title="Selamat datang lagi" aside="Pantau pesanan, simpan tas belanja di semua perangkat, dan terima resi lewat email.">
      <form
        className="space-y-4"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setBusy(true);
          try {
            const u = await login(email.trim(), password);
            toast.success("Halo, " + u.name.split(" ")[0]);
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Email">
          {(id) => <Input id={id} type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
        </Field>
        <Field label="Password">
          {(id) => <PasswordInput id={id} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
        </Field>
        {error && <p className="rounded-xl bg-danger-soft px-3 py-2.5 text-[13px] font-medium text-danger">{error}</p>}
        <Button type="submit" variant="dark" size="lg" block loading={busy} disabled={!email || !password}>
          Masuk
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Belum punya akun?{" "}
        <Link href={"/signup" + (next ? "?next=" + encodeURIComponent(next) : "")} className="font-semibold text-ink underline underline-offset-4">
          Daftar gratis
        </Link>
      </p>
    </AuthShell>
  );
}

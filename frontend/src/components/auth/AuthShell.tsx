import React from "react";
import { PasswordInputInner } from "./PasswordInputInner";

/** Tata letak halaman masuk/daftar: panel editorial (desktop) + formulir. */
export function AuthShell({
  eyebrow,
  title,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="container-x grid gap-8 py-8 md:py-14 lg:grid-cols-[1fr_480px] lg:items-stretch">
      <div className="relative hidden overflow-hidden rounded-3xl bg-ink p-12 text-canvas lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -bottom-32 -left-24 size-105 rounded-full bg-lime/15 blur-3xl" />
        <p className="caps text-lime">Hii Stranger · Member</p>
        <div className="relative">
          <p className="font-display text-6xl font-extrabold uppercase leading-[0.9] tracking-tight">
            Rilis terbatas.
            <br />
            Akses duluan.
          </p>
          {aside && <div className="mt-6 max-w-sm text-canvas/70">{aside}</div>}
        </div>
      </div>
      <div className="rounded-3xl border border-line bg-white p-6 sm:p-10">
        <p className="caps mb-2 text-muted">{eyebrow}</p>
        <h1 className="font-display text-[32px] font-extrabold uppercase leading-none tracking-tight">
          {title}
        </h1>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export const PasswordInput = PasswordInputInner;

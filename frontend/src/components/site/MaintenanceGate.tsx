"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wrench } from "lucide-react";
import { settingService } from "@/services";
import { useAuth } from "@/app/context/AuthContext";
import type { ApiSiteSettings } from "@/types/api";

/** Mode maintenance: pengunjung melihat pesan; staf tetap bisa memakai situs. */
export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ApiSiteSettings | null>(null);
  const { isStaff } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    settingService.get().then(setSettings).catch(() => {});
  }, []);

  const open = pathname?.startsWith("/signin");
  if (settings?.maintenance_mode && !isStaff && !open) {
    return (
      <main className="container-x grid min-h-[70vh] place-items-center py-20">
        <div className="max-w-lg text-center">
          <span className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-ink text-lime">
            <Wrench className="size-7" />
          </span>
          <p className="caps mb-2 text-muted">Sedang dirapikan</p>
          <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight">Kembali sebentar lagi</h1>
          <p className="mt-4 text-muted">{settings.maintenance_message}</p>
          <Link href="/signin" className="mt-8 inline-block text-sm font-semibold underline underline-offset-4">
            Masuk sebagai staf
          </Link>
        </div>
      </main>
    );
  }
  return <>{children}</>;
}

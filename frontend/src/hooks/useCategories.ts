"use client";
import { useSyncExternalStore } from "react";
import { categoryService } from "@/services";
import type { ApiCategory } from "@/types/api";

const EMPTY: ApiCategory[] = [];
let cache: ApiCategory[] | null = null;
let pending = false;
const subs = new Set<() => void>();

function subscribe(cb: () => void) {
  subs.add(cb);
  if (!cache && !pending) {
    pending = true;
    categoryService
      .list()
      .then((r) => {
        cache = r.data.filter((c) => c.is_active);
        subs.forEach((f) => f());
      })
      .catch(() => {})
      .finally(() => {
        pending = false;
      });
  }
  return () => {
    subs.delete(cb);
  };
}

/** Kategori aktif (di-cache per sesi halaman). */
export function useCategories() {
  // Snapshot server selalu [] supaya render pertama di client sama dengan HTML
  // server; cache baru dipakai setelah hydration.
  return useSyncExternalStore(
    subscribe,
    () => cache ?? EMPTY,
    () => EMPTY,
  );
}

"use client";
import { useEffect, useState } from "react";
import { categoryService } from "@/services";
import type { ApiCategory } from "@/types/api";

let cache: ApiCategory[] | null = null;

/** Kategori aktif (di-cache per sesi halaman). */
export function useCategories() {
  // Selalu mulai dari [] supaya render pertama di client sama dengan HTML server.
  // Cache baru dipakai setelah mount (kalau dipakai di useState → hydration mismatch).
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  useEffect(() => {
    if (cache) {
      setCategories(cache);
      return;
    }
    categoryService
      .list()
      .then((r) => {
        cache = r.data.filter((c) => c.is_active);
        setCategories(cache);
      })
      .catch(() => {});
  }, []);
  return categories;
}

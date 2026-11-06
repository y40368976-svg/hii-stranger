"use client";
import { useEffect, useState } from "react";
import { categoryService } from "@/services";
import type { ApiCategory } from "@/types/api";

let cache: ApiCategory[] | null = null;

/** Kategori aktif (di-cache per sesi halaman). */
export function useCategories() {
  const [categories, setCategories] = useState<ApiCategory[]>(cache ?? []);
  useEffect(() => {
    if (cache) return;
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

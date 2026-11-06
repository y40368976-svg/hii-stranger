"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/api";

/**
 * Jalankan fungsi async dan simpan hasil/error/loading. reload() memuat ulang.
 * fn dijalankan ulang setiap nilai deps berubah; hasil permintaan lama
 * diabaikan bila sudah ada permintaan yang lebih baru.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const seq = useRef(0);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  const reload = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const r = await fnRef.current();
      if (id === seq.current) setData(r);
    } catch (e) {
      if (id === seq.current) setError(errorMessage(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  const key = JSON.stringify(deps);
  useEffect(() => {
    if (enabled) void reload();
  }, [reload, enabled, key]);

  return { data, error, loading, reload, setData };
}

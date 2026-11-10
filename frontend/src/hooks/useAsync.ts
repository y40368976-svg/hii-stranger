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
  // busy: reload() manual sedang berjalan. settled: key deps yang permintaannya
  // sudah selesai; loading untuk permintaan otomatis diturunkan dari sini.
  const [busy, setBusy] = useState(false);
  const [settled, setSettled] = useState<string | null>(null);
  const key = JSON.stringify(deps);
  const seq = useRef(0);
  const fnRef = useRef(fn);
  const keyRef = useRef(key);
  useEffect(() => {
    fnRef.current = fn;
    keyRef.current = key;
  });

  const [prevEnabled, setPrevEnabled] = useState(enabled);
  if (prevEnabled !== enabled) {
    setPrevEnabled(enabled);
    if (!enabled) setSettled(null);
  }

  const exec = useCallback(async (k: string) => {
    const id = ++seq.current;
    try {
      const r = await fnRef.current();
      if (id === seq.current) {
        setData(r);
        setError(null);
      }
    } catch (e) {
      if (id === seq.current) setError(errorMessage(e));
    } finally {
      if (id === seq.current) {
        setBusy(false);
        setSettled(k);
      }
    }
  }, []);

  const reload = useCallback(async () => {
    setBusy(true);
    setError(null);
    await exec(keyRef.current);
  }, [exec]);

  useEffect(() => {
    if (enabled) void exec(key);
  }, [exec, enabled, key]);

  const pending = enabled && settled !== key;
  return { data, error: pending ? null : error, loading: busy || pending, reload, setData };
}

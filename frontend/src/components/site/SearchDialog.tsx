"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { productService } from "@/services";
import { useCategories } from "@/hooks/useCategories";
import { formatRupiah, finalPrice } from "@/lib/format";
import type { ApiProduct } from "@/types/api";
import { cdn } from "@/lib/img";

/** Pencarian cepat: hasil langsung saat mengetik + pintasan kategori. */
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ApiProduct[]>([]);
  const categories = useCategories();
  const router = useRouter();
  const term = q.trim();
  const short = term.length < 2;
  // Term terakhir yang permintaannya sudah selesai; loading diturunkan dari sini.
  const [settled, setSettled] = useState("");
  const loading = !short && settled !== term;

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setQ("");
  }
  const [prevShort, setPrevShort] = useState(short);
  if (short !== prevShort) {
    setPrevShort(short);
    if (short) {
      setResults([]);
      setSettled("");
    }
  }

  useEffect(() => {
    if (term.length < 2) return;
    const t = setTimeout(() => {
      productService
        .list({ q: term, limit: 6 })
        .then((r) => setResults(r.data))
        .catch(() => setResults([]))
        .finally(() => setSettled(term));
    }, 250);
    return () => clearTimeout(t);
  }, [term]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    onClose();
    router.push("/shop" + (term ? "?q=" + encodeURIComponent(term) : ""));
  };

  return (
    <Dialog open={open} onClose={onClose} title="Cari" size="lg">
      <form onSubmit={submit} className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <input
          autoFocus
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Hoodie, kargo, tee oversized…"
          className="h-14 w-full rounded-2xl border border-line bg-white pl-12 pr-4 text-base outline-none focus:border-ink"
          aria-label="Kata kunci produk"
        />
      </form>

      {q.trim().length >= 2 ? (
        <div className="mt-4">
          {loading && results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Mencari…</p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Tidak ada produk untuk “{q.trim()}”.</p>
          ) : (
            <ul className="divide-y divide-line">
              {results.map((p) => (
                <li key={p.id}>
                  <Link href={"/product/" + p.id} onClick={onClose} className="flex items-center gap-3 py-3 hover:opacity-80">
                    <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-stone-2">
                      {p.primary_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
          decoding="async" src={cdn(p.primary_image_url, 160)} alt="" className="size-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="font-display text-sm font-bold tabular">
                        {formatRupiah(finalPrice(p.price, p.discount_percent))}
                      </span>
                    </span>
                    <ArrowRight className="size-4 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={submit} className="mt-3 w-full rounded-xl bg-stone py-3 text-sm font-semibold hover:bg-stone-2">
            Lihat semua hasil
          </button>
        </div>
      ) : (
        categories.length > 0 && (
          <div className="mt-6">
            <p className="caps mb-3 text-muted">Jelajahi kategori</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={"/shop?category=" + c.id}
                  onClick={onClose}
                  className="inline-flex h-9 items-center rounded-full border border-line bg-stone px-4 text-[13px] font-semibold hover:border-ink"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )
      )}
    </Dialog>
  );
}

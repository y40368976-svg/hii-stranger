"use client";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownUp, SlidersHorizontal, X } from "lucide-react";
import { bannerService, productService } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import { useCategories } from "@/hooks/useCategories";
import { ProductCard, ProductCardSkeleton } from "@/components/site/ProductCard";
import { BannerLink, BannerPicture } from "@/components/site/BannerVisual";
import { Select } from "@/components/ui/Select";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { EmptyState, ErrorState, Pagination } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";

const PAGE_SIZE = 12;

const SORTS = [
  { value: "newest", label: "Terbaru" },
  { value: "price", label: "Harga terendah" },
  { value: "-price", label: "Harga tertinggi" },
  { value: "name", label: "Nama A–Z" },
];

const AVAILABILITY = [
  { value: "", label: "Semua ketersediaan" },
  { value: "ready", label: "Ready stock" },
  { value: "preorder", label: "Pre-order" },
];

export default function Shop() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const categories = useCategories();

  const category = sp.get("category") ?? "";
  const q = sp.get("q") ?? "";
  const sort = sp.get("sort") ?? "newest";
  const availability = sp.get("availability") ?? "";
  const min = sp.get("min") ?? "";
  const max = sp.get("max") ?? "";
  // ?new=1: "Baru datang" = produk yang dibuat 7 hari terakhir.
  const fresh = sp.get("new") === "1";
  const page = Math.max(1, Number(sp.get("page")) || 1);

  const setParams = (patch: Record<string, string | number | null>, resetPage = true) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, String(v));
    }
    if (resetPage && !("page" in patch)) next.delete("page");
    const qs = next.toString();
    router.replace(pathname + (qs ? "?" + qs : ""), { scroll: !("page" in patch) ? false : true });
  };

  const list = useAsync(
    () =>
      productService.list({
        category_id: category || undefined,
        q: q || undefined,
        sort,
        availability_type: availability || undefined,
        min_price: min ? Number(min) : undefined,
        max_price: max ? Number(max) : undefined,
        new_days: fresh ? 7 : undefined,
        page,
        limit: PAGE_SIZE,
      }),
    [category, q, sort, availability, min, max, fresh, page]
  );
  const banner = useAsync(() => bannerService.live("catalog"), []);
  const catBanner = banner.data?.[0];

  const [filterOpen, setFilterOpen] = useState(false);
  const activeCat = categories.find((c) => c.id === category);
  const title = q ? `“${q}”` : activeCat?.name ?? (fresh ? "Baru datang" : "Semua produk");
  const total = list.data?.meta.total ?? 0;

  const chips = useMemo(() => {
    const out: { key: string; label: string; clear: Record<string, null> }[] = [];
    if (fresh) out.push({ key: "new", label: "Baru datang · 7 hari", clear: { new: null } });
    if (q) out.push({ key: "q", label: "Cari: " + q, clear: { q: null } });
    if (availability) out.push({ key: "a", label: availability === "preorder" ? "Pre-order" : "Ready stock", clear: { availability: null } });
    if (min || max)
      out.push({
        key: "p",
        label: `${min ? formatRupiah(min) : "Rp0"} – ${max ? formatRupiah(max) : "∞"}`,
        clear: { min: null, max: null },
      });
    return out;
  }, [fresh, q, availability, min, max]);

  return (
    <div className="pb-6">
      {catBanner && (
        <div className="container-x pt-3 md:pt-6">
          <BannerLink
            href={catBanner.link_url}
            label={catBanner.title ?? undefined}
            className="relative block aspect-[16/7] overflow-hidden rounded-2xl bg-ink md:aspect-[4/1] md:rounded-3xl"
          >
            <BannerPicture banner={catBanner} eager />
            {catBanner.title && (
              <div className="absolute inset-0 flex items-end bg-linear-to-t from-ink/70 to-transparent p-5 md:p-10">
                <div>
                  {catBanner.subtitle && <p className="caps mb-2 text-lime">{catBanner.subtitle}</p>}
                  <p className="font-display text-2xl font-extrabold uppercase leading-none tracking-tight text-canvas md:text-5xl">
                    {catBanner.title}
                  </p>
                </div>
              </div>
            )}
          </BannerLink>
        </div>
      )}

      <div className="container-x pt-8 md:pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="caps mb-1 text-muted">Katalog</p>
            <h1 className="font-display text-[34px] font-extrabold uppercase leading-none tracking-tight md:text-5xl">{title}</h1>
            <p className="mt-2 text-sm text-muted tabular">{list.loading ? "Memuat…" : `${total} produk`}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-48 sm:w-52">
              <Select
                value={sort}
                onChange={(v) => setParams({ sort: v })}
                options={SORTS}
                size="sm"
                sheetTitle="Urutkan"
                leading={<ArrowDownUp className="size-4" />}
                aria-label="Urutkan produk"
              />
            </div>
            <Button variant="soft" size="sm" className="h-10" onClick={() => setFilterOpen(true)}>
              <SlidersHorizontal className="size-4" /> Filter
            </Button>
          </div>
        </div>

        <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
          {[{ id: "", name: "Semua" }, ...categories].map((c) => (
            <button
              key={c.id || "all"}
              type="button"
              onClick={() => setParams({ category: c.id || null })}
              aria-pressed={category === c.id}
              className={cn(
                "inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-[13px] font-semibold transition-colors",
                category === c.id ? "border-ink bg-ink text-lime" : "border-line bg-stone text-ink-3 hover:border-line-strong"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setParams(c.clear)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-lime px-3 text-xs font-semibold"
              >
                {c.label} <X className="size-3.5" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setParams({ q: null, availability: null, min: null, max: null })}
              className="text-xs font-semibold underline underline-offset-4"
            >
              Hapus semua
            </button>
          </div>
        )}

        <div className="mt-6">
          {list.error ? (
            <ErrorState message={list.error} onRetry={list.reload} />
          ) : list.loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : list.data && list.data.data.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
                {list.data.data.map((p, i) => (
                  <ProductCard key={p.id} product={p} priority={i < 4} />
                ))}
              </div>
              <div className="mt-10">
                <Pagination page={page} limit={PAGE_SIZE} total={total} onPage={(p) => setParams({ page: p }, false)} />
              </div>
            </>
          ) : (
            <EmptyState
              title="Tidak ada yang cocok"
              description="Coba kata kunci lain atau longgarkan filter."
              action={
                <Button variant="dark" onClick={() => router.replace(pathname)}>
                  Reset filter
                </Button>
              }
            />
          )}
        </div>
      </div>

      <FilterDialog
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        availability={availability}
        min={min}
        max={max}
        onApply={(v) => {
          setParams(v);
          setFilterOpen(false);
        }}
      />
    </div>
  );
}

function FilterDialog({
  open,
  onClose,
  availability,
  min,
  max,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  availability: string;
  min: string;
  max: string;
  onApply: (v: { availability: string | null; min: string | null; max: string | null }) => void;
}) {
  const [a, setA] = useState(availability);
  const [lo, setLo] = useState(min);
  const [hi, setHi] = useState(max);
  useEffect(() => {
    if (open) {
      setA(availability);
      setLo(min);
      setHi(max);
    }
  }, [open, availability, min, max]);
  const invalid = lo !== "" && hi !== "" && Number(lo) > Number(hi);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Filter"
      size="sm"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="soft" onClick={() => onApply({ availability: null, min: null, max: null })}>
            Reset
          </Button>
          <Button variant="dark" disabled={invalid} onClick={() => onApply({ availability: a || null, min: lo || null, max: hi || null })}>
            Terapkan
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Ketersediaan">
          {(id) => <Select id={id} value={a} onChange={setA} options={AVAILABILITY} sheetTitle="Ketersediaan" />}
        </Field>
        <div>
          <p className="mb-1.5 text-[13px] font-semibold">Rentang harga (Rp)</p>
          <div className="grid grid-cols-2 gap-2">
            <Input inputMode="numeric" placeholder="Min" value={lo} onChange={(e) => setLo(e.target.value.replace(/\D/g, ""))} aria-label="Harga minimum" />
            <Input inputMode="numeric" placeholder="Maks" value={hi} onChange={(e) => setHi(e.target.value.replace(/\D/g, ""))} aria-label="Harga maksimum" invalid={invalid} />
          </div>
          {invalid && <p className="mt-1.5 text-xs text-danger">Harga minimum lebih besar dari maksimum.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ["", "200000", "< 200rb"],
              ["200000", "400000", "200–400rb"],
              ["400000", "", "> 400rb"],
            ].map(([l, h, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => (setLo(l), setHi(h))}
                className={cn(
                  "h-8 rounded-full border px-3 text-xs font-semibold",
                  lo === l && hi === h ? "border-ink bg-ink text-lime" : "border-line bg-stone"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

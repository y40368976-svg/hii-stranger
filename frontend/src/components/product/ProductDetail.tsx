"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ChevronRight,
  Clock,
  ImageOff,
  Minus,
  PackageCheck,
  Plus,
  QrCode,
  Ruler,
  ShieldAlert,
  Truck,
} from "lucide-react";
import { productService } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/app/context/AuthContext";
import { useCartActions } from "@/hooks/useCartActions";
import { useCartModalContext } from "@/app/context/CartSidebarModalContext";
import { useCategories } from "@/hooks/useCategories";
import { Button, LinkButton } from "@/components/ui/Button";
import {
  Badge,
  EmptyState,
  ErrorState,
  Price,
  SectionHeading,
  Skeleton,
} from "@/components/ui/misc";
import { ProductCard } from "@/components/site/ProductCard";
import { cn } from "@/lib/cn";
import type { ApiVariant } from "@/types/api";
import { cdn } from "@/lib/img";

const SIZE_ORDER = [
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "2XL",
  "XXXL",
  "3XL",
  "4XL",
];
const sizeRank = (s: string) => {
  const i = SIZE_ORDER.indexOf(s.toUpperCase());
  return i < 0 ? 100 + (Number(s) || 0) : i;
};

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isStaff, isAdmin } = useAuth();
  const { add } = useCartActions();
  const { openCartModal } = useCartModalContext();
  const categories = useCategories();
  const {
    data: p,
    error,
    loading,
    reload,
  } = useAsync(() => productService.get(id), [id]);

  const [imgIdx, setImgIdx] = useState(0);
  const [color, setColor] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState<"add" | "buy" | null>(null);

  const images = useMemo(() => {
    if (!p) return [];
    return [...p.images].sort(
      (a, b) =>
        Number(b.is_primary) - Number(a.is_primary) ||
        a.sort_order - b.sort_order,
    );
  }, [p]);
  const colors = useMemo(
    () => Array.from(new Set((p?.variants ?? []).map((v) => v.color ?? ""))),
    [p],
  );
  const hasColors = colors.some((c) => c !== "");
  const sizes = useMemo(() => {
    const vs = (p?.variants ?? []).filter(
      (v) => !hasColors || (v.color ?? "") === (color ?? ""),
    );
    return vs.sort((a, b) => sizeRank(a.size) - sizeRank(b.size));
  }, [p, hasColors, color]);
  const variant: ApiVariant | undefined = p?.variants.find(
    (v) => v.id === variantId,
  );
  const totalStock = (p?.variants ?? []).reduce((n, v) => n + v.stock, 0);

  const [seen, setSeen] = useState<typeof p | null>(null);
  if (p && p !== seen) {
    setSeen(p);
    setImgIdx(0);
    const firstColor =
      p.variants.find((v) => v.stock > 0)?.color ?? p.variants[0]?.color ?? "";
    setColor(firstColor);
    setVariantId(null);
    setQty(1);
  }

  const related = useAsync(
    () =>
      productService.list({
        category_id: p?.category_id ?? undefined,
        limit: 5,
        sort: "newest",
      }),
    [p?.category_id],
    !!p?.category_id,
  );

  if (loading)
    return (
      <div className="container-x grid gap-8 py-6 md:grid-cols-2 md:py-10">
        <Skeleton className="aspect-[4/5] rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  if (error)
    return (
      <div className="container-x py-16">
        {error.toLowerCase().includes("tidak ditemukan") ? (
          <EmptyState
            title="Produk tidak ditemukan"
            description="Mungkin sudah diarsipkan."
            action={<LinkButton href="/shop">Ke katalog</LinkButton>}
          />
        ) : (
          <ErrorState message={error} onRetry={reload} />
        )}
      </div>
    );
  if (!p) return null;

  const preorder = p.availability_type === "preorder";
  const soldOut = totalStock <= 0;
  const maxQty = variant ? Math.min(variant.stock, 10) : 1;
  const category = categories.find((c) => c.id === p.category_id);

  const submit = async (mode: "add" | "buy") => {
    if (!variant) {
      toast.error("Pilih ukuran dulu.");
      document
        .getElementById("size-picker")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(mode);
    const ok = await add(variant.id, qty, "/product/" + p.id);
    setBusy(null);
    if (!ok) return;
    if (mode === "buy") router.push("/checkout");
    else {
      toast.success("Masuk ke tas belanja");
      openCartModal();
    }
  };

  return (
    <div className="pb-16 sm:pb-6">
      <nav
        className="container-x flex items-center gap-1.5 py-4 text-[13px] text-muted"
        aria-label="Breadcrumb"
      >
        <Link href="/shop" className="hover:text-ink">
          Katalog
        </Link>
        {category && (
          <>
            <ChevronRight className="size-3.5" />
            <Link
              href={"/shop?category=" + category.id}
              className="hover:text-ink"
            >
              {category.name}
            </Link>
          </>
        )}
        <ChevronRight className="size-3.5" />
        <span className="truncate text-ink">{p.name}</span>
      </nav>

      <div className="container-x grid *:min-w-0 gap-8 md:grid-cols-[1.1fr_1fr] lg:gap-14">
        {/* Galeri */}
        <div className="md:sticky md:top-24 md:self-start">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-stone-2">
            {images[imgIdx] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                decoding="async"
                src={cdn(images[imgIdx].image_url, 1200)}
                alt={p.name}
                className="size-full object-cover"
              />
            ) : (
              <div className="grid size-full place-items-center text-faint">
                <ImageOff className="size-10" />
              </div>
            )}
            {soldOut && (
              <span className="caps absolute left-3 top-3 rounded-full bg-ink px-3 py-1.5 text-canvas">
                Habis
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {images.map((im, i) => (
                <button
                  key={im.id}
                  type="button"
                  onClick={() => setImgIdx(i)}
                  aria-label={`Gambar ${i + 1}`}
                  aria-current={i === imgIdx}
                  className={cn(
                    "aspect-[4/5] w-[72px] shrink-0 overflow-hidden rounded-xl border-2 transition-colors",
                    i === imgIdx
                      ? "border-ink"
                      : "border-transparent opacity-70 hover:opacity-100",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    decoding="async"
                    src={cdn(im.image_url, 200)}
                    alt=""
                    className="size-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex flex-wrap gap-2">
            {preorder ? (
              <Badge tone="dark">
                <Clock className="size-3" /> Pre-order
                {p.po_estimate_days ? ` · ${p.po_estimate_days} hari` : ""}
              </Badge>
            ) : (
              <Badge tone={soldOut ? "danger" : "success"} dot>
                {soldOut ? "Stok habis" : "Ready stock"}
              </Badge>
            )}
            {p.discount_percent > 0 && (
              <Badge tone="lime">Hemat {Math.round(p.discount_percent)}%</Badge>
            )}
          </div>
          <h1 className="mt-4 font-display text-[32px] font-extrabold uppercase leading-[0.98] tracking-tight md:text-5xl">
            {p.name}
          </h1>
          <div className="mt-4">
            <Price
              price={p.price}
              discountPercent={p.discount_percent}
              size="lg"
            />
          </div>

          {/* Warna */}
          {hasColors && (
            <div className="mt-7">
              <p className="caps mb-2.5 text-muted">
                Warna <span className="text-ink">{color || "-"}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c || "none"}
                    type="button"
                    onClick={() => (setColor(c), setVariantId(null), setQty(1))}
                    aria-pressed={c === color}
                    className={cn(
                      "h-10 rounded-full border px-4 text-sm font-semibold transition-colors",
                      c === color
                        ? "border-ink bg-ink text-lime"
                        : "border-line bg-white hover:border-ink",
                    )}
                  >
                    {c || "Standar"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ukuran */}
          <div id="size-picker" className="mt-7">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="caps text-muted">
                Ukuran{" "}
                {variant && <span className="text-ink">· {variant.size}</span>}
              </p>
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Ruler className="size-3.5" /> Cek detail ukuran di deskripsi
              </span>
            </div>
            {sizes.length === 0 ? (
              <p className="rounded-xl border border-line bg-stone p-4 text-sm text-muted">
                Varian belum tersedia.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {sizes.map((v) => {
                  const out = v.stock <= 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={out}
                      onClick={() => (setVariantId(v.id), setQty(1))}
                      aria-pressed={v.id === variantId}
                      className={cn(
                        "relative flex h-14 flex-col items-center justify-center rounded-xl border text-sm font-bold transition-colors",
                        v.id === variantId
                          ? "border-ink bg-ink text-lime"
                          : "border-line bg-white hover:border-ink",
                        out &&
                          "cursor-not-allowed bg-stone text-faint line-through hover:border-line",
                      )}
                    >
                      {v.size}
                      <span
                        className={cn(
                          "text-[10px] font-semibold no-underline",
                          v.id === variantId ? "text-canvas/70" : "text-muted",
                        )}
                      >
                        {out
                          ? "Habis"
                          : v.stock <= 5
                            ? `Sisa ${v.stock}`
                            : `Stok ${v.stock}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Aksi */}
          {isStaff ? (
            <div className="mt-8 flex gap-3 rounded-2xl border border-line bg-stone p-4">
              <ShieldAlert className="size-5 shrink-0 text-muted" />
              <div className="text-sm">
                <p className="font-semibold">Mode staf</p>
                <p className="text-muted">
                  Akun admin/staff tidak dapat berbelanja. Stok tampil
                  sesuai data terkini.
                </p>
                {isAdmin && (
                  <Link
                    href={"/admin?tab=products&edit=" + p.id}
                    className="mt-2 inline-block font-semibold underline underline-offset-4"
                  >
                    Kelola produk ini
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-8 hidden gap-3 sm:flex">
              <QtyStepper
                qty={qty}
                setQty={setQty}
                max={maxQty}
                disabled={!variant}
              />
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                loading={busy === "add"}
                disabled={soldOut || !!busy}
                onClick={() => submit("add")}
              >
                {soldOut ? "Stok habis" : "Tambah ke tas"}
              </Button>
              <Button
                variant="dark"
                size="lg"
                loading={busy === "buy"}
                disabled={soldOut || !!busy}
                onClick={() => submit("buy")}
              >
                Beli sekarang
              </Button>
            </div>
          )}

          <ul className="mt-8 divide-y divide-line rounded-2xl border border-line bg-stone">
            {[
              {
                icon: Truck,
                text: `Berat ${p.weight_gram} gram · ongkir dihitung otomatis saat checkout`,
              },
              { icon: QrCode, text: "Bayar via QRIS — semua bank & e-wallet" },
              {
                icon: PackageCheck,
                text: preorder
                  ? `Diproduksi setelah pembayaran terverifikasi${p.po_estimate_days ? `, estimasi ${p.po_estimate_days} hari` : ""}`
                  : "Dikirim setelah pembayaran terverifikasi",
              },
            ].map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-3 px-4 py-3.5 text-[13.5px]"
              >
                <Icon className="size-4 shrink-0 text-muted" /> {text}
              </li>
            ))}
          </ul>

          {p.description && (
            <div className="mt-8">
              <p className="caps mb-3 text-muted">Detail produk</p>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-3">
                {p.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {related.data &&
        related.data.data.filter((r) => r.id !== p.id).length > 0 && (
          <section className="container-x mt-16">
            <SectionHeading title="Mungkin kamu suka" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
              {related.data.data
                .filter((r) => r.id !== p.id)
                .slice(0, 4)
                .map((r) => (
                  <ProductCard key={r.id} product={r} />
                ))}
            </div>
          </section>
        )}

      {/* Bar aksi mobile */}
      {!isStaff && (
        <div className="glass fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 border-t border-line/70 p-3 sm:hidden">
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              loading={busy === "add"}
              disabled={soldOut || !!busy}
              onClick={() => submit("add")}
            >
              {soldOut
                ? "Stok habis"
                : variant
                  ? `Tambah · ${variant.size}`
                  : "Pilih ukuran"}
            </Button>
            <Button
              variant="dark"
              size="lg"
              loading={busy === "buy"}
              disabled={soldOut || !!busy}
              onClick={() => submit("buy")}
            >
              Beli
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function QtyStepper({
  qty,
  setQty,
  max,
  disabled,
}: {
  qty: number;
  setQty: (n: number) => void;
  max: number;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex h-12 items-center rounded-xl border border-line bg-white",
        disabled && "opacity-50",
      )}
    >
      <button
        type="button"
        aria-label="Kurangi"
        disabled={disabled || qty <= 1}
        onClick={() => setQty(qty - 1)}
        className="grid h-full w-11 place-items-center disabled:opacity-30"
      >
        <Minus className="size-4" />
      </button>
      <span
        className="w-8 text-center font-semibold tabular"
        aria-live="polite"
      >
        {qty}
      </span>
      <button
        type="button"
        aria-label="Tambah"
        disabled={disabled || qty >= max}
        onClick={() => setQty(qty + 1)}
        className="grid h-full w-11 place-items-center disabled:opacity-30"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

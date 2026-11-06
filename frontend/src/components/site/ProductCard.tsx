"use client";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Price } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { cdn } from "@/lib/img";

export type CardProduct = {
  id: string;
  name: string;
  price: string;
  discount_percent: number;
  primary_image_url?: string | null;
  availability_type?: string;
  po_estimate_days?: number | null;
  total_stock?: number;
};

const LOW_STOCK = 5;

/** Kartu produk editorial (rasio 4:5). Badge: habis, pre-order, diskon, stok tipis. */
export function ProductCard({ product: p, className, priority }: { product: CardProduct; className?: string; priority?: boolean }) {
  const soldOut = p.total_stock !== undefined && p.total_stock <= 0;
  const low = !soldOut && p.total_stock !== undefined && p.total_stock <= LOW_STOCK;
  const preorder = p.availability_type === "preorder";

  return (
    <Link
      href={"/product/" + p.id}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-line bg-stone transition-colors hover:border-line-strong",
        className
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-stone-2">
        {p.primary_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
          decoding="async"
            src={cdn(p.primary_image_url, 640)}
            alt={p.name}
            loading={priority ? "eager" : "lazy"}
            className={cn(
              "size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]",
              soldOut && "opacity-60 grayscale"
            )}
          />
        ) : (
          <div className="grid size-full place-items-center text-faint">
            <ImageOff className="size-8" aria-hidden />
          </div>
        )}
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {soldOut ? (
            <span className="caps rounded-full bg-ink px-2.5 py-1 text-canvas">Habis</span>
          ) : (
            <>
              {preorder && (
                <span className="caps rounded-full bg-ink px-2.5 py-1 text-lime">
                  Pre-order{p.po_estimate_days ? ` ${p.po_estimate_days} hari` : ""}
                </span>
              )}
              {p.discount_percent > 0 && (
                <span className="caps rounded-full bg-danger px-2.5 py-1 text-white">-{Math.round(p.discount_percent)}%</span>
              )}
              {low && <span className="caps rounded-full bg-lime px-2.5 py-1 text-ink">Sisa {p.total_stock}</span>}
            </>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between gap-2 p-3 md:p-4">
        <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug md:text-[15px]">{p.name}</h3>
        <Price price={p.price} discountPercent={p.discount_percent} size="sm" />
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-stone">
      <div className="aspect-[4/5] skeleton" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 skeleton rounded" />
        <div className="h-5 w-1/3 skeleton rounded" />
      </div>
    </div>
  );
}

"use client";
import React from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/Button";
import { useCartModalContext } from "@/app/context/CartSidebarModalContext";
import { useAppSelector } from "@/redux/store";
import { selectCart } from "@/redux/features/cart-slice";
import { useCartActions } from "@/hooks/useCartActions";
import { useAuth } from "@/app/context/AuthContext";
import { formatRupiah } from "@/lib/format";
import type { ApiCartItem } from "@/types/api";
import { cdn } from "@/lib/img";

export default function CartDrawer() {
  const { isCartModalOpen, closeCartModal } = useCartModalContext();
  const { items, subtotal } = useAppSelector(selectCart);
  const { user } = useAuth();
  const count = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <Dialog
      open={isCartModalOpen}
      onClose={closeCartModal}
      variant="drawer"
      title={`Tas belanja${count ? ` (${count})` : ""}`}
      footer={
        items.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">Subtotal</span>
              <span className="font-display text-xl font-bold tabular">{formatRupiah(subtotal)}</span>
            </div>
            <p className="text-xs text-muted">Ongkir dihitung di checkout sesuai alamat.</p>
            <div className="grid grid-cols-2 gap-2">
              <LinkButton href="/cart" variant="soft" onClick={closeCartModal}>
                Lihat tas
              </LinkButton>
              <LinkButton href="/checkout" variant="primary" onClick={closeCartModal}>
                Checkout
              </LinkButton>
            </div>
          </div>
        )
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="size-6" />}
          title="Tas masih kosong"
          description={user ? "Pilih siluet favoritmu dari katalog." : "Masuk untuk menyimpan barang ke tas belanja."}
          action={
            <LinkButton href={user ? "/shop" : "/signin"} variant="dark" onClick={closeCartModal}>
              {user ? "Jelajahi katalog" : "Masuk"}
            </LinkButton>
          }
        />
      ) : (
        <ul className="-my-2 divide-y divide-line">
          {items.map((it) => (
            <CartLine key={it.id} item={it} onNavigate={closeCartModal} />
          ))}
        </ul>
      )}
    </Dialog>
  );
}

/** Satu baris item tas (dipakai drawer & halaman tas). */
export function CartLine({ item, onNavigate }: { item: ApiCartItem; onNavigate?: () => void }) {
  const { updateQuantity, removeItem } = useCartActions();
  const [busy, setBusy] = React.useState(false);
  const over = item.quantity > item.stock;

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  return (
    <li className="flex gap-3 py-4">
      <Link
        href={"/product/" + item.product_id}
        onClick={onNavigate}
        className="h-[100px] w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-stone-2"
      >
        {item.primary_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
          decoding="async" src={cdn(item.primary_image_url, 200)} alt={item.product_name} className="size-full object-cover" />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link href={"/product/" + item.product_id} onClick={onNavigate} className="line-clamp-2 text-sm font-semibold leading-snug">
            {item.product_name}
          </Link>
          <button
            type="button"
            aria-label="Hapus dari tas"
            disabled={busy}
            onClick={() => act(() => removeItem(item.id))}
            className="-mr-1.5 -mt-1 grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-stone hover:text-danger"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
        <p className="caps mt-1 text-muted">
          Size {item.size}
          {item.color ? ` · ${item.color}` : ""}
        </p>
        {over && <p className="mt-1 text-xs font-semibold text-danger">Stok tersisa {item.stock}. Kurangi jumlah.</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="inline-flex h-9 items-center rounded-xl border border-line bg-white">
            <button
              type="button"
              aria-label="Kurangi"
              disabled={busy || item.quantity <= 1}
              onClick={() => act(() => updateQuantity(item.id, item.quantity - 1))}
              className="grid size-9 place-items-center disabled:opacity-30"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-7 text-center text-sm font-semibold tabular" aria-live="polite">
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label="Tambah"
              disabled={busy || item.quantity >= item.stock}
              onClick={() => act(() => updateQuantity(item.id, item.quantity + 1))}
              className="grid size-9 place-items-center disabled:opacity-30"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <span className="font-display text-[15px] font-bold tabular">{formatRupiah(item.subtotal)}</span>
        </div>
      </div>
    </li>
  );
}

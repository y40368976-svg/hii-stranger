"use client";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useAppSelector } from "@/redux/store";
import { selectCart } from "@/redux/features/cart-slice";
import { useAuth } from "@/app/context/AuthContext";
import { CartLine } from "@/components/site/CartDrawer";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { formatRupiah } from "@/lib/format";

export default function CartPage() {
  const { items, subtotal, loaded } = useAppSelector(selectCart);
  const { user, loading, isStaff } = useAuth();
  const blocked = items.some((i) => i.quantity > i.stock);
  const count = items.reduce((n, i) => n + i.quantity, 0);

  if (loading || (user && !loaded))
    return (
      <div className="container-x py-10">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );

  return (
    <div className="container-x py-8 md:py-12">
      <p className="caps mb-1 text-muted">Tas belanja</p>
      <h1 className="font-display text-[34px] font-extrabold uppercase leading-none tracking-tight md:text-5xl">
        {count ? `${count} barang` : "Tas kamu"}
      </h1>

      {!user || isStaff || items.length === 0 ? (
        <EmptyState
          className="mt-6 rounded-2xl border border-line bg-stone"
          icon={<ShoppingBag className="size-6" />}
          title={isStaff ? "Akun staf tidak berbelanja" : !user ? "Masuk untuk melihat tas" : "Tas masih kosong"}
          description={!user ? "Tas belanja tersimpan di akunmu, jadi bisa dibuka dari perangkat mana pun." : undefined}
          action={<LinkButton href={!user ? "/signin?next=/cart" : "/shop"}>{!user ? "Masuk" : "Jelajahi katalog"}</LinkButton>}
        />
      ) : (
        <div className="mt-8 grid *:min-w-0 gap-8 lg:grid-cols-[1fr_380px]">
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white px-4 md:px-6">
            {items.map((it) => (
              <CartLine key={it.id} item={it} />
            ))}
          </ul>
          <aside className="h-fit rounded-2xl border border-line bg-stone p-5 lg:sticky lg:top-24">
            <p className="caps mb-4 text-muted">Ringkasan</p>
            <div className="flex justify-between text-sm">
              <span>Subtotal ({count} barang)</span>
              <span className="font-semibold tabular">{formatRupiah(subtotal)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm text-muted">
              <span>Ongkir</span>
              <span>Dihitung di checkout</span>
            </div>
            <div className="my-4 h-px bg-line" />
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Estimasi total</span>
              <span className="font-display text-2xl font-bold tabular">{formatRupiah(subtotal)}</span>
            </div>
            {blocked && <p className="mt-3 text-xs font-semibold text-danger">Ada item melebihi stok. Sesuaikan jumlah dulu.</p>}
            <LinkButton href={blocked ? "/cart" : "/checkout"} variant="primary" size="lg" block className="mt-5">
              Lanjut ke checkout <ArrowRight className="size-4" />
            </LinkButton>
            <Link href="/shop" className="mt-3 block text-center text-sm font-semibold underline underline-offset-4">
              Lanjut belanja
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

"use client";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CreditCard, PackageOpen, Receipt, Truck, Wallet } from "lucide-react";
import { adminService } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import { Badge, ErrorState, Skeleton } from "@/components/ui/misc";
import { formatRupiah } from "@/lib/format";
import { PageHeader, Panel } from "./kit";
import { AdminOrderCard } from "./Orders";

export default function AdminSummary() {
  const { data: s, error, loading, reload } = useAsync(() => adminService.summary(), []);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !s)
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36" />
        ))}
        <Skeleton className="col-span-2 h-72 md:col-span-4" />
      </div>
    );

  const c = s.status_counts;
  const cards = [
    { label: "Bukti menunggu verifikasi", value: s.proofs_to_review, icon: CreditCard, tab: "payments", hot: s.proofs_to_review > 0 },
    { label: "Siap dikemas", value: (c.paid ?? 0) + (c.processing ?? 0), icon: PackageOpen, tab: "orders" },
    { label: "Dalam pengiriman", value: c.shipped ?? 0, icon: Truck, tab: "orders" },
    { label: "Belum dibayar", value: c.pending_payment ?? 0, icon: Receipt, tab: "orders" },
  ];

  return (
    <div>
      <PageHeader title="Ringkasan" description="Antrean kerja hari ini: verifikasi pembayaran, kemas, dan kirim." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {cards.map(({ label, value, icon: Icon, tab, hot }) => (
          <Link
            key={label}
            href={"/admin?tab=" + tab}
            className={
              "group flex min-w-0 flex-col justify-between rounded-2xl border p-4 transition-colors md:p-5 " +
              (hot ? "border-ink bg-ink text-canvas" : "border-line bg-white hover:border-ink")
            }
          >
            <div className="flex items-center justify-between">
              <Icon className={"size-5 " + (hot ? "text-lime" : "text-muted")} />
              <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-6 truncate font-display text-4xl font-extrabold tabular">{value}</p>
            <p className={"mt-1 text-[13px] " + (hot ? "text-canvas/70" : "text-muted")}>{label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Panel className="min-w-0 p-5">
          <p className="caps flex items-center gap-1.5 text-muted">
            <Wallet className="size-3.5" /> Omzet bulan ini
          </p>
          <p className="mt-3 break-words font-display text-[clamp(1.5rem,7vw,1.875rem)] font-extrabold tabular">{formatRupiah(s.revenue_month)}</p>
          <p className="mt-1 text-xs text-muted">{s.paid_orders_month} pesanan terbayar · {s.orders_today} pesanan masuk hari ini</p>
        </Panel>
        <Panel className="min-w-0 p-5 md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="caps flex items-center gap-1.5 text-muted">
              <AlertTriangle className="size-3.5" /> Stok menipis (≤ 3)
            </p>
            <Link href="/admin?tab=products" className="text-xs font-semibold underline underline-offset-4">
              Kelola stok
            </Link>
          </div>
          {s.low_stock.length === 0 ? (
            <p className="text-sm text-muted">Semua varian aktif stoknya aman.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {s.low_stock.map((l) => (
                <li key={l.variant_id} className="flex items-center justify-between gap-3 rounded-xl bg-stone px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{l.product_name}</span>
                    <span className="text-xs text-muted">
                      {l.size}
                      {l.color ? ` · ${l.color}` : ""} · {l.sku}
                    </span>
                  </span>
                  <Badge tone={l.stock === 0 ? "danger" : "warn"}>{l.stock === 0 ? "Habis" : `Sisa ${l.stock}`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="mt-4">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="font-bold">Pesanan terbaru</p>
          <Link href="/admin?tab=orders" className="text-xs font-semibold underline underline-offset-4">
            Semua pesanan
          </Link>
        </div>
        {s.recent.length === 0 ? (
          <p className="p-5 text-sm text-muted">Belum ada pesanan.</p>
        ) : (
          <ul className="divide-y divide-line">
            {s.recent.map((o) => (
              <li key={o.id}>
                <AdminOrderCard order={o} href={"/admin?tab=orders&open=" + o.id} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

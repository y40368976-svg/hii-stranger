"use client";
import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, Trophy } from "lucide-react";
import { adminService } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import { ErrorState, Segmented, Skeleton } from "@/components/ui/misc";
import { ORDER_STATUS_LABEL, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ApiAnalytics } from "@/types/api";
import { PageHeader, Panel } from "./kit";

type Days = "7" | "30" | "90";
const PERIODS: { value: Days; label: string }[] = [
  { value: "7", label: "7 hari" },
  { value: "30", label: "30 hari" },
  { value: "90", label: "90 hari" },
];
const STATUS_ORDER = ["pending_payment", "paid", "processing", "shipped", "completed", "cancelled"] as const;

const num = (v: string | number) => Number(v) || 0;
const fmtNum = (n: number) => n.toLocaleString("id-ID");
/** Rupiah ringkas untuk label sumbu: Rp1,2 jt, Rp850 rb. */
function shortRupiah(n: number) {
  if (n >= 1e9) return "Rp" + (n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " M";
  if (n >= 1e6) return "Rp" + (n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt";
  if (n >= 1e3) return "Rp" + Math.round(n / 1e3).toLocaleString("id-ID") + " rb";
  return "Rp" + fmtNum(n);
}
const dayLabel = (iso: string, long = false) =>
  new Date(iso + "T00:00:00").toLocaleDateString("id-ID", long ? { weekday: "long", day: "numeric", month: "long" } : { day: "numeric", month: "short" });

export default function AdminAnalytics() {
  const [days, setDays] = useState<Days>("30");
  const { data, error, loading, reload } = useAsync(() => adminService.analytics(Number(days) as 7 | 30 | 90), [days]);

  return (
    <div>
      <PageHeader
        title="Analitik"
        description="Performa penjualan dari pesanan yang sudah dibayar, dibanding periode sebelumnya dengan panjang sama."
        actions={<Segmented value={days} onChange={setDays} options={PERIODS} />}
      />
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading || !data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
          <Skeleton className="col-span-2 h-72 lg:col-span-4" />
        </div>
      ) : (
        <Report a={data} />
      )}
    </div>
  );
}

function Report({ a }: { a: ApiAnalytics }) {
  const c = a.current;
  const p = a.previous;
  const aov = c.paid_orders ? num(c.revenue) / c.paid_orders : 0;
  const prevAov = p.paid_orders ? num(p.revenue) / p.paid_orders : 0;
  const cancelRate = c.all_orders ? (c.cancelled / c.all_orders) * 100 : 0;

  const kpis = [
    { label: "Omzet", value: formatRupiah(c.revenue), now: num(c.revenue), prev: num(p.revenue) },
    { label: "Pesanan dibayar", value: fmtNum(c.paid_orders), now: c.paid_orders, prev: p.paid_orders },
    { label: "Rata-rata per pesanan", value: formatRupiah(Math.round(aov)), now: aov, prev: prevAov },
    { label: "Pembeli", value: fmtNum(c.buyers), now: c.buyers, prev: p.buyers },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {kpis.map((k, i) => (
          // Bukan <Panel>: cn() tidak me-merge class, jadi bg-white bawaan Panel
          // akan menimpa bg-ink dan teks terang jadi tak terbaca.
          <div
            key={k.label}
            className={cn("@container min-w-0 rounded-2xl border p-4 md:p-5", i === 0 ? "border-ink bg-ink text-canvas" : "border-line bg-white")}
          >
            <p className={cn("text-[13px] font-semibold", i === 0 ? "text-canvas/70" : "text-muted")}>{k.label}</p>
            {/* Ukuran huruf ikut lebar kartu (container query) supaya angka tidak terpotong/terpecah. */}
            <p className="mt-2 whitespace-nowrap font-display text-[clamp(1rem,8cqi,1.875rem)] font-extrabold leading-tight tabular" title={k.value}>
              {k.value}
            </p>
            <Delta now={k.now} prev={k.prev} dark={i === 0} />
          </div>
        ))}
      </div>

      <Panel className="p-4 md:p-5">
        <RevenueChart series={a.series} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel className="p-4 md:p-5 lg:col-span-3">
          <p className="mb-4 flex items-center gap-1.5 font-bold">
            <Trophy className="size-4 text-muted" /> Produk terlaris
          </p>
          {a.top_products.length === 0 ? (
            <p className="text-sm text-muted">Belum ada penjualan di periode ini.</p>
          ) : (
            <ol className="space-y-3">
              {a.top_products.map((t, i) => {
                const max = num(a.top_products[0].revenue) || 1;
                return (
                  <li key={t.product_id || t.name}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="w-4 shrink-0 text-xs font-bold text-muted tabular">{i + 1}</span>
                        <span className="truncate font-semibold">{t.name}</span>
                      </span>
                      <span className="shrink-0 tabular">{formatRupiah(t.revenue)}</span>
                    </div>
                    <div className="ml-6 mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone">
                        <div className="h-full rounded-full bg-ink" style={{ width: `${(num(t.revenue) / max) * 100}%` }} />
                      </div>
                      <span className="w-14 shrink-0 text-right text-xs text-muted tabular">{fmtNum(t.quantity)} pcs</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>

        <Panel className="p-4 md:p-5 lg:col-span-2">
          <p className="font-bold">Status pesanan</p>
          <p className="mb-4 text-xs text-muted">
            {fmtNum(c.all_orders)} pesanan masuk · {fmtNum(c.items_sold)} barang terjual · batal {cancelRate.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
          </p>
          <ul className="space-y-2.5">
            {STATUS_ORDER.map((s) => {
              const n = a.statuses[s] ?? 0;
              const pct = c.all_orders ? (n / c.all_orders) * 100 : 0;
              return (
                <li key={s} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-2 text-sm">
                  <span className="truncate text-ink-3">{ORDER_STATUS_LABEL[s]}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-stone">
                    <div className={cn("h-full rounded-full", s === "cancelled" ? "bg-line-strong" : "bg-ink")} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-right font-semibold tabular">{fmtNum(n)}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Delta({ now, prev, dark }: { now: number; prev: number; dark?: boolean }) {
  const muted = dark ? "text-canvas/60" : "text-muted";
  if (!prev) return <p className={cn("mt-1 text-xs", muted)}>{now ? "Belum ada pembanding" : "—"}</p>;
  const pct = ((now - prev) / prev) * 100;
  const flat = Math.abs(pct) < 0.5;
  const up = pct > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <p className={cn("mt-1 flex items-center gap-1 text-xs font-semibold", flat ? muted : up ? (dark ? "text-lime" : "text-success") : dark ? "text-canvas" : "text-danger")}>
      <Icon className="size-3.5" aria-hidden />
      <span className="tabular">{flat ? "Stabil" : (up ? "+" : "") + pct.toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "%"}</span>
      <span className={cn("font-normal", muted)}>vs periode lalu</span>
    </p>
  );
}

/** Batang omzet harian. Ketuk/hover batang untuk melihat detail hari itu. */
function RevenueChart({ series }: { series: ApiAnalytics["series"] }) {
  const [active, setActive] = useState<number | null>(null);
  const values = series.map((d) => num(d.revenue));
  const max = Math.max(...values, 1);
  const total = values.reduce((s, v) => s + v, 0);
  const shown = active !== null ? series[active] : null;
  const ticks = series.length > 1 ? [0, Math.floor((series.length - 1) / 2), series.length - 1] : [0];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-bold">Omzet harian</p>
          <p className="text-xs text-muted">{shown ? dayLabel(shown.date, true) : "Total " + series.length + " hari"}</p>
        </div>
        <p className="text-right" aria-live="polite">
          <span className="block font-display text-xl font-extrabold tabular">{formatRupiah(shown ? shown.revenue : total)}</span>
          <span className="text-xs text-muted tabular">
            {shown ? fmtNum(shown.orders) + " pesanan" : "Puncak " + shortRupiah(max === 1 && !total ? 0 : max)}
          </span>
        </p>
      </div>

      <div className="relative" onMouseLeave={() => setActive(null)}>
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" aria-hidden />
        <span className="pointer-events-none absolute right-0 top-1 text-[10px] text-faint tabular" aria-hidden>
          {shortRupiah(total ? max : 0)}
        </span>
        <div className={cn("flex h-44 items-end md:h-56", series.length > 40 ? "gap-px" : "gap-0.5 sm:gap-1")} role="list" aria-label="Omzet per hari">
          {series.map((d, i) => {
            const v = values[i];
            return (
              <button
                key={d.date}
                type="button"
                role="listitem"
                aria-label={`${dayLabel(d.date, true)}: ${formatRupiah(d.revenue)}, ${d.orders} pesanan`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(active === i ? null : i)}
                className="group flex h-full min-w-0 flex-1 items-end rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                <span
                  className={cn(
                    "block w-full rounded-t-[4px] transition-colors",
                    v === 0 ? "h-0.5 bg-line" : active === i ? "bg-lime" : active === null ? "bg-ink" : "bg-ink/25"
                  )}
                  style={v === 0 ? undefined : { height: `${Math.max((v / max) * 100, 2)}%` }}
                />
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between border-t border-line pt-2 text-[11px] text-muted tabular" aria-hidden>
          {ticks.map((t) => (
            <span key={t}>{dayLabel(series[t].date)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

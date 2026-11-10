"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  Hourglass,
  MapPin,
  PackageCheck,
  QrCode,
  Timer,
  Truck,
  XCircle,
} from "lucide-react";
import { orderService, paymentService, settingService } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/app/context/AuthContext";
import { errorMessage } from "@/lib/api";
import { etdLabel, formatDate, formatRupiah, joinAddress, ORDER_STATUS_LABEL, ORDER_STATUS_TONE, SHIPPING_STATUS_LABEL } from "@/lib/format";
import { trackingLinks } from "@/lib/tracking";
import { Badge, CopyButton, EmptyState, ErrorState, Skeleton, useCountdown } from "@/components/ui/misc";
import { Button, LinkButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import type { ApiOrderDetail, ApiSiteSettings } from "@/types/api";
import { OrderStepper } from "./OrderStepper";
import { ProofUpload } from "./ProofUpload";
import { cdn } from "@/lib/img";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const order = useAsync(() => orderService.get(id), [id], !!user);
  const settings = useAsync(() => settingService.get(), []);

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/signin?next=/orders/" + id);
  }, [authLoading, user, router, id]);

  if (authLoading || (order.loading && !order.data))
    return (
      <div className="container-x [--cx-max:64rem] space-y-4 py-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  if (order.error)
    return (
      <div className="container-x [--cx-max:48rem] py-14">
        {order.error.toLowerCase().includes("tidak ditemukan") ? (
          <EmptyState title="Pesanan tidak ditemukan" action={<LinkButton href="/my-account">Pesanan saya</LinkButton>} />
        ) : (
          <ErrorState message={order.error} onRetry={order.reload} />
        )}
      </div>
    );
  const o = order.data;
  if (!o) return null;

  const setOrder = (patch: Partial<ApiOrderDetail>) => order.setData({ ...o, ...patch });

  return (
    <div className="container-x [--cx-max:64rem] py-6 md:py-10">
      <Link href="/my-account" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Pesanan saya
      </Link>

      {sp.get("new") && o.order_status === "pending_payment" && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-ink p-4 text-canvas">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-lime" />
          <p className="text-sm">
            Pesanan dibuat & stok sudah kami amankan. Selesaikan pembayaran QRIS sebelum batas waktu supaya tidak dibatalkan otomatis.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="caps mb-1 text-muted">No. pesanan</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-extrabold tracking-tight tabular md:text-3xl">{o.order_number}</h1>
            <CopyButton value={o.order_number} />
          </div>
          <p className="mt-1 text-sm text-muted">Dibuat {formatDate(o.created_at, true)}</p>
        </div>
        <Badge tone={ORDER_STATUS_TONE[o.order_status]} dot>
          {ORDER_STATUS_LABEL[o.order_status]}
        </Badge>
      </div>

      {o.order_status !== "cancelled" && (
        <div className="mt-6 rounded-2xl border border-line bg-white p-4 md:p-5">
          <OrderStepper order={o} />
        </div>
      )}

      <div className="mt-6 grid *:min-w-0 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {o.order_status === "pending_payment" && (
            <PaymentPanel order={o} settings={settings.data} onChange={setOrder} onReload={order.reload} />
          )}
          {o.order_status === "cancelled" && (
            <div className="flex items-start gap-3 rounded-2xl border border-danger/20 bg-danger-soft p-5">
              <XCircle className="mt-0.5 size-5 shrink-0 text-danger" />
              <p className="text-sm font-semibold">Pesanan dibatalkan</p>
            </div>
          )}
          {(o.order_status === "paid" || o.order_status === "processing") && (
            <div className="flex items-start gap-3 rounded-2xl border border-line bg-stone p-5">
              <PackageCheck className="mt-0.5 size-5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">Pembayaran terverifikasi</p>
                <p className="mt-1 text-muted">
                  Pesanan sedang kami siapkan. No. resi dikirim ke email {user?.email} saat paket diserahkan ke kurir.
                </p>
              </div>
            </div>
          )}
          {o.shipment && (o.order_status === "shipped" || o.order_status === "completed") && (
            <TrackingCard order={o} onCompleted={order.reload} />
          )}
          <ItemsCard order={o} />
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-line bg-stone p-5">
            <p className="caps mb-3 text-muted">Rincian biaya</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal produk</dt>
                <dd className="tabular">{formatRupiah(o.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>
                  Ongkir {[o.courier_code?.toUpperCase(), o.courier_service].filter(Boolean).join(" ")}
                </dt>
                <dd className="tabular">{formatRupiah(o.shipping_cost)}</dd>
              </div>
              {o.payment && (
                <div className="flex justify-between">
                  <dt>Kode unik</dt>
                  <dd className="tabular">+{formatRupiah(o.payment.unique_code)}</dd>
                </div>
              )}
            </dl>
            <div className="my-3 h-px bg-line" />
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Total bayar</span>
              <span className="font-display text-xl font-bold tabular">{formatRupiah(o.payment?.amount ?? o.total_amount)}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="caps mb-3 flex items-center gap-1.5 text-muted">
              <MapPin className="size-3.5" /> Dikirim ke
            </p>
            <p className="text-sm font-semibold">{o.recipient_name}</p>
            <p className="text-sm text-muted">{o.recipient_phone}</p>
            <p className="mt-2 text-sm leading-relaxed">{joinAddress(o)}</p>
            {o.shipping_etd && <p className="mt-2 text-xs text-muted">Estimasi pengiriman {etdLabel(o.shipping_etd)}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function PaymentPanel({
  order: o,
  settings,
  onChange,
  onReload,
}: {
  order: ApiOrderDetail;
  settings: ApiSiteSettings | null;
  onChange: (p: Partial<ApiOrderDetail>) => void;
  onReload: () => void;
}) {
  const countdown = useCountdown(o.payment_due_at);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [creating, setCreating] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const p = o.payment;
  const reviewing = !!p && p.has_proof && p.status === "pending";

  const cancel = async () => {
    setCancelling(true);
    try {
      await orderService.cancel(o.id);
      toast.success("Pesanan dibatalkan.");
      setCancelOpen(false);
      onReload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setCancelling(false);
    }
  };

  if (!p)
    return (
      <div className="rounded-2xl border border-line bg-white p-6 text-center">
        <p className="text-sm text-muted">Tagihan QRIS untuk pesanan ini belum dibuat.</p>
        <Button
          variant="primary"
          className="mt-4"
          loading={creating}
          onClick={async () => {
            setCreating(true);
            try {
              onChange({ payment: await paymentService.create(o.id) });
            } catch (e) {
              toast.error(errorMessage(e));
            } finally {
              setCreating(false);
            }
          }}
        >
          Buat tagihan QRIS
        </Button>
      </div>
    );

  const view = async () => {
    const w = window.open("", "_blank");
    try {
      const blob = await paymentService.proof(o.id);
      const url = URL.createObjectURL(blob);
      if (w) w.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      w?.close();
      toast.error(errorMessage(e));
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-ink bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-ink px-5 py-3.5 text-canvas">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <QrCode className="size-4 text-lime" /> Pembayaran QRIS
        </span>
        {countdown && (
          <span className="caps inline-flex items-center gap-1.5 rounded-full bg-lime px-2.5 py-1 text-ink tabular">
            <Timer className="size-3.5" />
            {countdown.expired ? "Batas bayar lewat" : "Sisa " + countdown.text}
          </span>
        )}
      </div>

      <div className="p-5 md:p-6">
        {reviewing && !replacing ? (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-info-soft text-info">
              <Hourglass className="size-6" />
            </span>
            <p className="font-display text-xl font-extrabold uppercase tracking-tight">Bukti sedang diverifikasi</p>
            <p className="mt-2 max-w-sm text-sm text-muted">
              Dikirim {formatDate(p.paid_at, true)}. Admin mencocokkan nominal {formatRupiah(p.amount)} dengan mutasi QRIS. Kamu akan dapat email
              setelah diverifikasi.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button variant="soft" size="sm" onClick={view}>
                <ExternalLink className="size-4" /> Lihat bukti
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setReplacing(true)}>
                Salah kirim? Ganti bukti
              </Button>
            </div>
          </div>
        ) : (
          <>
            {p.status === "rejected" && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-danger/20 bg-danger-soft p-4 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
                <p>
                  <b>Bukti sebelumnya ditolak.</b> Pastikan nominal sama persis {formatRupiah(p.amount)} lalu unggah ulang bukti yang jelas.
                </p>
              </div>
            )}

            <div className="grid *:min-w-0 gap-6 md:grid-cols-[220px_1fr]">
              <div className="flex flex-col items-center">
                {settings?.qris_image_url ? (
                  <>
                    <div className="w-full max-w-[240px] rounded-2xl border border-line bg-white p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={settings.qris_image_url} alt="QRIS Hii Stranger" className="aspect-square w-full object-contain" />
                    </div>
                    {(settings.qris_merchant_name || settings.qris_nmid) && (
                      <p className="mt-2 text-center text-xs text-muted">
                        {settings.qris_merchant_name}
                        {settings.qris_nmid && <span className="block tabular">NMID {settings.qris_nmid}</span>}
                      </p>
                    )}
                    <a
                      href={settings.qris_image_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-4"
                    >
                      <Download className="size-3.5" /> Simpan gambar QRIS
                    </a>
                  </>
                ) : (
                  <div className="flex aspect-square w-full max-w-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-stone p-4 text-center text-xs text-muted">
                    <QrCode className="mb-2 size-8" />
                    QRIS toko belum tersedia. Hubungi admin sebelum membayar.
                  </div>
                )}
              </div>

              <div>
                <p className="caps text-muted">Total yang harus dibayar</p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <span className="font-display text-4xl font-extrabold tracking-tight tabular">{formatRupiah(p.amount)}</span>
                  <CopyButton value={String(Math.round(Number(p.amount)))} label="Salin nominal" />
                </div>
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-lime/40 p-3 text-[13px] text-ink">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Bayar <b>tepat</b> sampai 3 digit terakhir. Kode unik <b className="tabular">{String(p.unique_code).padStart(3, "0")}</b> dipakai untuk
                    mencocokkan pembayaranmu.
                  </span>
                </div>
                <ol className="mt-4 space-y-2 text-sm">
                  {[
                    "Buka aplikasi bank / e-wallet, pilih Scan QRIS.",
                    "Scan kode di samping lalu masukkan nominal di atas.",
                    "Simpan tangkapan layar transaksi berhasil, unggah di bawah.",
                  ].map((t, i) => (
                    <li key={t} className="flex gap-3">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-lime">{i + 1}</span>
                      <span className="text-ink-3">{t}</span>
                    </li>
                  ))}
                </ol>
                {o.payment_due_at && (
                  <p className="mt-4 text-xs text-muted">
                    Bayar sebelum <b className="text-ink">{formatDate(o.payment_due_at, true)}</b>. Lewat dari itu pesanan dibatalkan otomatis.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 border-t border-line pt-6">
              <p className="mb-3 text-sm font-bold">Konfirmasi pembayaran</p>
              <ProofUpload
                orderId={o.id}
                onUploaded={(payment) => {
                  setReplacing(false);
                  onChange({ payment });
                }}
              />
              {replacing && (
                <button type="button" onClick={() => setReplacing(false)} className="mt-3 w-full text-center text-xs font-semibold underline">
                  Batal mengganti
                </button>
              )}
            </div>
          </>
        )}

        {!reviewing && (
          <div className="mt-6 border-t border-line pt-4 text-center">
            <button type="button" onClick={() => setCancelOpen(true)} className="text-sm font-semibold text-danger hover:underline">
              Batalkan pesanan
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={cancel}
        loading={cancelling}
        danger
        title="Batalkan pesanan?"
        confirmLabel="Ya, batalkan"
        description={`Pesanan ${o.order_number} akan dibatalkan dan stok dikembalikan. Tindakan ini tidak bisa diurungkan.`}
      />
    </section>
  );
}

function TrackingCard({ order: o, onCompleted }: { order: ApiOrderDetail; onCompleted: () => void }) {
  const s = o.shipment!;
  const links = trackingLinks(s.courier_name, s.tracking_number);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <section className="rounded-2xl border border-line bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-base font-bold">
          <Truck className="size-5" /> Lacak paket
        </p>
        <Badge tone={s.shipping_status === "delivered" ? "success" : "dark"}>{SHIPPING_STATUS_LABEL[s.shipping_status] ?? s.shipping_status}</Badge>
      </div>
      <div className="mt-4 grid gap-3 rounded-xl border border-line bg-stone p-4 sm:grid-cols-2">
        <div>
          <p className="caps text-muted">Kurir</p>
          <p className="mt-1 font-semibold">{s.courier_name}</p>
        </div>
        <div>
          <p className="caps text-muted">No. resi</p>
          {s.tracking_number ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="font-display text-lg font-bold tracking-tight tabular">{s.tracking_number}</span>
              <CopyButton value={s.tracking_number} />
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted">Belum tersedia</p>
          )}
        </div>
      </div>
      {links.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {links.map((l) => (
            <LinkButton key={l.url} href={l.url} variant={l.official ? "dark" : "soft"} className="sm:flex-1">
              {l.label} <ExternalLink className="size-4" />
            </LinkButton>
          ))}
        </div>
      )}
      {links.some((l) => l.official) && (
        <p className="mt-2 text-xs text-muted">Di situs kurir, tempel no. resi yang sudah disalin. Status muncul beberapa jam setelah paket diserahkan.</p>
      )}
      {o.order_status === "shipped" && (
        <div className="mt-5 border-t border-line pt-5">
          <Button variant="primary" block onClick={() => setConfirm(true)}>
            <PackageCheck className="size-4" /> Pesanan sudah diterima
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        loading={busy}
        title="Paket sudah diterima?"
        description="Konfirmasi hanya bila paket sudah sampai dan isinya sesuai. Pesanan akan ditandai selesai."
        confirmLabel="Ya, sudah diterima"
        onConfirm={async () => {
          setBusy(true);
          try {
            await orderService.complete(o.id);
            toast.success("Terima kasih! Pesanan selesai.");
            setConfirm(false);
            onCompleted();
          } catch (e) {
            toast.error(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      />
    </section>
  );
}

function ItemsCard({ order: o }: { order: ApiOrderDetail }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 md:p-6">
      <p className="mb-2 text-base font-bold">Barang ({o.items.reduce((n, i) => n + i.quantity, 0)})</p>
      <ul className="divide-y divide-line">
        {o.items.map((it) => (
          <li key={it.id} className="flex gap-3 py-3">
            <Link href={"/product/" + it.product_id} className="h-[72px] w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-stone-2">
              {it.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
          decoding="async" src={cdn(it.image_url, 200)} alt="" className="size-full object-cover" />
              )}
            </Link>
            <div className="min-w-0 flex-1 text-sm">
              <p className="line-clamp-2 font-semibold">{it.product_name}</p>
              <p className="mt-0.5 text-xs text-muted">
                Size {it.size} · {it.quantity} × {formatRupiah(it.unit_price)}
              </p>
            </div>
            <span className="text-sm font-semibold tabular">{formatRupiah(it.subtotal)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ChevronRight, ExternalLink, PackageCheck, Search, Truck, XCircle } from "lucide-react";
import { adminService, orderService, paymentService } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import { formatDate, formatRupiah, joinAddress, ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_STATUS_LABEL, SHIPPING_STATUS_LABEL, timeAgo } from "@/lib/format";
import { trackingLinks } from "@/lib/tracking";
import { Badge, CopyButton, EmptyState, ErrorState, Pagination, Segmented, Skeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import type { ApiOrderDetail, ApiOrderListItem, OrderStatus } from "@/types/api";
import { DesktopOnly, MobileList, PageHeader, Panel, run, Table, td } from "./kit";
import { cdn } from "@/lib/img";

const LIMIT = 20;
const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Semua" },
  { value: "pending_payment", label: "Belum bayar" },
  { value: "paid", label: "Dibayar" },
  { value: "processing", label: "Dikemas" },
  { value: "shipped", label: "Dikirim" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Batal" },
];

// Sama dengan backend (order/model.go). pending_payment -> paid lewat verifikasi bayar.
const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }[]>> = {
  paid: [{ to: "processing", label: "Mulai kemas" }],
  processing: [{ to: "shipped", label: "Tandai dikirim" }],
  shipped: [{ to: "completed", label: "Tandai selesai" }],
};
const CANCELLABLE: OrderStatus[] = ["pending_payment", "paid", "processing"];

export default function AdminOrders() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("open")
  );
  const list = useAsync(() => adminService.orders({ page, limit: LIMIT, order_status: status || undefined, q: search || undefined }), [page, status, search]);

  useEffect(() => {
    const t = setTimeout(() => (setSearch(q.trim()), setPage(1)), 350);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <PageHeader title="Pesanan" description="Kemas pesanan yang sudah dibayar, isi resi saat dikirim. Pelanggan menerima email beserta tautan lacak." />
      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <Segmented value={status} onChange={(v) => (setStatus(v), setPage(1))} options={FILTERS} className="flex-1" />
          <div className="md:w-72">
            <Input leading={<Search className="size-4" />} className="h-10" placeholder="No. order / nama penerima" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari pesanan" />
          </div>
        </div>
        {list.error ? (
          <div className="p-4">
            <ErrorState message={list.error} onRetry={list.reload} />
          </div>
        ) : list.loading && !list.data ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !list.data?.data.length ? (
          <EmptyState title="Tidak ada pesanan" description={search ? "Coba kata kunci lain." : undefined} />
        ) : (
          <>
          <MobileList>
            {list.data.data.map((o) => (
              <li key={o.id}>
                <AdminOrderCard order={o} onClick={() => setOpenId(o.id)} />
              </li>
            ))}
          </MobileList>
          <DesktopOnly>
          <Table head={["Pesanan", "Pelanggan", "Total", "Pembayaran", "Status", ""]}>
            {list.data.data.map((o) => (
              <tr key={o.id} className="cursor-pointer hover:bg-stone/60" onClick={() => setOpenId(o.id)}>
                <td className={td}>
                  <p className="font-semibold tabular">{o.order_number}</p>
                  <p className="text-xs text-muted">{timeAgo(o.created_at)}</p>
                </td>
                <td className={td}>
                  <p className="font-medium">{o.recipient_name}</p>
                  <p className="text-xs text-muted">
                    {o.item_count} barang · {o.shipping_city ?? "-"}
                  </p>
                </td>
                <td className={td + " font-semibold tabular"}>{formatRupiah(o.total_amount)}</td>
                <td className={td}>
                  <PaymentBadge order={o} />
                </td>
                <td className={td}>
                  <Badge tone={ORDER_STATUS_TONE[o.order_status]} dot>
                    {ORDER_STATUS_LABEL[o.order_status]}
                  </Badge>
                </td>
                <td className={td + " text-right"}>
                  <Button size="sm" variant="soft">
                    Kelola
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
          </DesktopOnly>
          </>
        )}
        {list.data && list.data.meta.total > LIMIT && (
          <div className="border-t border-line p-4">
            <Pagination page={page} limit={LIMIT} total={list.data.meta.total} onPage={setPage} />
          </div>
        )}
      </Panel>

      {openId && <OrderDrawer id={openId} onClose={() => setOpenId(null)} onChanged={list.reload} />}
    </div>
  );
}

export function PaymentBadge({ order: o }: { order: ApiOrderListItem }) {
  if (!o.payment_status) return <span className="text-xs text-muted">—</span>;
  return (
    <Badge tone={o.payment_status === "approved" ? "success" : o.payment_status === "rejected" ? "danger" : o.has_proof ? "info" : "neutral"}>
      {o.payment_status === "pending" ? (o.has_proof ? "Cek bukti" : "Belum bayar") : PAYMENT_STATUS_LABEL[o.payment_status]}
    </Badge>
  );
}

/** Kartu pesanan untuk layar kecil (daftar pesanan & ringkasan). */
export function AdminOrderCard({ order: o, onClick, href }: { order: ApiOrderListItem; onClick?: () => void; href?: string }) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-mono text-[12.5px] font-semibold tracking-tight">{o.order_number}</p>
        <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted">
          {timeAgo(o.created_at)} <ChevronRight className="size-4" />
        </span>
      </div>
      <p className="mt-1 truncate text-[13px] text-muted">
        <span className="font-semibold text-ink">{o.recipient_name}</span> · {o.item_count} barang
        {o.shipping_city ? " · " + o.shipping_city : ""}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="font-display text-lg font-bold tabular">{formatRupiah(o.total_amount)}</span>
        <span className="flex flex-wrap items-center justify-end gap-1.5">
          <Badge tone={ORDER_STATUS_TONE[o.order_status]} dot>
            {ORDER_STATUS_LABEL[o.order_status]}
          </Badge>
          <PaymentBadge order={o} />
        </span>
      </div>
    </>
  );
  const cls = "block w-full px-4 py-4 text-left transition-colors active:bg-stone";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function OrderDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { data: d, error, loading, reload } = useAsync(() => orderService.get(id), [id]);
  const [busy, setBusy] = useState<string | null>(null);
  const [shipOpen, setShipOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const refresh = async () => {
    await reload();
    onChanged();
  };

  const transition = async (to: OrderStatus, extra?: { tracking_number?: string; courier_name?: string; reason?: string }) => {
    setBusy(to);
    const ok = await run(() => adminService.updateOrderStatus(id, { order_status: to, ...extra }), "Status diperbarui: " + ORDER_STATUS_LABEL[to]);
    setBusy(null);
    if (ok) {
      setShipOpen(false);
      setCancelOpen(false);
      refresh();
    }
  };

  return (
    <Dialog open onClose={onClose} variant="drawer" title={d ? d.order_number : "Pesanan"} description={d ? "Dibuat " + formatDate(d.created_at, true) : undefined}>
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading || !d ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={ORDER_STATUS_TONE[d.order_status]} dot>
              {ORDER_STATUS_LABEL[d.order_status]}
            </Badge>
            <CopyButton value={d.order_number} label="Salin no." />
          </div>

          {/* Aksi status */}
          {(NEXT[d.order_status]?.length || CANCELLABLE.includes(d.order_status)) && (
            <div className="rounded-2xl border border-ink bg-white p-4">
              <p className="caps mb-3 text-muted">Langkah berikutnya</p>
              <div className="grid gap-2 sm:flex sm:flex-wrap">
                {NEXT[d.order_status]?.map((n) => (
                  <Button
                    key={n.to}
                    size="lg"
                    variant={n.to === "shipped" ? "primary" : "dark"}
                    loading={busy === n.to}
                    onClick={() => (n.to === "shipped" ? setShipOpen(true) : transition(n.to))}
                  >
                    {n.to === "shipped" ? <Truck className="size-4" /> : <PackageCheck className="size-4" />} {n.label}
                  </Button>
                ))}
                {CANCELLABLE.includes(d.order_status) && (
                  <Button size="lg" variant="danger-outline" onClick={() => setCancelOpen(true)}>
                    <XCircle className="size-4" /> Batalkan pesanan
                  </Button>
                )}
              </div>
              {d.order_status === "pending_payment" && (
                <p className="mt-3 text-xs text-muted">
                  Menunggu pelanggan membayar. Status berubah ke “Dibayar” otomatis setelah bukti disetujui di menu Verifikasi bayar.
                  {d.payment_due_at && ` Batas bayar ${formatDate(d.payment_due_at, true)}.`}
                </p>
              )}
              {d.order_status !== "pending_payment" && CANCELLABLE.includes(d.order_status) && (
                <p className="mt-3 text-xs text-muted">Pesanan ini sudah dibayar: pembatalan berarti dana harus dikembalikan manual ke pelanggan.</p>
              )}
            </div>
          )}
          {d.cancel_reason && (
            <p className="rounded-xl bg-danger-soft p-3 text-sm">
              <b>Alasan batal:</b> {d.cancel_reason}
            </p>
          )}

          <PaymentBox order={d} onChanged={refresh} />
          <ShipmentBox order={d} onChanged={refresh} />

          <section>
            <p className="caps mb-2 text-muted">Barang</p>
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {d.items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 p-3 text-sm">
                  <span className="h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-stone-2">
                    {it.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
          decoding="async" src={cdn(it.image_url, 160)} alt="" className="size-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{it.product_name}</span>
                    <span className="text-xs text-muted">
                      Size {it.size} · {it.quantity} × {formatRupiah(it.unit_price)}
                    </span>
                  </span>
                  <span className="font-semibold tabular">{formatRupiah(it.subtotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular">{formatRupiah(d.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">
                  Ongkir {[d.courier_code?.toUpperCase(), d.courier_service].filter(Boolean).join(" ")} · {d.shipping_weight_gram ?? "-"} g
                </dt>
                <dd className="tabular">{formatRupiah(d.shipping_cost)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Total order</dt>
                <dd className="tabular">{formatRupiah(d.total_amount)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl bg-stone p-4 text-sm">
            <p className="caps mb-2 text-muted">Alamat kirim</p>
            <p className="font-semibold">
              {d.recipient_name} · {d.recipient_phone}
            </p>
            <p className="mt-1 leading-relaxed">{joinAddress(d)}</p>
            <CopyButton
              className="mt-3"
              label="Salin alamat"
              value={`${d.recipient_name} (${d.recipient_phone})\n${joinAddress(d)}`}
            />
          </section>
        </div>
      )}

      {d && (
        <ShipDialog
          open={shipOpen}
          onClose={() => setShipOpen(false)}
          defaultCourier={[d.courier_code?.toUpperCase(), d.courier_service].filter(Boolean).join(" ")}
          busy={busy === "shipped"}
          onSubmit={(tracking, courier) => transition("shipped", { tracking_number: tracking, courier_name: courier || undefined })}
        />
      )}
      <CancelDialog open={cancelOpen} onClose={() => setCancelOpen(false)} busy={busy === "cancelled"} onSubmit={(reason) => transition("cancelled", { reason })} />
    </Dialog>
  );
}

function PaymentBox({ order: d, onChanged }: { order: ApiOrderDetail; onChanged: () => void }) {
  const p = d.payment;
  const [busy, setBusy] = useState<string | null>(null);
  if (!p) return <p className="rounded-xl bg-stone p-3 text-sm text-muted">Belum ada tagihan pembayaran.</p>;

  const view = async () => {
    const w = window.open("", "_blank");
    const blob = await run(() => paymentService.proof(d.id));
    if (!blob || blob === true) return w?.close();
    const url = URL.createObjectURL(blob);
    if (w) w.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  const review = async (status: "approved" | "rejected") => {
    setBusy(status);
    const ok = await run(() => adminService.reviewPayment(p.id, status), status === "approved" ? "Pembayaran disetujui." : "Bukti ditolak, pelanggan diminta unggah ulang.");
    setBusy(null);
    if (ok) onChanged();
  };

  return (
    <section className="rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between">
        <p className="caps text-muted">Pembayaran QRIS</p>
        <Badge tone={p.status === "approved" ? "success" : p.status === "rejected" ? "danger" : p.has_proof ? "info" : "neutral"}>
          {p.status === "pending" ? (p.has_proof ? "Perlu dicek" : "Belum bayar") : PAYMENT_STATUS_LABEL[p.status]}
        </Badge>
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold tabular">{formatRupiah(p.amount)}</p>
      <p className="text-xs text-muted">Kode unik {String(p.unique_code).padStart(3, "0")} · cocokkan dengan mutasi QRIS</p>
      {p.has_proof && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="soft" onClick={view}>
            <ExternalLink className="size-4" /> Lihat bukti
          </Button>
          {p.status === "pending" && d.order_status === "pending_payment" && (
            <>
              <Button size="sm" variant="primary" loading={busy === "approved"} onClick={() => review("approved")}>
                Setujui
              </Button>
              <Button size="sm" variant="ghost" className="text-danger" loading={busy === "rejected"} onClick={() => review("rejected")}>
                Tolak
              </Button>
            </>
          )}
        </div>
      )}
      {p.paid_at && <p className="mt-2 text-xs text-muted">Bukti dikirim {formatDate(p.paid_at, true)}</p>}
    </section>
  );
}

const SHIP_STATUS = [
  { value: "pending", label: "Menunggu pickup" },
  { value: "shipped", label: "Dalam perjalanan" },
  { value: "delivered", label: "Diterima" },
  { value: "returned", label: "Dikembalikan" },
];

function ShipmentBox({ order: d, onChanged }: { order: ApiOrderDetail; onChanged: () => void }) {
  const s = d.shipment;
  const [edit, setEdit] = useState(false);
  const [courier, setCourier] = useState(s?.courier_name ?? "");
  const [resi, setResi] = useState(s?.tracking_number ?? "");
  const [status, setStatus] = useState(s?.shipping_status ?? "pending");
  const [busy, setBusy] = useState(false);
  if (!s) return null;
  const links = trackingLinks(s.courier_name, s.tracking_number);

  return (
    <section className="rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between">
        <p className="caps text-muted">Pengiriman</p>
        <Badge tone="dark">{SHIPPING_STATUS_LABEL[s.shipping_status] ?? s.shipping_status}</Badge>
      </div>
      {!edit ? (
        <>
          <p className="mt-2 text-sm font-semibold">{s.courier_name}</p>
          {s.tracking_number && (
            <div className="mt-1 flex items-center gap-2">
              <span className="font-display text-lg font-bold tabular">{s.tracking_number}</span>
              <CopyButton value={s.tracking_number} />
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4">
                {l.label} <ExternalLink className="size-3" />
              </a>
            ))}
            <button type="button" onClick={() => setEdit(true)} className="ml-auto text-xs font-semibold underline underline-offset-4">
              Ubah data kirim
            </button>
          </div>
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <Input className="h-10" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Kurir" aria-label="Kurir" />
          <Input className="h-10" value={resi} onChange={(e) => setResi(e.target.value)} placeholder="No. resi" aria-label="No. resi" />
          <Select value={status} onChange={setStatus} options={SHIP_STATUS} size="sm" aria-label="Status kirim" />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEdit(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              variant="dark"
              loading={busy}
              disabled={!courier.trim()}
              onClick={async () => {
                setBusy(true);
                const ok = await run(
                  () => adminService.upsertShipment(d.id, { courier_name: courier.trim(), tracking_number: resi.trim() || null, coverage_status: "covered", shipping_status: status }),
                  "Data pengiriman disimpan & email dikirim."
                );
                setBusy(false);
                if (ok) {
                  setEdit(false);
                  onChanged();
                }
              }}
            >
              Simpan
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function ShipDialog({
  open,
  onClose,
  defaultCourier,
  busy,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  defaultCourier: string;
  busy: boolean;
  onSubmit: (tracking: string, courier: string) => void;
}) {
  const [tracking, setTracking] = useState("");
  const [courier, setCourier] = useState(defaultCourier);
  useEffect(() => {
    if (open) {
      setTracking("");
      setCourier(defaultCourier);
    }
  }, [open, defaultCourier]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Kirim pesanan"
      description="No. resi dikirim ke email pelanggan bersama tautan lacak."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" loading={busy} disabled={!tracking.trim()} onClick={() => onSubmit(tracking.trim(), courier.trim())}>
            Simpan & kirim email
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="No. resi" required>
          {(id) => <Input id={id} autoFocus value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="mis. P2411060012345" />}
        </Field>
        <Field label="Kurir" hint="Kosongkan untuk memakai kurir dari checkout.">
          {(id, dsc) => <Input id={id} aria-describedby={dsc} value={courier} onChange={(e) => setCourier(e.target.value)} />}
        </Field>
      </div>
    </Dialog>
  );
}

function CancelDialog({ open, onClose, busy, onSubmit }: { open: boolean; onClose: () => void; busy: boolean; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) setReason("");
  }, [open]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Batalkan pesanan"
      description="Stok dikembalikan otomatis dan pelanggan menerima email berisi alasan pembatalan."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Kembali
          </Button>
          <Button
            variant="danger"
            loading={busy}
            disabled={reason.trim().length < 5}
            onClick={() => (reason.trim().length >= 5 ? onSubmit(reason.trim()) : toast.error("Tulis alasan pembatalan."))}
          >
            Batalkan pesanan
          </Button>
        </div>
      }
    >
      <Field label="Alasan" required hint="Mis. stok fisik rusak, permintaan pelanggan, pembayaran tidak sesuai.">
        {(id, dsc) => <Textarea id={id} aria-describedby={dsc} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />}
      </Field>
    </Dialog>
  );
}

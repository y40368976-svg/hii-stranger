"use client";
import React, { useEffect, useState } from "react";
import { Check, ExternalLink, FileText, X } from "lucide-react";
import { adminService, paymentService } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import { formatDate, formatRupiah, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, timeAgo } from "@/lib/format";
import { Badge, EmptyState, ErrorState, Segmented, Skeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { ApiAdminPayment } from "@/types/api";
import { ListPager, MobileSearch, PageHeader, Panel, run, useMobileLimit } from "./kit";

const LIMIT = 20;

export default function AdminPayments() {
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<ApiAdminPayment | null>(null);
  // Kolom cari hanya ada di mobile; desktop tidak mengirim `q`.
  const [search, setSearch] = useState("");
  const { mobile, limit } = useMobileLimit(LIMIT, () => setPage(1));
  const q = mobile && search ? search : undefined;
  const list = useAsync(() => adminService.payments({ status: status || undefined, q, page, limit }), [status, q, page, limit]);
  const rows = list.data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Verifikasi bayar"
        description="Cocokkan nominal unik di bukti dengan mutasi QRIS di aplikasi merchant. Setujui untuk memindahkan pesanan ke antrean kemas."
      />
      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <MobileSearch value={search} onSearch={(v) => (setSearch(v), setPage(1))} placeholder="No. order / nama / email" />
          <Segmented
            value={status}
            onChange={(v) => (setStatus(v), setPage(1))}
            options={[
              { value: "pending", label: "Menunggu" },
              { value: "approved", label: "Disetujui" },
              { value: "rejected", label: "Ditolak" },
              { value: "", label: "Semua" },
            ]}
          />
        </div>
        {list.error ? (
          <div className="p-4">
            <ErrorState message={list.error} onRetry={list.reload} />
          </div>
        ) : list.loading && !list.data ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : !rows.length && q ? (
          <EmptyState title="Tidak ditemukan" description="Coba kata kunci lain." />
        ) : !rows.length ? (
          <EmptyState title={status === "pending" ? "Antrean kosong" : "Tidak ada data"} description={status === "pending" ? "Semua bukti sudah diverifikasi." : undefined} />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((p) => {
              const actionable = p.status === "pending" && p.has_proof && p.order_status === "pending_payment";
              return (
                <li key={p.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold tabular">{p.order_number}</span>
                      <Badge tone={p.status === "approved" ? "success" : p.status === "rejected" ? "danger" : p.has_proof ? "info" : "neutral"}>
                        {p.status === "pending" ? (p.has_proof ? "Bukti masuk" : "Belum ada bukti") : PAYMENT_STATUS_LABEL[p.status]}
                      </Badge>
                      {p.order_status === "cancelled" && <Badge tone="danger">Order batal</Badge>}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted">
                      {p.customer_name} · {p.customer_email}
                    </p>
                  </div>
                  <div className="md:w-48 md:text-right">
                    <p className="font-display text-xl font-extrabold tabular">{formatRupiah(p.amount)}</p>
                    <p className="text-xs text-muted">kode unik {String(p.unique_code).padStart(3, "0")}</p>
                  </div>
                  <div className="text-xs text-muted md:w-28 md:text-right">{p.paid_at ? timeAgo(p.paid_at) : "—"}</div>
                  <div className="md:w-32 md:text-right">
                    {p.has_proof ? (
                      <Button size="sm" variant={actionable ? "dark" : "soft"} onClick={() => setOpen(p)}>
                        {actionable ? "Verifikasi" : "Lihat"}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted">Menunggu pelanggan</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {list.data && <ListPager page={page} limit={limit} total={list.data.meta.total} onPage={setPage} />}
      </Panel>
      {open && <ReviewDialog payment={open} onClose={() => setOpen(null)} onDone={() => (setOpen(null), list.reload())} />}
    </div>
  );
}

function ReviewDialog({ payment: p, onClose, onDone }: { payment: ApiAdminPayment; onClose: () => void; onDone: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [type, setType] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const actionable = p.status === "pending" && p.order_status === "pending_payment";

  useEffect(() => {
    let revoke: string | null = null;
    paymentService
      .proof(p.order_id)
      .then((b) => {
        revoke = URL.createObjectURL(b);
        setType(b.type);
        setUrl(revoke);
      })
      .catch((e) => setErr(e.message));
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [p.order_id]);

  const review = async (status: "approved" | "rejected") => {
    setBusy(status);
    const ok = await run(() => adminService.reviewPayment(p.id, status), status === "approved" ? "Disetujui. Pesanan masuk antrean kemas." : "Ditolak. Pelanggan diminta unggah ulang.");
    setBusy(null);
    if (ok) onDone();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title={"Bukti " + p.order_number}
      description={`${p.customer_name} · dikirim ${formatDate(p.paid_at, true)}`}
      footer={
        actionable ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" className="text-danger" loading={busy === "rejected"} onClick={() => review("rejected")}>
              <X className="size-4" /> Tolak bukti
            </Button>
            <Button variant="primary" loading={busy === "approved"} onClick={() => review("approved")}>
              <Check className="size-4" /> Nominal cocok, setujui
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <div className="grid min-h-[320px] place-items-center overflow-hidden rounded-2xl border border-line bg-stone">
          {err ? (
            <p className="p-6 text-sm text-danger">{err}</p>
          ) : !url ? (
            <Skeleton className="h-[420px] w-full" />
          ) : type === "application/pdf" ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-10 text-sm font-semibold">
              <FileText className="size-10" /> Buka PDF <ExternalLink className="size-4" />
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Bukti pembayaran" className="max-h-[70vh] w-full object-contain" />
          )}
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl bg-ink p-4 text-canvas">
            <p className="caps text-canvas/60">Harus diterima</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular">{formatRupiah(p.amount)}</p>
            <p className="mt-1 text-xs text-canvas/60">
              3 digit terakhir <b className="text-lime tabular">{String(p.unique_code).padStart(3, "0")}</b>
            </p>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Total order</dt>
              <dd className="tabular">{formatRupiah(p.order_total)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Status order</dt>
              <dd>{ORDER_STATUS_LABEL[p.order_status]}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Batas bayar</dt>
              <dd>{formatDate(p.payment_due_at, true)}</dd>
            </div>
          </dl>
          <ul className="space-y-1.5 rounded-xl border border-line p-3 text-xs text-ink-3">
            <li>✓ Nominal sama persis termasuk kode unik</li>
            <li>✓ Status transaksi “Berhasil”</li>
            <li>✓ Dana muncul di mutasi QRIS merchant</li>
          </ul>
          {!actionable && <p className="text-xs text-muted">Pembayaran ini sudah {PAYMENT_STATUS_LABEL[p.status].toLowerCase()} atau ordernya tidak lagi menunggu pembayaran.</p>}
        </div>
      </div>
    </Dialog>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { BadgeCheck, ChevronRight, KeyRound, LogOut, MailWarning, Package, UserRound } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { authService, orderService } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import { errorMessage } from "@/lib/api";
import { formatDate, formatRupiah, ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from "@/lib/format";
import { Badge, EmptyState, ErrorState, Pagination, Segmented, Skeleton } from "@/components/ui/misc";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

type Tab = "orders" | "profile" | "security";
const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: "orders", label: "Pesanan", icon: Package },
  { value: "profile", label: "Profil", icon: UserRound },
  { value: "security", label: "Keamanan", icon: KeyRound },
];

export default function Account() {
  const { user, loading, isStaff, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const tab = (TABS.find((t) => t.value === sp.get("tab"))?.value ?? "orders") as Tab;

  useEffect(() => {
    if (!loading && !user) router.replace("/signin?next=/my-account");
    if (!loading && isStaff) router.replace("/admin");
  }, [loading, user, isStaff, router]);

  if (loading || !user || isStaff)
    return (
      <div className="container-x py-10">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="mt-8 h-72" />
      </div>
    );

  return (
    <div className="container-x py-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="caps mb-1 text-muted">Akun</p>
          <h1 className="font-display text-[34px] font-extrabold uppercase leading-none tracking-tight md:text-5xl">
            Halo, {user.name.split(" ")[0]}
          </h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            logout();
            router.push("/");
          }}
        >
          <LogOut className="size-4" /> Keluar
        </Button>
      </div>

      <div className="mt-8 grid *:min-w-0 gap-8 lg:grid-cols-[240px_1fr]">
        <nav className="no-scrollbar flex min-w-0 gap-2 overflow-x-auto lg:flex-col" aria-label="Menu akun">
          {TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => router.replace(pathname + (value === "orders" ? "" : "?tab=" + value), { scroll: false })}
              aria-current={tab === value ? "page" : undefined}
              className={cn(
                "inline-flex h-11 shrink-0 items-center gap-2.5 rounded-xl px-4 text-sm font-semibold transition-colors",
                tab === value ? "bg-ink text-lime" : "bg-stone text-ink-3 hover:bg-stone-2"
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          {tab === "orders" && <Orders />}
          {tab === "profile" && <Profile />}
          {tab === "security" && <Security />}
        </div>
      </div>
    </div>
  );
}

const ORDER_FILTERS = [
  { value: "", label: "Semua" },
  { value: "pending_payment", label: "Belum bayar" },
  { value: "paid", label: "Dibayar" },
  { value: "processing", label: "Dikemas" },
  { value: "shipped", label: "Dikirim" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Batal" },
];

function Orders() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const list = useAsync(() => orderService.listMine({ order_status: status || undefined, page, limit: 10 }), [status, page]);

  return (
    <div>
      <Segmented value={status} onChange={(v) => (setStatus(v), setPage(1))} options={ORDER_FILTERS} />
      <div className="mt-5">
        {list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : list.loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : !list.data?.data.length ? (
          <EmptyState
            className="rounded-2xl border border-line bg-stone"
            title={status ? "Tidak ada pesanan di status ini" : "Belum ada pesanan"}
            action={<LinkButton href="/shop">Mulai belanja</LinkButton>}
          />
        ) : (
          <>
            <ul className="space-y-3">
              {list.data.data.map((o) => (
                <li key={o.id}>
                  <Link href={"/orders/" + o.id} className="group block rounded-2xl border border-line bg-white p-4 transition-colors hover:border-ink md:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display font-bold tracking-tight tabular">{o.order_number}</span>
                      <Badge tone={ORDER_STATUS_TONE[o.order_status]} dot>
                        {o.order_status === "pending_payment" && o.has_proof && o.payment_status === "pending"
                          ? "Diverifikasi"
                          : ORDER_STATUS_LABEL[o.order_status]}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-4">
                      <div className="text-sm text-muted">
                        <p>{formatDate(o.created_at, true)}</p>
                        <p>
                          {o.item_count} barang · {o.shipping_city ?? "-"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg font-bold tabular">{formatRupiah(o.total_amount)}</span>
                        <ChevronRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                    {o.order_status === "pending_payment" && !o.has_proof && (
                      <p className="mt-3 rounded-lg bg-lime/40 px-3 py-2 text-xs font-semibold">
                        Selesaikan pembayaran sebelum {formatDate(o.payment_due_at, true)}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Pagination page={page} limit={10} total={list.data.meta.total} onPage={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  if (!user) return null;
  const dirty = name.trim() !== user.name || (phone.trim() || null) !== user.phone;

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center",
          user.email_verified_at ? "border-line bg-stone" : "border-ink bg-white"
        )}
      >
        {user.email_verified_at ? <BadgeCheck className="size-6 shrink-0" /> : <MailWarning className="size-6 shrink-0" />}
        <div className="flex-1 text-sm">
          <p className="font-semibold">{user.email}</p>
          <p className="text-muted">
            {user.email_verified_at
              ? "Email terverifikasi " + formatDate(user.email_verified_at)
              : "Belum terverifikasi — wajib sebelum checkout."}
          </p>
        </div>
        {!user.email_verified_at && (
          <Button
            variant="dark"
            size="sm"
            loading={sending}
            onClick={async () => {
              setSending(true);
              try {
                await authService.resendVerification();
                toast.success("Tautan verifikasi dikirim.");
              } catch (e) {
                toast.error(errorMessage(e));
              } finally {
                setSending(false);
              }
            }}
          >
            Kirim tautan verifikasi
          </Button>
        )}
      </div>

      <form
        className="rounded-2xl border border-line bg-white p-5 md:p-7"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            setUser(await authService.updateMe({ name: name.trim(), phone: phone.trim() || null }));
            toast.success("Profil disimpan.");
          } catch (err) {
            toast.error(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="mb-5 text-base font-bold">Data diri</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama lengkap" required>
            {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
          </Field>
          <Field label="No. HP" hint="Dipakai sebagai default saat checkout.">
            {(id, d) => <Input id={id} aria-describedby={d} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />}
          </Field>
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" variant="dark" loading={busy} disabled={!dirty || !name.trim()}>
            Simpan perubahan
          </Button>
        </div>
      </form>
    </div>
  );
}

function Security() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const mismatch = confirm !== "" && confirm !== next;
  const weak = next !== "" && next.length < 8;

  return (
    <form
      className="max-w-xl rounded-2xl border border-line bg-white p-5 md:p-7"
      onSubmit={async (e) => {
        e.preventDefault();
        if (mismatch || weak) return;
        setBusy(true);
        try {
          await authService.changePassword({ current_password: cur, new_password: next });
          toast.success("Password diganti.");
          setCur("");
          setNext("");
          setConfirm("");
        } catch (err) {
          toast.error(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="mb-5 text-base font-bold">Ganti password</p>
      <div className="space-y-4">
        <Field label="Password saat ini" required>
          {(id) => <Input id={id} type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />}
        </Field>
        <Field label="Password baru" required error={weak ? "Minimal 8 karakter." : null}>
          {(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" value={next} invalid={weak} onChange={(e) => setNext(e.target.value)} />}
        </Field>
        <Field label="Ulangi password baru" required error={mismatch ? "Password tidak sama." : null}>
          {(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" value={confirm} invalid={mismatch} onChange={(e) => setConfirm(e.target.value)} />}
        </Field>
      </div>
      <div className="mt-6 flex justify-end">
        <Button type="submit" variant="dark" loading={busy} disabled={!cur || !next || mismatch || weak}>
          Ganti password
        </Button>
      </div>
    </form>
  );
}

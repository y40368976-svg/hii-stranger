"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Lock, MailWarning, MapPin, QrCode, ShoppingBag, Truck } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useAppSelector } from "@/redux/store";
import { selectCart } from "@/redux/features/cart-slice";
import { useCartActions } from "@/hooks/useCartActions";
import { authService, orderService, regionService } from "@/services";
import { ApiError, errorMessage } from "@/lib/api";
import { etdLabel, formatRupiah } from "@/lib/format";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import type { ApiRegion, ApiShippingQuote } from "@/types/api";
import { cdn } from "@/lib/img";

type Form = {
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string;
};
const EMPTY: Form = { recipient_name: "", recipient_phone: "", shipping_address: "", province: "", city: "", district: "", subdistrict: "" };
const SAVED_KEY = "hs_last_address";

const toOptions = (rs: ApiRegion[] | null) =>
  (rs ?? []).map((r) => ({ value: String(r.id), label: r.name, description: r.zip_code && r.zip_code !== "0" ? "Kode pos " + r.zip_code : undefined }));

export default function Checkout() {
  const { user, loading, isStaff, canOrder } = useAuth();
  const { items, subtotal, loaded } = useAppSelector(selectCart);
  const { refresh } = useCartActions();
  const router = useRouter();

  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [provinces, setProvinces] = useState<ApiRegion[] | null>(null);
  const [cities, setCities] = useState<ApiRegion[] | null>(null);
  const [districts, setDistricts] = useState<ApiRegion[] | null>(null);
  const [subs, setSubs] = useState<ApiRegion[] | null>(null);
  const [loadingLevel, setLoadingLevel] = useState<string | null>(null);
  const [quote, setQuote] = useState<ApiShippingQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/signin?next=/checkout");
  }, [loading, user, router]);

  // Prefill dari akun & alamat terakhir (disimpan di perangkat ini saja).
  useEffect(() => {
    if (!user) return;
    let saved: Partial<Form> = {};
    try {
      saved = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "{}");
    } catch {}
    setForm((f) => ({
      ...f,
      recipient_name: saved.recipient_name || user.name,
      recipient_phone: saved.recipient_phone || user.phone || "",
      shipping_address: saved.shipping_address || "",
      province: saved.province || "",
      city: saved.city || "",
      district: saved.district || "",
      subdistrict: saved.subdistrict || "",
    }));
  }, [user]);

  const loadLevel = async <T,>(level: string, fn: () => Promise<T>, set: (v: T) => void) => {
    setLoadingLevel(level);
    try {
      set(await fn());
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoadingLevel(null);
    }
  };

  useEffect(() => {
    if (canOrder) loadLevel("province", regionService.provinces, setProvinces);
  }, [canOrder]);
  useEffect(() => {
    setCities(null);
    if (form.province) loadLevel("city", () => regionService.cities(Number(form.province)), setCities);
  }, [form.province]);
  useEffect(() => {
    setDistricts(null);
    if (form.city) loadLevel("district", () => regionService.districts(Number(form.city)), setDistricts);
  }, [form.city]);
  useEffect(() => {
    setSubs(null);
    if (form.district) loadLevel("subdistrict", () => regionService.subdistricts(Number(form.district)), setSubs);
  }, [form.district]);

  const cartKey = items.map((i) => i.id + ":" + i.quantity).join(",");
  useEffect(() => {
    setQuote(null);
    setQuoteError(null);
    if (!form.subdistrict || !items.length) return;
    setQuoting(true);
    regionService
      .shippingCost(Number(form.subdistrict))
      .then(setQuote)
      .catch((e) => setQuoteError(errorMessage(e)))
      .finally(() => setQuoting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.subdistrict, cartKey]);

  const set = (k: keyof Form, v: string) => {
    setErrors((e) => ({ ...e, [k]: undefined }));
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "province") Object.assign(next, { city: "", district: "", subdistrict: "" });
      if (k === "city") Object.assign(next, { district: "", subdistrict: "" });
      if (k === "district") Object.assign(next, { subdistrict: "" });
      return next;
    });
  };

  const total = useMemo(() => Number(subtotal) + (quote ? Number(quote.cost) : 0), [subtotal, quote]);
  const overStock = items.some((i) => i.quantity > i.stock);

  const validate = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.recipient_name.trim()) e.recipient_name = "Nama penerima wajib diisi.";
    if (!/^\+?[0-9 ()-]{6,20}$/.test(form.recipient_phone.trim())) e.recipient_phone = "Nomor HP tidak valid.";
    if (form.shipping_address.trim().length < 8) e.shipping_address = "Tulis alamat lengkap (jalan, nomor, RT/RW).";
    if (!form.province) e.province = "Pilih provinsi.";
    if (!form.city) e.city = "Pilih kota/kabupaten.";
    if (!form.district) e.district = "Pilih kecamatan.";
    if (!form.subdistrict) e.subdistrict = "Pilih kelurahan.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error("Lengkapi data pengiriman.");
      return;
    }
    if (!quote) return toast.error(quoteError ?? "Ongkir belum tersedia.");
    setSubmitting(true);
    try {
      const order = await orderService.create({
        recipient_name: form.recipient_name.trim(),
        recipient_phone: form.recipient_phone.trim(),
        shipping_address: form.shipping_address.trim(),
        province_id: Number(form.province),
        city_id: Number(form.city),
        district_id: Number(form.district),
        subdistrict_id: Number(form.subdistrict),
        cart_item_ids: items.map((i) => i.id),
      });
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(form));
      } catch {}
      await refresh().catch(() => {});
      toast.success("Pesanan dibuat. Selesaikan pembayaran QRIS.");
      router.replace("/orders/" + order.id + "?new=1");
    } catch (e) {
      if (e instanceof ApiError && e.details.length) {
        const fieldMap: Record<string, keyof Form> = {
          recipient_name: "recipient_name",
          recipient_phone: "recipient_phone",
          shipping_address: "shipping_address",
          subdistrict_id: "subdistrict",
        };
        const next: Partial<Record<keyof Form, string>> = {};
        e.details.forEach((d) => fieldMap[d.field] && (next[fieldMap[d.field]] = d.message));
        setErrors(next);
      }
      toast.error(errorMessage(e));
      if (e instanceof ApiError && e.status === 409) refresh().catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user || !loaded)
    return (
      <div className="container-x py-10">
        <Skeleton className="h-10 w-56" />
        <div className="mt-8 grid *:min-w-0 gap-8 lg:grid-cols-[1fr_400px]">
          <Skeleton className="h-[480px]" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );

  if (isStaff)
    return (
      <div className="container-x py-16">
        <EmptyState title="Checkout khusus pelanggan" description="Akun admin dan staff tidak dapat membuat pesanan." action={<LinkButton href="/admin">Ke panel</LinkButton>} />
      </div>
    );

  if (!canOrder) return <VerifyGate email={user.email} />;

  if (items.length === 0)
    return (
      <div className="container-x py-16">
        <EmptyState icon={<ShoppingBag className="size-6" />} title="Tas masih kosong" action={<LinkButton href="/shop">Jelajahi katalog</LinkButton>} />
      </div>
    );

  return (
    <form onSubmit={submit} className="container-x pb-20 pt-8 sm:pb-8 md:py-12" noValidate>
      <p className="caps mb-1 text-muted">Checkout</p>
      <h1 className="font-display text-[34px] font-extrabold uppercase leading-none tracking-tight md:text-5xl">Pengiriman</h1>

      <div className="mt-8 grid *:min-w-0 gap-8 lg:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-line bg-white p-5 md:p-7">
            <h2 className="mb-5 flex items-center gap-2 text-base font-bold">
              <span className="grid size-7 place-items-center rounded-full bg-ink text-xs text-lime">1</span> Penerima
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama penerima" required error={errors.recipient_name}>
                {(id, d) => (
                  <Input id={id} aria-describedby={d} autoComplete="name" value={form.recipient_name} invalid={!!errors.recipient_name} onChange={(e) => set("recipient_name", e.target.value)} />
                )}
              </Field>
              <Field label="No. HP / WhatsApp" required error={errors.recipient_phone} hint="Dipakai kurir untuk menghubungi.">
                {(id, d) => (
                  <Input id={id} aria-describedby={d} type="tel" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" value={form.recipient_phone} invalid={!!errors.recipient_phone} onChange={(e) => set("recipient_phone", e.target.value)} />
                )}
              </Field>
            </div>
          </section>

          <section id="checkout-address" className="scroll-mt-24 rounded-2xl border border-line bg-white p-5 md:p-7">
            <h2 className="mb-5 flex items-center gap-2 text-base font-bold">
              <span className="grid size-7 place-items-center rounded-full bg-ink text-xs text-lime">2</span> Alamat
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Provinsi" required error={errors.province}>
                {(id, d) => (
                  <Select id={id} aria-describedby={d} searchable value={form.province} onChange={(v) => set("province", v)} options={toOptions(provinces)} loading={loadingLevel === "province"} placeholder="Pilih provinsi" searchPlaceholder="Cari provinsi…" sheetTitle="Provinsi" invalid={!!errors.province} />
                )}
              </Field>
              <Field label="Kota / kabupaten" required error={errors.city}>
                {(id, d) => (
                  <Select id={id} aria-describedby={d} searchable value={form.city} onChange={(v) => set("city", v)} options={toOptions(cities)} disabled={!form.province} loading={loadingLevel === "city"} placeholder={form.province ? "Pilih kota" : "Pilih provinsi dulu"} searchPlaceholder="Cari kota…" sheetTitle="Kota / kabupaten" invalid={!!errors.city} />
                )}
              </Field>
              <Field label="Kecamatan" required error={errors.district}>
                {(id, d) => (
                  <Select id={id} aria-describedby={d} searchable value={form.district} onChange={(v) => set("district", v)} options={toOptions(districts)} disabled={!form.city} loading={loadingLevel === "district"} placeholder={form.city ? "Pilih kecamatan" : "Pilih kota dulu"} searchPlaceholder="Cari kecamatan…" sheetTitle="Kecamatan" invalid={!!errors.district} />
                )}
              </Field>
              <Field label="Kelurahan / desa" required error={errors.subdistrict}>
                {(id, d) => (
                  <Select id={id} aria-describedby={d} searchable value={form.subdistrict} onChange={(v) => set("subdistrict", v)} options={toOptions(subs)} disabled={!form.district} loading={loadingLevel === "subdistrict"} placeholder={form.district ? "Pilih kelurahan" : "Pilih kecamatan dulu"} searchPlaceholder="Cari kelurahan…" sheetTitle="Kelurahan / desa" invalid={!!errors.subdistrict} />
                )}
              </Field>
              <Field label="Alamat lengkap" required error={errors.shipping_address} hint="Nama jalan, nomor rumah, RT/RW, patokan." className="sm:col-span-2">
                {(id, d) => (
                  <Textarea id={id} aria-describedby={d} rows={3} autoComplete="street-address" value={form.shipping_address} invalid={!!errors.shipping_address} onChange={(e) => set("shipping_address", e.target.value)} />
                )}
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 md:p-7">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
              <span className="grid size-7 place-items-center rounded-full bg-ink text-xs text-lime">3</span> Kurir & pembayaran
            </h2>
            <div className="flex items-start gap-3 rounded-xl border border-line bg-stone p-4">
              <Truck className="mt-0.5 size-5 shrink-0" />
              <div className="flex-1 text-sm">
                {!form.subdistrict ? (
                  <p className="text-muted">Pilih kelurahan untuk menghitung ongkir.</p>
                ) : quoting ? (
                  <p className="text-muted">Menghitung ongkir…</p>
                ) : quoteError ? (
                  <p className="text-danger">{quoteError}</p>
                ) : quote ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {quote.courier_name} · {quote.service}
                      </p>
                      <p className="text-muted">
                        Estimasi {etdLabel(quote.etd)} · {(quote.weight_gram / 1000).toLocaleString("id-ID")} kg
                      </p>
                    </div>
                    <span className="font-display text-lg font-bold tabular">{formatRupiah(quote.cost)}</span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex items-start gap-3 rounded-xl border border-ink bg-white p-4">
              <QrCode className="mt-0.5 size-5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">QRIS</p>
                <p className="text-muted">
                  Setelah pesanan dibuat, scan QRIS toko dan bayar sesuai nominal unik. Unggah bukti di halaman pesanan.
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-line bg-stone p-5">
            <p className="caps mb-4 text-muted">Pesanan ({items.length})</p>
            <ul className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {items.map((it) => (
                <li key={it.id} className="flex gap-3">
                  <span className="relative h-16 w-13 shrink-0 overflow-hidden rounded-lg border border-line bg-stone-2">
                    {it.primary_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
          decoding="async" src={cdn(it.primary_image_url, 200)} alt="" className="size-full object-cover" />
                    )}
                    <span className="absolute -right-0 -top-0 grid h-5 min-w-5 place-items-center rounded-bl-lg bg-ink px-1 text-[11px] font-bold text-lime tabular">
                      {it.quantity}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="line-clamp-1 font-semibold">{it.product_name}</p>
                    <p className="text-xs text-muted">
                      Size {it.size}
                      {it.color ? ` · ${it.color}` : ""}
                    </p>
                    {it.quantity > it.stock && <p className="text-xs font-semibold text-danger">Stok sisa {it.stock}</p>}
                  </div>
                  <span className="text-sm font-semibold tabular">{formatRupiah(it.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="my-4 h-px bg-line" />
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="tabular">{formatRupiah(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Ongkir</dt>
                <dd className="tabular">{quote ? formatRupiah(quote.cost) : "—"}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>Kode unik QRIS</dt>
                <dd>di halaman bayar</dd>
              </div>
            </dl>
            <div className="my-4 h-px bg-line" />
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-display text-2xl font-bold tabular">{formatRupiah(total)}</span>
            </div>
            <div className="mt-5 hidden sm:block">
              <Button type="submit" variant="primary" size="lg" block loading={submitting} disabled={!quote || overStock}>
                <Lock className="size-4" /> Buat pesanan
              </Button>
            </div>
            {overStock && (
              <p className="mt-2 text-xs font-semibold text-danger">
                Ada item melebihi stok. <Link href="/cart" className="underline">Ubah di tas</Link>.
              </p>
            )}
            <p className="mt-3 flex items-start gap-2 text-xs text-muted">
              <MapPin className="mt-0.5 size-3.5 shrink-0" /> Harga, stok, dan ongkir dihitung ulang oleh server saat pesanan dibuat.
            </p>
          </div>
        </aside>
      </div>

      {/* Bar bayar mobile: total selalu terlihat tanpa harus scroll ke ringkasan. */}
      <div className="glass fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 border-t border-line/70 px-4 py-3 sm:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{quote ? "Total" : "Subtotal"}</p>
            <p className="truncate font-display text-lg font-bold leading-tight tabular">{formatRupiah(quote ? total : subtotal)}</p>
          </div>
          {quote ? (
            <Button type="submit" variant="primary" size="lg" className="shrink-0" loading={submitting} disabled={overStock}>
              <Lock className="size-4" /> Buat pesanan
            </Button>
          ) : (
            <Button
              type="button"
              variant="dark"
              size="lg"
              className="shrink-0"
              onClick={() => document.getElementById("checkout-address")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <MapPin className="size-4" /> Isi alamat
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

function VerifyGate({ email }: { email: string }) {
  const { refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-lg rounded-3xl border border-line bg-white p-7 text-center md:p-10">
        <span className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-ink text-lime">
          <MailWarning className="size-6" />
        </span>
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">Verifikasi email dulu</h1>
        <p className="mt-3 text-sm text-muted">
          Pesanan hanya bisa dibuat setelah email <b className="text-ink">{email}</b> terverifikasi. Buka tautan yang kami kirim, lalu kembali ke halaman ini.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            variant="dark"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await authService.resendVerification();
                toast.success("Tautan verifikasi dikirim ulang.");
              } catch (e) {
                toast.error(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Kirim ulang tautan
          </Button>
          <Button variant="soft" onClick={() => refreshUser().then(() => toast("Status diperbarui"))}>
            Saya sudah verifikasi
          </Button>
        </div>
      </div>
    </div>
  );
}

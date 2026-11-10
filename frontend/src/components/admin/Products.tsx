"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronRight,
  ImageOff,
  Minus,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { cdn } from "@/lib/img";
import { adminService, type ProductInput } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import { finalPrice, formatRupiah } from "@/lib/format";
import {
  Badge,
  EmptyState,
  ErrorState,
  Segmented,
  Skeleton,
} from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import type {
  ApiCategory,
  ApiProduct,
  ApiProductDetail,
  ApiVariant,
} from "@/types/api";
import {
  DesktopOnly,
  ImageField,
  MobileList,
  MobileSearch,
  ListPager,
  useMobileLimit,
  PageHeader,
  Panel,
  run,
  Table,
  td,
} from "./kit";

const LIMIT = 20;
const LOW = 5;

export function StockBadge({
  stock,
  variants,
}: {
  stock?: number;
  variants?: number;
}) {
  if (variants === 0) return <Badge tone="neutral">Tanpa varian</Badge>;
  if (stock === undefined) return null;
  if (stock <= 0) return <Badge tone="danger">Habis</Badge>;
  if (stock <= LOW) return <Badge tone="warn">Sisa {stock}</Badge>;
  return <Badge tone="success">{stock} pcs</Badge>;
}

export default function AdminProducts() {
  const sp = useSearchParams();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string | "new" | null>(sp.get("edit"));
  const { limit } = useMobileLimit(LIMIT, () => setPage(1));
  const cats = useAsync(() => adminService.categories(), []);
  const list = useAsync(
    () =>
      adminService.products({
        q: search || undefined,
        status: status || undefined,
        category_id: category || undefined,
        sort: "newest",
        page,
        limit,
      }),
    [search, status, category, page, limit],
  );

  useEffect(() => {
    const t = setTimeout(() => (setSearch(q.trim()), setPage(1)), 350);
    return () => clearTimeout(t);
  }, [q]);

  const categories = cats.data?.data ?? [];
  const catName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader
        title="Produk & stok"
        description="Stok dihitung per varian (ukuran/warna). Stok berkurang saat checkout dan kembali bila pesanan batal."
        actions={
          <Button variant="dark" onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Produk baru
          </Button>
        }
      />
      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <Segmented
            value={status}
            onChange={(v) => (setStatus(v), setPage(1))}
            options={[
              { value: "", label: "Semua" },
              { value: "active", label: "Aktif" },
              { value: "inactive", label: "Nonaktif" },
            ]}
          />
          <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
            <div className="sm:w-56">
              <Select
                value={category}
                onChange={(v) => (setCategory(v), setPage(1))}
                options={[
                  { value: "", label: "Semua kategori" },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                size="sm"
                aria-label="Filter kategori"
              />
            </div>
            <MobileSearch value={search} onSearch={(v) => (setSearch(v), setPage(1))} placeholder="Cari nama produk" />
            <div className="hidden md:block md:w-64">
              <Input
                leading={<Search className="size-4" />}
                className="h-10"
                placeholder="Cari nama produk"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Cari produk"
              />
            </div>
          </div>
        </div>
        {list.error ? (
          <div className="p-4">
            <ErrorState message={list.error} onRetry={list.reload} />
          </div>
        ) : list.loading && !list.data ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : !list.data?.data.length ? (
          <EmptyState
            title="Belum ada produk"
            action={
              <Button onClick={() => setEditing("new")}>Tambah produk</Button>
            }
          />
        ) : (
          <>
          <MobileList>
            {list.data.data.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setEditing(p.id)}
                  className="flex w-full items-center gap-3 p-4 text-left transition active:bg-stone"
                >
                  <span className="grid h-16 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-stone-2">
                    {p.primary_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cdn(p.primary_image_url, 160)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImageOff className="size-4 text-faint" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {p.name}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {catName(p.category_id)} · {p.variant_count ?? 0} varian
                      {p.availability_type === "preorder" ? " · PO" : ""}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold tabular">
                        {formatRupiah(finalPrice(p.price, p.discount_percent))}
                      </span>
                      <StockBadge
                        stock={p.total_stock}
                        variants={p.variant_count}
                      />
                      {p.status !== "active" && (
                        <Badge tone="neutral">Nonaktif</Badge>
                      )}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-faint" />
                </button>
              </li>
            ))}
          </MobileList>
          <DesktopOnly>
          <Table head={["Produk", "Kategori", "Harga", "Stok", "Status"]}>
            {list.data.data.map((p) => (
              <tr
                key={p.id}
                className="cursor-pointer hover:bg-stone/60"
                onClick={() => setEditing(p.id)}
              >
                <td className={td}>
                  <div className="flex items-center gap-3">
                    <span className="grid h-14 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-stone-2">
                      {p.primary_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cdn(p.primary_image_url, 160)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="size-full object-cover"
                        />
                      ) : (
                        <ImageOff className="size-4 text-faint" />
                      )}
                    </span>
                    <span>
                      <span className="block font-semibold">{p.name}</span>
                      <span className="text-xs text-muted">
                        {p.availability_type === "preorder"
                          ? `Pre-order ${p.po_estimate_days ?? "-"} hari`
                          : "Ready"}{" "}
                        · {p.variant_count ?? 0} varian
                      </span>
                    </span>
                  </div>
                </td>
                <td className={td + " text-muted"}>{catName(p.category_id)}</td>
                <td className={td + " tabular"}>
                  <span className="font-semibold">
                    {formatRupiah(finalPrice(p.price, p.discount_percent))}
                  </span>
                  {p.discount_percent > 0 && (
                    <span className="block text-xs text-muted line-through">
                      {formatRupiah(p.price)}
                    </span>
                  )}
                </td>
                <td className={td}>
                  <StockBadge
                    stock={p.total_stock}
                    variants={p.variant_count}
                  />
                </td>
                <td className={td}>
                  <Badge
                    tone={p.status === "active" ? "success" : "neutral"}
                    dot
                  >
                    {p.status === "active" ? "Aktif" : "Nonaktif"}
                  </Badge>
                </td>
              </tr>
            ))}
          </Table>
          </DesktopOnly>
          </>
        )}
        {list.data && (
          <ListPager page={page} limit={limit} total={list.data.meta.total} onPage={setPage} />
        )}
      </Panel>
      {editing && (
        <ProductEditor
          id={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onChanged={list.reload}
          onCreated={(id) => setEditing(id)}
        />
      )}
    </div>
  );
}

type Tab = "info" | "stock" | "photos";

function ProductEditor({
  id,
  categories,
  onClose,
  onChanged,
  onCreated,
}: {
  id: string | null;
  categories: ApiCategory[];
  onClose: () => void;
  onChanged: () => void;
  onCreated: (id: string) => void;
}) {
  const detail = useAsync(
    () => (id ? adminService.product(id) : Promise.resolve(null)),
    [id],
  );
  const [tab, setTab] = useState<Tab>(id ? "stock" : "info");
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const p = detail.data;
  const total = (p?.variants ?? []).reduce((n, v) => n + v.stock, 0);

  const refresh = () => {
    detail.reload();
    onChanged();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title={id ? (p?.name ?? "Produk") : "Produk baru"}
      description={
        id && p
          ? `Total stok ${total} pcs di ${p.variants.length} varian`
          : "Isi info dasar dulu, lalu tambahkan varian ukuran & foto."
      }
    >
      {id && !p ? (
        detail.error ? (
          <ErrorState message={detail.error} onRetry={detail.reload} />
        ) : (
          <Skeleton className="h-80" />
        )
      ) : (
        <>
          {id && (
            <div className="mb-5 flex items-center justify-between gap-3">
              <Segmented
                value={tab}
                onChange={setTab}
                options={[
                  {
                    value: "stock",
                    label: "Varian & stok",
                    count: p?.variants.length,
                  },
                  { value: "info", label: "Info produk" },
                  { value: "photos", label: "Foto", count: p?.images.length },
                ]}
              />
              <Button
                size="sm"
                variant="ghost"
                className="text-danger"
                onClick={() => setConfirmDel(true)}
              >
                <Trash2 className="size-4" /> Hapus
              </Button>
            </div>
          )}
          {tab === "info" && (
            <InfoForm
              product={p ?? null}
              categories={categories}
              onSaved={(saved) => {
                onChanged();
                if (!id) {
                  onCreated(saved.id);
                  setTab("stock");
                } else detail.reload();
              }}
            />
          )}
          {tab === "stock" && p && <Variants product={p} onChanged={refresh} />}
          {tab === "photos" && p && <Photos product={p} onChanged={refresh} />}
        </>
      )}
      <ConfirmDialog
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        danger
        loading={deleting}
        title="Hapus produk?"
        description="Produk yang sudah pernah dipesan tidak bisa dihapus — nonaktifkan saja supaya riwayat pesanan tetap utuh."
        confirmLabel="Hapus permanen"
        onConfirm={async () => {
          if (!id) return;
          setDeleting(true);
          const ok = await run(
            () => adminService.deleteProduct(id),
            "Produk dihapus.",
          );
          setDeleting(false);
          if (ok) {
            onChanged();
            onClose();
          }
        }}
      />
    </Dialog>
  );
}

function InfoForm({
  product,
  categories,
  onSaved,
}: {
  product: ApiProductDetail | null;
  categories: ApiCategory[];
  onSaved: (p: ApiProduct) => void;
}) {
  const [f, setF] = useState<ProductInput>({
    category_id: product?.category_id ?? null,
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product ? String(Math.round(Number(product.price))) : "",
    discount_percent: product?.discount_percent ?? 0,
    weight_gram: product?.weight_gram ?? 400,
    availability_type:
      (product?.availability_type as "ready" | "preorder") ?? "ready",
    po_estimate_days: product?.po_estimate_days ?? null,
    status: (product?.status as "active" | "inactive") ?? "active",
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) =>
    setF((x) => ({ ...x, [k]: v }));
  const valid =
    f.name.trim() &&
    Number(f.price) > 0 &&
    f.weight_gram > 0 &&
    (f.availability_type === "ready" || (f.po_estimate_days ?? 0) > 0);

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const input = {
          ...f,
          name: f.name.trim(),
          description: f.description?.trim() || null,
          po_estimate_days:
            f.availability_type === "preorder" ? f.po_estimate_days : null,
        };
        const saved = await run(
          () =>
            product
              ? adminService.updateProduct(product.id, input)
              : adminService.createProduct(input),
          "Produk disimpan.",
        );
        setBusy(false);
        if (saved && saved !== true) onSaved(saved);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama produk" required className="sm:col-span-2">
          {(id) => (
            <Input
              id={id}
              value={f.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="mis. Void Heavyweight Oversized Tee"
            />
          )}
        </Field>
        <Field label="Kategori">
          {(id) => (
            <Select
              id={id}
              value={f.category_id ?? ""}
              onChange={(v) => set("category_id", v || null)}
              options={[
                { value: "", label: "Tanpa kategori" },
                ...categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                  description: c.is_active ? undefined : "Nonaktif",
                })),
              ]}
            />
          )}
        </Field>
        <Field label="Status">
          {(id) => (
            <Select
              id={id}
              value={f.status}
              onChange={(v) => set("status", v)}
              options={[
                {
                  value: "active",
                  label: "Aktif",
                  description: "Tampil & bisa dibeli",
                },
                {
                  value: "inactive",
                  label: "Nonaktif",
                  description: "Disembunyikan dari toko",
                },
              ]}
            />
          )}
        </Field>
        <Field label="Harga (Rp)" required>
          {(id) => (
            <Input
              id={id}
              inputMode="numeric"
              value={f.price}
              onChange={(e) => set("price", e.target.value.replace(/\D/g, ""))}
              placeholder="289000"
            />
          )}
        </Field>
        <Field
          label="Diskon (%)"
          hint={
            Number(f.price) > 0 && f.discount_percent > 0
              ? "Harga jual " +
                formatRupiah(finalPrice(f.price, f.discount_percent))
              : "0 = tanpa diskon"
          }
        >
          {(id, d) => (
            <Input
              id={id}
              aria-describedby={d}
              inputMode="decimal"
              value={String(f.discount_percent)}
              onChange={(e) =>
                set(
                  "discount_percent",
                  Math.min(
                    100,
                    Math.max(
                      0,
                      Number(e.target.value.replace(/[^\d.]/g, "")) || 0,
                    ),
                  ),
                )
              }
            />
          )}
        </Field>
        <Field
          label="Berat kirim (gram)"
          required
          hint="Termasuk kemasan; dipakai menghitung ongkir."
        >
          {(id, d) => (
            <Input
              id={id}
              aria-describedby={d}
              inputMode="numeric"
              value={String(f.weight_gram)}
              onChange={(e) =>
                set(
                  "weight_gram",
                  Number(e.target.value.replace(/\D/g, "")) || 0,
                )
              }
            />
          )}
        </Field>
        <Field label="Ketersediaan">
          {(id) => (
            <Select
              id={id}
              value={f.availability_type}
              onChange={(v) => set("availability_type", v)}
              options={[
                { value: "ready", label: "Ready stock" },
                {
                  value: "preorder",
                  label: "Pre-order",
                  description: "Diproduksi setelah dibayar",
                },
              ]}
            />
          )}
        </Field>
        {f.availability_type === "preorder" && (
          <Field label="Estimasi produksi (hari)" required>
            {(id) => (
              <Input
                id={id}
                inputMode="numeric"
                value={f.po_estimate_days ?? ""}
                onChange={(e) =>
                  set(
                    "po_estimate_days",
                    Number(e.target.value.replace(/\D/g, "")) || null,
                  )
                }
              />
            )}
          </Field>
        )}
        <Field
          label="Deskripsi"
          hint="Bahan, fit, panduan ukuran (lebar × panjang per size), cara rawat."
          className="sm:col-span-2"
        >
          {(id, d) => (
            <Textarea
              id={id}
              aria-describedby={d}
              rows={7}
              value={f.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          )}
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="dark" loading={busy} disabled={!valid}>
          {product ? "Simpan perubahan" : "Buat produk & lanjut ke varian"}
        </Button>
      </div>
    </form>
  );
}

function Variants({
  product,
  onChanged,
}: {
  product: ApiProductDetail;
  onChanged: () => void;
}) {
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("0");
  const [busy, setBusy] = useState(false);
  const total = product.variants.reduce((n, v) => n + v.stock, 0);
  const autoSku = () =>
    [
      product.name
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 4),
      color.slice(0, 3),
      size,
    ]
      .filter(Boolean)
      .join("-")
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl bg-ink p-3 sm:p-4 text-canvas">
          <p className="caps text-canvas/60">Total stok</p>
          <p className="mt-1 font-display text-2xl sm:text-3xl font-extrabold tabular">
            {total}
          </p>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="caps text-muted">Varian</p>
          <p className="mt-1 font-display text-2xl sm:text-3xl font-extrabold tabular">
            {product.variants.length}
          </p>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="caps text-muted">Habis</p>
          <p className="mt-1 font-display text-2xl sm:text-3xl font-extrabold tabular">
            {product.variants.filter((v) => v.stock <= 0).length}
          </p>
        </div>
      </div>

      {product.variants.length === 0 ? (
        <p className="rounded-xl bg-warn-soft p-4 text-sm text-warn">
          Produk belum punya varian, jadi belum bisa dibeli. Tambahkan minimal
          satu ukuran.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line">
          <ul className="divide-y divide-line md:hidden">
            {product.variants.map((v) => (
              <VariantCard
                key={v.id}
                productId={product.id}
                v={v}
                onChanged={onChanged}
              />
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-140 text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                {["Ukuran", "Warna", "SKU", "Stok", ""].map((h) => (
                  <th key={h} className="caps px-4 py-3 text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {product.variants.map((v) => (
                <VariantRow
                  key={v.id}
                  productId={product.id}
                  v={v}
                  onChanged={onChanged}
                />
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <form
        className="rounded-2xl border border-dashed border-line-strong bg-stone p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const ok = await run(
            () =>
              adminService.createVariant(product.id, {
                size: size.trim(),
                color: color.trim() || null,
                sku: (sku.trim() || autoSku()).toUpperCase(),
                stock: Number(stock) || 0,
              }),
            "Varian ditambahkan.",
          );
          setBusy(false);
          if (ok) {
            setSize("");
            setSku("");
            setStock("0");
            onChanged();
          }
        }}
      >
        <p className="mb-3 text-sm font-bold">Tambah varian</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr_0.8fr_auto] sm:items-end">
          <Field label="Ukuran" required>
            {(id) => (
              <Input
                id={id}
                className="h-10"
                value={size}
                onChange={(e) => setSize(e.target.value.toUpperCase())}
                placeholder="M"
              />
            )}
          </Field>
          <Field label="Warna">
            {(id) => (
              <Input
                id={id}
                className="h-10"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Washed Black"
              />
            )}
          </Field>
          <Field label="SKU">
            {(id) => (
              <Input
                id={id}
                className="h-10"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder={size ? autoSku() : "otomatis"}
              />
            )}
          </Field>
          <Field label="Stok awal">
            {(id) => (
              <Input
                id={id}
                className="h-10"
                inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))}
              />
            )}
          </Field>
          <Button
            type="submit"
            variant="dark"
            className="h-10"
            loading={busy}
            disabled={!size.trim()}
          >
            <Plus className="size-4" /> Tambah
          </Button>
        </div>
      </form>
    </div>
  );
}

function useVariantStock(
  productId: string,
  v: ApiVariant,
  onChanged: () => void,
) {
  const [stock, setStock] = useState(String(v.stock));
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [prevStock, setPrevStock] = useState(v.stock);
  if (prevStock !== v.stock) {
    setPrevStock(v.stock);
    setStock(String(v.stock));
  }
  const n = Number(stock) || 0;
  const dirty = n !== v.stock;
  const save = async () => {
    setBusy(true);
    const ok = await run(
      () => adminService.updateVariant(productId, v.id, { stock: n }),
      `Stok ${v.size} jadi ${n}.`,
    );
    setBusy(false);
    if (ok) onChanged();
  };
  const remove = async () => {
    const ok = await run(
      () => adminService.deleteVariant(productId, v.id),
      "Varian dihapus.",
    );
    setConfirm(false);
    if (ok) onChanged();
  };
  return { stock, setStock, n, dirty, busy, save, confirm, setConfirm, remove };
}

type VariantState = ReturnType<typeof useVariantStock>;

function StockStepper({ s, v }: { s: VariantState; v: ApiVariant }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Kurangi stok"
        onClick={() => s.setStock(String(Math.max(0, s.n - 1)))}
        className="grid size-9 place-items-center rounded-xl border border-line bg-white transition hover:border-ink active:scale-95 md:size-8 md:rounded-lg"
      >
        <Minus className="size-3.5" />
      </button>
      <input
        value={s.stock}
        inputMode="numeric"
        aria-label={"Stok " + v.size}
        onChange={(e) => s.setStock(e.target.value.replace(/\D/g, ""))}
        onKeyDown={(e) =>
          e.key === "Enter" && s.dirty && (e.preventDefault(), s.save())
        }
        className={cn(
          "h-9 w-16 rounded-xl border bg-white text-center font-semibold tabular outline-none focus:border-ink md:h-8 md:rounded-lg",
          s.n <= 0
            ? "border-danger/40 text-danger"
            : s.n <= LOW
              ? "border-warn/40"
              : "border-line",
        )}
      />
      <button
        type="button"
        aria-label="Tambah stok"
        onClick={() => s.setStock(String(s.n + 1))}
        className="grid size-9 place-items-center rounded-xl border border-line bg-white transition hover:border-ink active:scale-95 md:size-8 md:rounded-lg"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function DeleteVariant({ s, v }: { s: VariantState; v: ApiVariant }) {
  return (
    <>
      <button
        type="button"
        aria-label={"Hapus varian " + v.size}
        onClick={() => s.setConfirm(true)}
        className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-danger-soft hover:text-danger md:size-8 md:rounded-lg"
      >
        <Trash2 className="size-4" />
      </button>
      <ConfirmDialog
        open={s.confirm}
        onClose={() => s.setConfirm(false)}
        danger
        title={"Hapus varian " + v.size + "?"}
        description="Varian yang sudah pernah dipesan tidak bisa dihapus. Set stok ke 0 untuk menutup penjualannya."
        confirmLabel="Hapus"
        onConfirm={s.remove}
      />
    </>
  );
}

type VariantProps = {
  productId: string;
  v: ApiVariant;
  onChanged: () => void;
};

function VariantRow({ productId, v, onChanged }: VariantProps) {
  const s = useVariantStock(productId, v, onChanged);
  return (
    <tr>
      <td className="px-4 py-3 font-bold">{v.size}</td>
      <td className="px-4 py-3 text-muted">{v.color ?? "—"}</td>
      <td className="px-4 py-3 font-mono text-xs">{v.sku}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <StockStepper s={s} v={v} />
          {s.dirty && (
            <Button
              size="sm"
              variant="primary"
              className="ml-1 h-8"
              loading={s.busy}
              onClick={s.save}
            >
              Simpan
            </Button>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <DeleteVariant s={s} v={v} />
      </td>
    </tr>
  );
}

function VariantCard({ productId, v, onChanged }: VariantProps) {
  const s = useVariantStock(productId, v, onChanged);
  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="grid h-8 min-w-8 place-items-center rounded-lg bg-ink px-2 text-sm font-bold text-canvas">
              {v.size}
            </span>
            <span className="truncate text-sm font-medium">
              {v.color ?? "Tanpa warna"}
            </span>
          </p>
          <p className="mt-1.5 truncate font-mono text-[11px] text-muted">
            {v.sku}
          </p>
        </div>
        <DeleteVariant s={s} v={v} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="caps text-muted">Stok</span>
        <StockStepper s={s} v={v} />
      </div>
      {s.dirty && (
        <Button
          size="sm"
          variant="primary"
          className="mt-3 w-full animate-[fade-in_.2s_ease-out]"
          loading={s.busy}
          onClick={s.save}
        >
          Simpan stok {v.size} → {s.n}
        </Button>
      )}
    </li>
  );
}

function Photos({
  product,
  onChanged,
}: {
  product: ApiProductDetail;
  onChanged: () => void;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const images = [...product.images].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return (
    <div className="space-y-5">
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((im) => (
            <li
              key={im.id}
              className={cn(
                "relative overflow-hidden rounded-xl border-2",
                im.is_primary ? "border-ink" : "border-line",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
          decoding="async"
                src={cdn(im.image_url, 400)}
                alt=""
                className="aspect-4/5 w-full object-cover"
              />
              {im.is_primary && (
                <span className="caps absolute left-2 top-2 rounded-full bg-ink px-2 py-1 text-lime">
                  Utama
                </span>
              )}
              <div className="absolute inset-x-2 bottom-2 flex gap-1.5">
                {!im.is_primary && (
                  <button
                    type="button"
                    onClick={async () =>
                      (await run(
                        () =>
                          adminService.updateImage(product.id, im.id, {
                            is_primary: true,
                          }),
                        "Foto utama diganti.",
                      )) && onChanged()
                    }
                    className="caps flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/95 py-1.5 backdrop-blur"
                  >
                    <Star className="size-3" /> Utama
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Hapus foto"
                  onClick={async () =>
                    (await run(
                      () => adminService.deleteImage(product.id, im.id),
                      "Foto dihapus.",
                    )) && onChanged()
                  }
                  className="grid size-8 place-items-center rounded-lg bg-white/95 text-danger backdrop-blur"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="max-w-sm">
        <ImageField
          value={url}
          onChange={setUrl}
          recommended="1200 × 1500 px (4:5)"
          aspect="aspect-[4/5]"
          label="Tambah foto"
        />
        <Button
          className="mt-3"
          variant="dark"
          block
          loading={busy}
          disabled={!url}
          onClick={async () => {
            setBusy(true);
            const ok = await run(
              () =>
                adminService.createImage(product.id, {
                  image_url: url,
                  sort_order: images.length,
                  is_primary: images.length === 0,
                }),
              "Foto ditambahkan.",
            );
            setBusy(false);
            if (ok) {
              setUrl("");
              onChanged();
            }
          }}
        >
          Simpan foto
        </Button>
      </div>
    </div>
  );
}

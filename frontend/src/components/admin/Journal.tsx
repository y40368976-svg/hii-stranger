"use client";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Bold,
  Eye,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  Loader2,
  PenLine,
  Plus,
  Quote,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { adminService, productService } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import { errorMessage } from "@/lib/api";
import { finalPrice, formatDate, formatRupiah, timeAgo } from "@/lib/format";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import {
  Badge,
  EmptyState,
  ErrorState,
  Pagination,
  Segmented,
  Skeleton,
  type Tone,
} from "@/components/ui/misc";
import { Button, LinkButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Prose } from "@/components/journal/Prose";
import { cn } from "@/lib/cn";
import type {
  ApiPostDetail,
  ApiPostProduct,
  PostInput,
  PostStatus,
} from "@/types/api";
import { ImageField, PageHeader, Panel, run } from "./kit";
import { cdn } from "@/lib/img";

const STATUS: Record<PostStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draf", tone: "neutral" },
  published: { label: "Terbit", tone: "success" },
  archived: { label: "Arsip", tone: "warn" },
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " dan ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

export default function AdminJournal() {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  if (editing)
    return (
      <PostEditor
        id={editing === "new" ? null : editing}
        onBack={() => setEditing(null)}
        onCreated={setEditing}
      />
    );
  return <PostList onOpen={setEditing} />;
}

function PostList({ onOpen }: { onOpen: (id: string | "new") => void }) {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const list = useAsync(
    () =>
      adminService.posts({
        status: status || undefined,
        q: search || undefined,
        page,
        limit: 20,
      }),
    [status, search, page],
  );

  useEffect(() => {
    const t = setTimeout(() => (setSearch(q.trim()), setPage(1)), 350);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <PageHeader
        title="News"
        description="Tulis artikel produk, panduan ukuran, dan cerita rilis. Tautkan produk supaya pembaca bisa langsung belanja."
        actions={
          <Button variant="dark" onClick={() => onOpen("new")}>
            <Plus className="size-4" /> Artikel baru
          </Button>
        }
      />
      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <Segmented
            className="flex-1"
            value={status}
            onChange={(v) => (setStatus(v), setPage(1))}
            options={[
              { value: "", label: "Semua" },
              { value: "draft", label: "Draf" },
              { value: "published", label: "Terbit" },
              { value: "archived", label: "Arsip" },
            ]}
          />
          <div className="md:w-72">
            <Input
              leading={<Search className="size-4" />}
              className="h-10"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari judul"
              aria-label="Cari artikel"
            />
          </div>
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
        ) : !list.data?.data.length ? (
          <EmptyState
            title="Belum ada artikel"
            action={
              <Button onClick={() => onOpen("new")}>
                Tulis artikel pertama
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {list.data.data.map((p) => {
              const scheduled =
                p.status === "published" &&
                p.published_at &&
                new Date(p.published_at) > new Date();
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(p.id)}
                    className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-stone/60"
                  >
                    <span className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-2">
                      {p.cover_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          decoding="async"
                          src={cdn(p.cover_image_url, 320)}
                          alt=""
                          className="size-full object-cover"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {p.title}
                      </span>
                      <span className="text-xs text-muted">
                        {p.author_name ?? "—"} · diubah {timeAgo(p.updated_at)}
                      </span>
                    </span>
                    {scheduled ? (
                      <Badge tone="info">
                        Terjadwal {formatDate(p.published_at)}
                      </Badge>
                    ) : (
                      <Badge tone={STATUS[p.status].tone}>
                        {STATUS[p.status].label}
                      </Badge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {list.data && list.data.meta.total > 20 && (
          <div className="border-t border-line p-4">
            <Pagination
              page={page}
              limit={20}
              total={list.data.meta.total}
              onPage={setPage}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}

type ToolKey = "h2" | "bold" | "italic" | "list" | "quote" | "link";
const TOOLS: { key: ToolKey; icon: React.ElementType; label: string }[] = [
  { key: "h2", icon: Heading2, label: "Subjudul" },
  { key: "bold", icon: Bold, label: "Tebal" },
  { key: "italic", icon: Italic, label: "Miring" },
  { key: "list", icon: List, label: "Daftar" },
  { key: "quote", icon: Quote, label: "Kutipan" },
  { key: "link", icon: Link2, label: "Tautan" },
];

const EMPTY: PostInput = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  tag: "",
  status: "draft",
  published_at: null,
  product_ids: [],
};

function PostEditor({
  id,
  onBack,
  onCreated,
}: {
  id: string | null;
  onBack: () => void;
  onCreated: (id: string) => void;
}) {
  const detail = useAsync(
    () => (id ? adminService.post(id) : Promise.resolve(null)),
    [id],
  );
  const [f, setF] = useState<PostInput>(EMPTY);
  const [products, setProducts] = useState<ApiPostProduct[]>([]);
  const [slugTouched, setSlugTouched] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [dirty, setDirty] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const imgInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const d = detail.data;
    if (!d) return;
    setF({
      title: d.title,
      slug: d.slug,
      excerpt: d.excerpt ?? "",
      content: d.content,
      cover_image_url: d.cover_image_url ?? "",
      tag: d.tag ?? "",
      status: d.status,
      published_at: d.published_at,
      product_ids: d.product_ids,
    });
    setProducts(d.products);
    setSlugTouched(true);
    setDirty(false);
  }, [detail.data]);

  const set = <K extends keyof PostInput>(k: K, v: PostInput[K]) => {
    setDirty(true);
    setF((x) => ({
      ...x,
      [k]: v,
      ...(k === "title" && !slugTouched ? { slug: slugify(String(v)) } : {}),
    }));
  };

  const wrap = (before: string, after = "", placeholder = "teks") => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const sel = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    set("content", next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  };
  const linePrefix = (prefix: string) => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: s, value } = el;
    const start = value.lastIndexOf("\n", s - 1) + 1;
    set("content", value.slice(0, start) + prefix + value.slice(start));
    requestAnimationFrame(() => el.focus());
  };

  const applyTool = (key: ToolKey) => {
    if (key === "h2") linePrefix("## ");
    else if (key === "bold") wrap("**", "**");
    else if (key === "italic") wrap("*", "*");
    else if (key === "list") linePrefix("- ");
    else if (key === "quote") linePrefix("> ");
    else wrap("[", "](/shop)", "teks tautan");
  };

  const save = async (status?: PostStatus) => {
    const input: PostInput = {
      ...f,
      status: status ?? f.status,
      title: f.title.trim(),
      slug: f.slug.trim() || slugify(f.title),
      excerpt: f.excerpt?.trim() || null,
      tag: f.tag?.trim() || null,
      cover_image_url: f.cover_image_url || null,
      product_ids: products.map((p) => p.id),
    };
    setBusy(status ?? "save");
    try {
      const saved: ApiPostDetail = id
        ? await adminService.updatePost(id, input)
        : await adminService.createPost(input);
      toast.success(
        input.status === "published" ? "Artikel terbit." : "Tersimpan.",
      );
      setDirty(false);
      if (!id) onCreated(saved.id);
      else detail.setData(saved);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  if (id && !detail.data)
    return detail.error ? (
      <ErrorState message={detail.error} onRetry={detail.reload} />
    ) : (
      <Skeleton className="h-[70vh]" />
    );

  const words = f.content.trim() ? f.content.trim().split(/\s+/).length : 0;
  const live =
    f.status === "published" &&
    (!f.published_at || new Date(f.published_at) <= new Date());

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (dirty && !confirm("Perubahan belum disimpan. Tetap keluar?"))
              return;
            onBack();
          }}
        >
          <ArrowLeft className="size-4" /> Semua artikel
        </Button>
        <Badge tone={STATUS[f.status].tone}>{STATUS[f.status].label}</Badge>
        {dirty && <span className="text-xs text-muted">Belum disimpan</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          {id && live && (
            <LinkButton
              href={"/journal/" + f.slug}
              variant="ghost"
              size="sm"
              target="_blank"
            >
              <Eye className="size-4" /> Lihat di situs
            </LinkButton>
          )}
          <Button
            variant="soft"
            size="sm"
            loading={busy === "save"}
            disabled={!f.title.trim()}
            onClick={() => save()}
          >
            Simpan
          </Button>
          {f.status !== "published" ? (
            <Button
              variant="primary"
              size="sm"
              loading={busy === "published"}
              disabled={!f.title.trim()}
              onClick={() => save("published")}
            >
              Terbitkan
            </Button>
          ) : (
            <Button
              variant="soft"
              size="sm"
              loading={busy === "draft"}
              onClick={() => save("draft")}
            >
              Tarik ke draf
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <input
            value={f.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Judul artikel"
            aria-label="Judul"
            className="w-full bg-transparent font-display text-3xl font-extrabold uppercase leading-tight tracking-tight outline-none placeholder:text-faint md:text-4xl"
          />
          <Textarea
            value={f.excerpt ?? ""}
            onChange={(e) => set("excerpt", e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Ringkasan 1–2 kalimat (muncul di kartu & pratinjau link)"
            className="min-h-0"
          />

          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-1 border-b border-line bg-stone px-2 py-1.5">
              {TOOLS.map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  title={label}
                  aria-label={label}
                  disabled={preview}
                  onClick={() => applyTool(key)}
                  className="grid size-9 place-items-center rounded-lg hover:bg-white disabled:opacity-40"
                >
                  <Icon className="size-4" />
                </button>
              ))}
              <input
                ref={imgInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setUploading(true);
                  try {
                    const { url } = await adminService.uploadImage(file);
                    wrap(`\n![`, `](${url})\n`, "keterangan gambar");
                  } catch (err) {
                    toast.error(errorMessage(err));
                  } finally {
                    setUploading(false);
                  }
                }}
              />
              <button
                type="button"
                title="Sisipkan gambar"
                aria-label="Sisipkan gambar"
                disabled={preview || uploading}
                onClick={() => imgInput.current?.click()}
                className="grid size-9 place-items-center rounded-lg hover:bg-white disabled:opacity-40"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImagePlus className="size-4" />
                )}
              </button>
              <div className="ml-auto flex rounded-lg bg-white p-0.5">
                {[
                  { v: false, label: "Tulis", icon: PenLine },
                  { v: true, label: "Pratinjau", icon: Eye },
                ].map(({ v, label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPreview(v)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold",
                      preview === v ? "bg-ink text-lime" : "text-muted",
                    )}
                  >
                    <Icon className="size-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>
            {preview ? (
              <div className="min-h-420px p-6">
                {f.content.trim() ? (
                  <Prose source={f.content} />
                ) : (
                  <p className="text-sm text-muted">Belum ada isi.</p>
                )}
              </div>
            ) : (
              <textarea
                ref={area}
                value={f.content}
                onChange={(e) => set("content", e.target.value)}
                placeholder={
                  "Mulai menulis…\n\n## Subjudul\nParagraf biasa. **Tebal**, *miring*, [tautan](/shop).\n\n- poin daftar\n> kutipan"
                }
                className="block min-h-420px w-full resize-y bg-white p-5 font-mono text-[14px] leading-relaxed outline-none"
                aria-label="Isi artikel"
              />
            )}
            <div className="flex justify-between border-t border-line px-4 py-2 text-xs text-muted">
              <span>Markdown sederhana didukung</span>
              <span className="tabular">
                {words} kata · ±{Math.max(1, Math.round(words / 200))} mnt baca
              </span>
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel className="space-y-4 p-4">
            <Field label="Status">
              {(fid) => (
                <Select
                  id={fid}
                  value={f.status}
                  onChange={(v) => set("status", v)}
                  options={[
                    {
                      value: "draft",
                      label: "Draf",
                      description: "Hanya terlihat di panel",
                    },
                    {
                      value: "published",
                      label: "Terbit",
                      description: "Tampil di News (sesuai tanggal)",
                    },
                    {
                      value: "archived",
                      label: "Arsip",
                      description: "Disembunyikan dari situs",
                    },
                  ]}
                />
              )}
            </Field>
            <Field
              label="Tanggal terbit"
              hint="Isi tanggal mendatang untuk menjadwalkan. Kosong = saat diterbitkan."
            >
              {(fid, d) => (
                <DateTimePicker
                  id={fid}
                  aria-describedby={d}
                  title="Tanggal terbit"
                  placeholder="Saat diterbitkan"
                  value={f.published_at}
                  onChange={(v) => set("published_at", v)}
                />
              )}
            </Field>
            <Field label="Slug URL" hint={"/journal/" + (f.slug || "…")}>
              {(fid, d) => (
                <Input
                  id={fid}
                  aria-describedby={d}
                  className="h-10 font-mono text-[13px]"
                  value={f.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", slugify(e.target.value));
                  }}
                />
              )}
            </Field>
            <Field label="Tag">
              {(fid) => (
                <Input
                  id={fid}
                  className="h-10"
                  value={f.tag ?? ""}
                  onChange={(e) => set("tag", e.target.value)}
                  placeholder="Panduan, Rilis, Perawatan…"
                  maxLength={40}
                />
              )}
            </Field>
          </Panel>
          <Panel className="p-4">
            <ImageField
              value={f.cover_image_url ?? ""}
              onChange={(v) => set("cover_image_url", v)}
              recommended="1600 × 900 px (16:9)"
              aspect="aspect-[16/9]"
              label="Cover"
            />
          </Panel>
          <ProductPicker
            value={products}
            onChange={(v) => {
              setDirty(true);
              setProducts(v);
            }}
          />
          {id && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-danger"
              onClick={() => setConfirmDel(true)}
            >
              <Trash2 className="size-4" /> Hapus artikel
            </Button>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        danger
        title="Hapus artikel?"
        description="Artikel dihapus permanen. Gunakan status Arsip bila hanya ingin menyembunyikannya."
        confirmLabel="Hapus"
        onConfirm={async () => {
          if (!id) return;
          const ok = await run(
            () => adminService.deletePost(id),
            "Artikel dihapus.",
          );
          setConfirmDel(false);
          if (ok) onBack();
        }}
      />
    </div>
  );
}

function ProductPicker({
  value,
  onChange,
}: {
  value: ApiPostProduct[];
  onChange: (v: ApiPostProduct[]) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ApiPostProduct[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      productService
        .list({ q: q.trim(), limit: 6 })
        .then((r) =>
          setResults(
            r.data.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              discount_percent: p.discount_percent,
              primary_image_url: p.primary_image_url ?? null,
              total_stock: p.total_stock ?? 0,
              status: p.status,
            })),
          ),
        )
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <Panel className="p-4">
      <p className="text-[13px] font-semibold">Produk terkait</p>
      <p className="mb-3 text-xs text-muted">
        Tampil di akhir artikel sebagai “Belanja tampilannya” (maks 12).
      </p>
      {value.length > 0 && (
        <ul className="mb-3 space-y-2">
          {value.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-xl bg-stone p-2 text-sm"
            >
              <span className="h-10 w-8 shrink-0 overflow-hidden rounded-md bg-stone-2">
                {p.primary_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    decoding="async"
                    src={cdn(p.primary_image_url, 160)}
                    alt=""
                    className="size-full object-cover"
                  />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {p.name}
              </span>
              <button
                type="button"
                aria-label={"Lepas " + p.name}
                onClick={() => onChange(value.filter((x) => x.id !== p.id))}
                className="grid size-7 place-items-center rounded-md hover:bg-white"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {value.length < 12 && (
        <div className="relative">
          <Input
            leading={<Search className="size-4" />}
            className="h-10"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari produk untuk ditautkan"
            aria-label="Cari produk"
          />
          {results.length > 0 && (
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
              {results
                .filter((r) => !value.some((v) => v.id === r.id))
                .map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange([...value, r]);
                        setQ("");
                      }}
                      className="flex w-full items-center gap-2 p-2 text-left text-sm hover:bg-stone"
                    >
                      <Plus className="size-3.5 text-muted" />
                      <span className="min-w-0 flex-1 truncate">{r.name}</span>
                      <span className="text-xs text-muted tabular">
                        {formatRupiah(finalPrice(r.price, r.discount_percent))}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  );
}

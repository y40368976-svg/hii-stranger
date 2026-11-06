"use client";
import React, { useMemo, useState } from "react";
import { CalendarClock, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { adminService } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import { formatDate } from "@/lib/format";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { Badge, EmptyState, ErrorState, Segmented, Skeleton, type Tone } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Field, Input, Switch } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import type { ApiBanner, BannerInput, BannerPlacement, BannerStatus } from "@/types/api";
import { ImageField, PageHeader, Panel, run } from "./kit";
import { cdn } from "@/lib/img";

/** Spesifikasi tiap penempatan: lokasi, ukuran gambar, dan rasio pratinjau. */
export const PLACEMENTS: Record<
  BannerPlacement,
  { label: string; where: string; desktop: string; mobile: string; aspect: string; mobileAspect: string }
> = {
  hero: {
    label: "Hero banner",
    where: "Carousel paling atas beranda. Bisa beberapa slide, diputar otomatis.",
    desktop: "1920 × 800 px (12:5)",
    mobile: "1080 × 1350 px (4:5)",
    aspect: "aspect-[12/5]",
    mobileAspect: "aspect-[4/5]",
  },
  main: {
    label: "Banner utama",
    where: "Blok kampanye besar di tengah beranda, setelah produk terbaru.",
    desktop: "1600 × 1000 px (16:10)",
    mobile: "1080 × 1080 px (1:1)",
    aspect: "aspect-[16/10]",
    mobileAspect: "aspect-square",
  },
  catalog: {
    label: "Banner katalog",
    where: "Strip lebar di atas halaman katalog/belanja. Satu banner tayang (urutan terkecil).",
    desktop: "1920 × 480 px (4:1)",
    mobile: "1200 × 525 px (16:7)",
    aspect: "aspect-[4/1]",
    mobileAspect: "aspect-[16/7]",
  },
};

const STATUS: Record<BannerStatus, { label: string; tone: Tone }> = {
  live: { label: "Tayang", tone: "success" },
  scheduled: { label: "Terjadwal", tone: "info" },
  ended: { label: "Berakhir", tone: "neutral" },
  inactive: { label: "Nonaktif", tone: "neutral" },
};

/** Preset event: tanggal tahun ini (atau tahun depan bila sudah lewat). */
function eventPresets() {
  const now = new Date();
  const mk = (m: number, d: number, h = 0, min = 0, y = now.getFullYear()) => new Date(y, m - 1, d, h, min);
  const list = [
    { label: "Halloween", start: [10, 24], end: [11, 1] },
    { label: "Harbolnas 11.11", start: [11, 10], end: [11, 12] },
    { label: "Harbolnas 12.12", start: [12, 11], end: [12, 13] },
    { label: "Natal", start: [12, 18], end: [12, 27] },
    { label: "Tahun Baru", start: [12, 28], end: [1, 3] },
  ];
  return list.map((e) => {
    let y = now.getFullYear();
    let end = mk(e.end[0], e.end[1], 0, 0, e.end[0] < e.start[0] ? y + 1 : y);
    if (end < now) {
      y += 1;
      end = mk(e.end[0], e.end[1], 0, 0, e.end[0] < e.start[0] ? y + 1 : y);
    }
    return { label: e.label, start: mk(e.start[0], e.start[1], 0, 0, y).toISOString(), end: end.toISOString() };
  });
}

export default function AdminBanners() {
  const list = useAsync(() => adminService.banners(), []);
  const [placement, setPlacement] = useState<BannerPlacement>("hero");
  const [edit, setEdit] = useState<ApiBanner | "new" | null>(null);
  const [del, setDel] = useState<ApiBanner | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const all = list.data ?? [];
  const items = all.filter((b) => b.placement === placement).sort((a, b) => a.sort_order - b.sort_order);
  const spec = PLACEMENTS[placement];
  const counts = (p: BannerPlacement) => all.filter((b) => b.placement === p && b.status === "live").length;

  const toggle = async (b: ApiBanner) => {
    setBusy(b.id);
    const ok = await run(() => adminService.updateBanner(b.id, { is_active: !b.is_active }), b.is_active ? "Banner dinonaktifkan." : "Banner diaktifkan.");
    setBusy(null);
    if (ok) list.reload();
  };

  return (
    <div>
      <PageHeader
        title="Banner & event"
        description="Jadwalkan banner untuk event (Halloween, Natal, drop baru). Banner tampil otomatis di rentang waktu tayang dan turun sendiri saat berakhir."
        actions={
          <Button variant="dark" onClick={() => setEdit("new")}>
            <Plus className="size-4" /> Banner baru
          </Button>
        }
      />

      <Segmented
        value={placement}
        onChange={setPlacement}
        options={(Object.keys(PLACEMENTS) as BannerPlacement[]).map((p) => ({ value: p, label: PLACEMENTS[p].label, count: counts(p) }))}
      />

      <div className="mt-4 grid gap-3 rounded-2xl border border-line bg-stone p-4 text-sm sm:grid-cols-3">
        <p className="sm:col-span-3 text-ink-3">{spec.where}</p>
        <p>
          <span className="caps block text-muted">Desktop</span>
          <b>{spec.desktop}</b>
        </p>
        <p>
          <span className="caps block text-muted">Mobile (opsional)</span>
          <b>{spec.mobile}</b>
        </p>
        <p>
          <span className="caps block text-muted">Format</span>
          <b>JPG/WebP ≤ 5 MB</b>, objek penting di tengah
        </p>
      </div>

      <div className="mt-5">
        {list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : list.loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : items.length === 0 ? (
          <Panel>
            <EmptyState
              title={"Belum ada " + spec.label.toLowerCase()}
              description="Tambahkan banner untuk kampanye atau event berikutnya."
              action={<Button onClick={() => setEdit("new")}>Buat banner</Button>}
            />
          </Panel>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {items.map((b) => (
              <li key={b.id} className="overflow-hidden rounded-2xl border border-line bg-white">
                <div className={cn("relative bg-stone-2", spec.aspect)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
          decoding="async" src={cdn(b.image_url, 480)} alt="" className={cn("size-full object-cover", b.status !== "live" && "opacity-60")} />
                  <div className="absolute left-3 top-3 flex gap-1.5">
                    <Badge tone={STATUS[b.status].tone} dot>
                      {STATUS[b.status].label}
                    </Badge>
                    <span className="caps rounded-full bg-white/90 px-2.5 py-1">#{b.sort_order}</span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-semibold">{b.title ?? <span className="text-muted">Tanpa judul</span>}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <CalendarClock className="size-3.5" />
                    {b.starts_at || b.ends_at
                      ? `${b.starts_at ? formatDate(b.starts_at, true) : "Sekarang"} → ${b.ends_at ? formatDate(b.ends_at, true) : "tanpa batas"}`
                      : "Selalu tayang"}
                  </p>
                  {b.link_url && <p className="mt-1 truncate text-xs text-muted">↗ {b.link_url}</p>}
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="soft" onClick={() => setEdit(b)}>
                      <Pencil className="size-3.5" /> Ubah
                    </Button>
                    <Button size="sm" variant="ghost" loading={busy === b.id} onClick={() => toggle(b)}>
                      {b.is_active ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      {b.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                    <Button size="sm" variant="ghost" className="ml-auto text-danger" aria-label="Hapus banner" onClick={() => setDel(b)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {edit && (
        <BannerEditor
          banner={edit === "new" ? null : edit}
          defaultPlacement={placement}
          nextOrder={items.length ? Math.max(...items.map((b) => b.sort_order)) + 1 : 0}
          onClose={() => setEdit(null)}
          onSaved={(b) => {
            setEdit(null);
            setPlacement(b.placement);
            list.reload();
          }}
        />
      )}
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        danger
        title="Hapus banner?"
        description="Banner langsung turun dari toko. Untuk event tahunan, lebih baik nonaktifkan lalu jadwalkan ulang tahun depan."
        confirmLabel="Hapus"
        onConfirm={async () => {
          if (!del) return;
          const ok = await run(() => adminService.deleteBanner(del.id), "Banner dihapus.");
          setDel(null);
          if (ok) list.reload();
        }}
      />
    </div>
  );
}

function BannerEditor({
  banner,
  defaultPlacement,
  nextOrder,
  onClose,
  onSaved,
}: {
  banner: ApiBanner | null;
  defaultPlacement: BannerPlacement;
  nextOrder: number;
  onClose: () => void;
  onSaved: (b: ApiBanner) => void;
}) {
  const [f, setF] = useState<BannerInput>({
    placement: banner?.placement ?? defaultPlacement,
    title: banner?.title ?? "",
    subtitle: banner?.subtitle ?? "",
    cta_label: banner?.cta_label ?? "",
    image_url: banner?.image_url ?? "",
    mobile_image_url: banner?.mobile_image_url ?? "",
    link_url: banner?.link_url ?? "",
    sort_order: banner?.sort_order ?? nextOrder,
    is_active: banner?.is_active ?? true,
    starts_at: banner?.starts_at ?? null,
    ends_at: banner?.ends_at ?? null,
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof BannerInput>(k: K, v: BannerInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const spec = PLACEMENTS[f.placement];
  const presets = useMemo(() => eventPresets(), []);
  const scheduleErr = f.starts_at && f.ends_at && new Date(f.ends_at) <= new Date(f.starts_at) ? "Waktu turun harus setelah waktu mulai." : null;
  const linkErr = f.link_url && !/^(https?:\/\/|\/(?!\/))/.test(f.link_url) ? "Pakai path toko (mis. /shop?category=...) atau URL https://" : null;

  const save = async () => {
    setBusy(true);
    const input: BannerInput = {
      ...f,
      title: f.title?.trim() || null,
      subtitle: f.subtitle?.trim() || null,
      cta_label: f.cta_label?.trim() || null,
      link_url: f.link_url?.trim() || null,
      mobile_image_url: f.mobile_image_url || null,
    };
    const res = await run(() => (banner ? adminService.updateBanner(banner.id, input) : adminService.createBanner(input)), "Banner disimpan.");
    setBusy(false);
    if (res && res !== true) onSaved(res);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title={banner ? "Ubah banner" : "Banner baru"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button variant="dark" loading={busy} disabled={!f.image_url || !!scheduleErr || !!linkErr} onClick={save}>
            Simpan banner
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-5">
          <Field label="Penempatan" required>
            {(id) => (
              <Select
                id={id}
                value={f.placement}
                onChange={(v) => set("placement", v)}
                options={(Object.keys(PLACEMENTS) as BannerPlacement[]).map((p) => ({ value: p, label: PLACEMENTS[p].label, description: PLACEMENTS[p].desktop }))}
              />
            )}
          </Field>
          <ImageField value={f.image_url} onChange={(v) => set("image_url", v)} recommended={spec.desktop} aspect={spec.aspect} label="Gambar desktop *" />
          <div className="max-w-[180px] sm:max-w-[240px]">
            <ImageField value={f.mobile_image_url ?? ""} onChange={(v) => set("mobile_image_url", v)} recommended={spec.mobile} aspect={spec.mobileAspect} label="Gambar mobile (opsional)" />
          </div>
        </div>

        <div className="space-y-5">
          <Field label="Judul" hint="Tampil besar di atas gambar. Kosongkan bila teks sudah ada di gambar.">
            {(id, d) => <Input id={id} aria-describedby={d} value={f.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="Drop 05: Void Runner" maxLength={120} />}
          </Field>
          <Field label="Label kecil" hint="Mis. “Halloween Drop” atau “Edisi terbatas”.">
            {(id, d) => <Input id={id} aria-describedby={d} value={f.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} maxLength={240} />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Teks tombol">
              {(id) => <Input id={id} value={f.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} placeholder="Belanja sekarang" maxLength={40} />}
            </Field>
            <Field label="Urutan">
              {(id) => <Input id={id} inputMode="numeric" value={String(f.sort_order)} onChange={(e) => set("sort_order", Math.min(999, Number(e.target.value.replace(/\D/g, "")) || 0))} />}
            </Field>
          </div>
          <Field label="Tautan" error={linkErr} hint="Path toko (/shop?category=…) atau URL lengkap.">
            {(id, d) => <Input id={id} aria-describedby={d} value={f.link_url ?? ""} onChange={(e) => set("link_url", e.target.value.trim())} placeholder="/shop?sort=newest" invalid={!!linkErr} />}
          </Field>

          <div className="rounded-2xl border border-line p-4">
            <p className="mb-1 flex items-center gap-2 text-sm font-bold">
              <CalendarClock className="size-4" /> Jadwal tayang
            </p>
            <p className="mb-3 text-xs text-muted">Kosongkan untuk tayang segera / tanpa batas. Pilih event untuk mengisi otomatis.</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setF((x) => ({ ...x, starts_at: p.start, ends_at: p.end, subtitle: x.subtitle || p.label }))}
                  className="h-8 rounded-full border border-line bg-stone px-3 text-xs font-semibold hover:border-ink"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid gap-3">
              <Field label="Mulai tayang">
                {(id) => <DateTimePicker id={id} title="Mulai tayang" placeholder="Langsung tayang" value={f.starts_at} onChange={(v) => set("starts_at", v)} />}
              </Field>
              <Field label="Turun tayang" error={scheduleErr}>
                {(id, d) => (
                  <DateTimePicker id={id} aria-describedby={d} title="Turun tayang" placeholder="Tanpa batas" defaultHour={23} min={f.starts_at} value={f.ends_at} invalid={!!scheduleErr} onChange={(v) => set("ends_at", v)} />
                )}
              </Field>
            </div>
            {(f.starts_at || f.ends_at) && (
              <button type="button" onClick={() => setF((x) => ({ ...x, starts_at: null, ends_at: null }))} className="mt-2 text-xs font-semibold underline underline-offset-4">
                Hapus jadwal
              </button>
            )}
          </div>
          <Switch checked={f.is_active} onChange={(v) => set("is_active", v)} label="Aktif" description="Nonaktif = tidak tayang walau dalam jadwal." />
        </div>
      </div>
    </Dialog>
  );
}

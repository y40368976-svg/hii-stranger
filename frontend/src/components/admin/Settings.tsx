"use client";
import React, { useState } from "react";
import { QrCode, Wrench } from "lucide-react";
import { settingService, adminService } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import { ErrorState, Skeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
import { Field, Input, Switch, Textarea } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import type { ApiSiteSettings } from "@/types/api";
import { ImageField, PageHeader, Panel, run } from "./kit";

export default function AdminSettings() {
  const { data, error, loading, reload, setData } = useAsync(() => settingService.get(), []);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <Skeleton className="h-96" />;
  return (
    <div>
      <PageHeader title="Pengaturan" description="QRIS toko untuk pembayaran dan mode maintenance storefront." />
      <div className="grid gap-5 lg:grid-cols-2">
        <QrisForm settings={data} onSaved={setData} />
        <MaintenanceForm settings={data} onSaved={setData} />
      </div>
    </div>
  );
}

function QrisForm({ settings, onSaved }: { settings: ApiSiteSettings; onSaved: (s: ApiSiteSettings) => void }) {
  const [img, setImg] = useState(settings.qris_image_url ?? "");
  const [merchant, setMerchant] = useState(settings.qris_merchant_name ?? "");
  const [nmid, setNmid] = useState(settings.qris_nmid ?? "");
  const [hours, setHours] = useState(String(settings.payment_window_hours));
  const [busy, setBusy] = useState(false);

  return (
    <Panel className="p-5 md:p-6">
      <p className="mb-1 flex items-center gap-2 font-bold">
        <QrCode className="size-5" /> QRIS statis toko
      </p>
      <p className="mb-5 text-sm text-muted">Gambar ini tampil di halaman pembayaran setiap pesanan. Pelanggan memasukkan nominal unik sendiri saat scan.</p>
      <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
        <ImageField value={img} onChange={setImg} recommended="1000 × 1000 px (persegi), latar putih" aspect="aspect-square" />
        <div className="space-y-4">
          <Field label="Nama merchant">
            {(id) => <Input id={id} value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="HII STRANGER" />}
          </Field>
          <Field label="NMID" hint="Tercetak di bawah kode QRIS.">
            {(id, d) => <Input id={id} aria-describedby={d} value={nmid} onChange={(e) => setNmid(e.target.value)} placeholder="ID10200…" />}
          </Field>
          <Field label="Batas waktu bayar" hint="Order belum dibayar dibatalkan otomatis & stok dikembalikan.">
            {(id, d) => (
              <Select
                id={id}
                aria-describedby={d}
                value={hours}
                onChange={setHours}
                options={["6", "12", "24", "48", "72"].map((h) => ({ value: h, label: h + " jam" }))}
              />
            )}
          </Field>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button
          variant="dark"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            const res = await run(
              () => adminService.updateSettings({ qris_image_url: img, qris_merchant_name: merchant.trim(), qris_nmid: nmid.trim(), payment_window_hours: Number(hours) }),
              "Pengaturan QRIS disimpan."
            );
            setBusy(false);
            if (res && res !== true) onSaved(res);
          }}
        >
          Simpan QRIS
        </Button>
      </div>
    </Panel>
  );
}

function MaintenanceForm({ settings, onSaved }: { settings: ApiSiteSettings; onSaved: (s: ApiSiteSettings) => void }) {
  const [on, setOn] = useState(settings.maintenance_mode);
  const [msg, setMsg] = useState(settings.maintenance_message);
  const [busy, setBusy] = useState(false);
  const [prev, setPrev] = useState(settings);
  if (prev !== settings) {
    setPrev(settings);
    setOn(settings.maintenance_mode);
    setMsg(settings.maintenance_message);
  }

  return (
    <Panel className="p-5 md:p-6">
      <p className="mb-1 flex items-center gap-2 font-bold">
        <Wrench className="size-5" /> Mode maintenance
      </p>
      <p className="mb-5 text-sm text-muted">Saat aktif, pengunjung melihat pesan di bawah. Staf tetap bisa membuka toko & panel.</p>
      <div className="space-y-4">
        <Switch checked={on} onChange={setOn} label={on ? "Toko ditutup sementara" : "Toko buka"} />
        <Field label="Pesan untuk pengunjung" required>
          {(id) => <Textarea id={id} rows={4} maxLength={500} value={msg} onChange={(e) => setMsg(e.target.value)} />}
        </Field>
      </div>
      <div className="mt-6 flex justify-end">
        <Button
          variant={on ? "danger" : "dark"}
          loading={busy}
          disabled={!msg.trim()}
          onClick={async () => {
            setBusy(true);
            const res = await run(() => adminService.updateSettings({ maintenance_mode: on, maintenance_message: msg.trim() }), on ? "Maintenance aktif." : "Toko dibuka.");
            setBusy(false);
            if (res && res !== true) onSaved(res);
          }}
        >
          Simpan
        </Button>
      </div>
    </Panel>
  );
}

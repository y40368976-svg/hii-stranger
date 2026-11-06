"use client";
import React, { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { adminService } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import { Badge, EmptyState, ErrorState, Skeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Field, Input, Switch } from "@/components/ui/Field";
import type { ApiCategory } from "@/types/api";
import { PageHeader, Panel, run } from "./kit";

export default function AdminCategories() {
  const list = useAsync(() => adminService.categories(), []);
  const [edit, setEdit] = useState<ApiCategory | "new" | null>(null);
  const [del, setDel] = useState<ApiCategory | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <PageHeader
        title="Kategori"
        description="Kategori nonaktif disembunyikan dari toko tanpa menghapus produknya."
        actions={
          <Button variant="dark" onClick={() => setEdit("new")}>
            <Plus className="size-4" /> Kategori baru
          </Button>
        }
      />
      <Panel>
        {list.error ? (
          <div className="p-4">
            <ErrorState message={list.error} onRetry={list.reload} />
          </div>
        ) : list.loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : !list.data?.data.length ? (
          <EmptyState title="Belum ada kategori" />
        ) : (
          <ul className="divide-y divide-line">
            {list.data.data.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="flex-1 font-semibold">{c.name}</span>
                <Badge tone={c.is_active ? "success" : "neutral"}>{c.is_active ? "Aktif" : "Nonaktif"}</Badge>
                <Button size="icon" variant="ghost" aria-label={"Ubah " + c.name} onClick={() => setEdit(c)}>
                  <Pencil className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label={"Hapus " + c.name} className="text-danger" onClick={() => setDel(c)}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {edit && <CategoryDialog cat={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={() => (setEdit(null), list.reload())} />}
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        danger
        loading={busy}
        title="Hapus kategori?"
        description={`Produk di kategori “${del?.name}” tetap ada tetapi tanpa kategori.`}
        confirmLabel="Hapus"
        onConfirm={async () => {
          if (!del) return;
          setBusy(true);
          const ok = await run(() => adminService.deleteCategory(del.id), "Kategori dihapus.");
          setBusy(false);
          if (ok) {
            setDel(null);
            list.reload();
          }
        }}
      />
    </div>
  );
}

function CategoryDialog({ cat, onClose, onSaved }: { cat: ApiCategory | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(cat?.name ?? "");
  const [active, setActive] = useState(cat?.is_active ?? true);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={cat ? "Ubah kategori" : "Kategori baru"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="dark"
            loading={busy}
            disabled={!name.trim()}
            onClick={async () => {
              setBusy(true);
              const input = { name: name.trim(), is_active: active };
              const ok = await run(() => (cat ? adminService.updateCategory(cat.id, input) : adminService.createCategory(input)), "Kategori disimpan.");
              setBusy(false);
              if (ok) onSaved();
            }}
          >
            Simpan
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Nama kategori" required>
          {(id) => <Input id={id} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Hoodie & Fleece" />}
        </Field>
        <Switch checked={active} onChange={setActive} label="Tampil di toko" description="Matikan untuk menyembunyikan sementara." />
      </div>
    </Dialog>
  );
}

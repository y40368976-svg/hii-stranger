"use client";
import React, { useEffect, useState } from "react";
import { BadgeCheck, Search } from "lucide-react";
import { adminService } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/app/context/AuthContext";
import { formatDate } from "@/lib/format";
import { Badge, EmptyState, ErrorState, Pagination, Segmented, Skeleton } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import type { ApiUser, Role } from "@/types/api";
import { DesktopOnly, MobileList, PageHeader, Panel, run, Table, td } from "./kit";

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "customer", label: "Pelanggan", description: "Belanja & checkout" },
  { value: "staff", label: "Staff", description: "Kelola pesanan, pembayaran, katalog, banner & News. Tanpa akses pengaturan toko & pengguna." },
  { value: "admin", label: "Admin", description: "Akses penuh panel, tidak bisa belanja" },
];

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<{ u: ApiUser; change: { role?: string; status?: string }; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const list = useAsync(() => adminService.users({ role: role || undefined, q: search || undefined, page, limit: 20 }), [role, search, page]);

  useEffect(() => {
    const t = setTimeout(() => (setSearch(q.trim()), setPage(1)), 350);
    return () => clearTimeout(t);
  }, [q]);

  const roleSelect = (u: ApiUser, self: boolean) => (
    <Select
      size="sm"
      value={u.role}
      disabled={self}
      options={ROLES}
      aria-label={"Role " + u.name}
      onChange={(v) => v !== u.role && setPending({ u, change: { role: v }, text: `Ubah role ${u.name} menjadi ${ROLES.find((r) => r.value === v)?.label}?` })}
    />
  );
  const statusSelect = (u: ApiUser, self: boolean) => (
    <Select
      size="sm"
      value={u.status}
      disabled={self}
      aria-label={"Status " + u.name}
      options={[
        { value: "active", label: "Aktif" },
        { value: "inactive", label: "Nonaktif", description: "Tidak bisa masuk" },
      ]}
      onChange={(v) => v !== u.status && setPending({ u, change: { status: v }, text: v === "inactive" ? `Nonaktifkan akun ${u.name}? Ia tidak bisa masuk lagi.` : `Aktifkan kembali akun ${u.name}?` })}
    />
  );

  return (
    <div>
      <PageHeader
        title="Pengguna & role"
        description="Admin dan staff adalah akun back-office: tidak bisa berbelanja. Perubahan role berlaku setelah pengguna masuk ulang."
      />
      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <Segmented
            className="flex-1"
            value={role}
            onChange={(v) => (setRole(v), setPage(1))}
            options={[{ value: "", label: "Semua" }, ...ROLES.map((r) => ({ value: r.value, label: r.label }))]}
          />
          <div className="md:w-72">
            <Input leading={<Search className="size-4" />} className="h-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nama atau email" aria-label="Cari pengguna" />
          </div>
        </div>
        {list.error ? (
          <div className="p-4">
            <ErrorState message={list.error} onRetry={list.reload} />
          </div>
        ) : list.loading && !list.data ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !list.data?.data.length ? (
          <EmptyState title="Tidak ada pengguna" />
        ) : (
          <>
            <MobileList>
              {list.data.data.map((u) => {
                const self = u.id === me?.id;
                return (
                  <li key={u.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-stone-2 font-display text-sm font-bold uppercase">
                        {u.name.slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 font-semibold">
                          <span className="truncate">{u.name}</span>
                          {self && <Badge tone="dark">Kamu</Badge>}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-muted">
                          <span className="truncate">{u.email}</span>
                          {u.email_verified_at && <BadgeCheck className="size-3.5 shrink-0 text-success" aria-label="Email terverifikasi" />}
                        </p>
                        <p className="mt-0.5 text-[11px] text-faint">Bergabung {formatDate(u.created_at)}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="caps mb-1 block text-muted">Role</span>
                        {roleSelect(u, self)}
                      </label>
                      <label className="block">
                        <span className="caps mb-1 block text-muted">Status</span>
                        {statusSelect(u, self)}
                      </label>
                    </div>
                  </li>
                );
              })}
            </MobileList>
            <DesktopOnly>
          <Table head={["Pengguna", "Bergabung", "Role", "Status"]}>
            {list.data.data.map((u) => {
              const self = u.id === me?.id;
              return (
                <tr key={u.id}>
                  <td className={td}>
                    <p className="flex items-center gap-1.5 font-semibold">
                      {u.name} {self && <Badge tone="dark">Kamu</Badge>}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      {u.email}
                      {u.email_verified_at && <BadgeCheck className="size-3.5 text-success" aria-label="Email terverifikasi" />}
                    </p>
                  </td>
                  <td className={td + " text-muted"}>{formatDate(u.created_at)}</td>
                  <td className={td + " w-52"}>{roleSelect(u, self)}</td>
                  <td className={td + " w-44"}>{statusSelect(u, self)}</td>
                </tr>
              );
            })}
          </Table>
            </DesktopOnly>
          </>
        )}
        {list.data && list.data.meta.total > 20 && (
          <div className="border-t border-line p-4">
            <Pagination page={page} limit={20} total={list.data.meta.total} onPage={setPage} />
          </div>
        )}
      </Panel>
      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title="Konfirmasi perubahan"
        description={pending?.text}
        loading={busy}
        danger={pending?.change.status === "inactive" || pending?.change.role === "admin"}
        onConfirm={async () => {
          if (!pending) return;
          setBusy(true);
          const ok = await run(() => adminService.updateUser(pending.u.id, pending.change), "Pengguna diperbarui.");
          setBusy(false);
          setPending(null);
          if (ok) list.reload();
        }}
      />
    </div>
  );
}

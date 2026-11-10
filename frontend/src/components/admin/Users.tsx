"use client";
import React, { useEffect, useState } from "react";
import { BadgeCheck, Search } from "lucide-react";
import { adminService } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import { formatDate } from "@/lib/format";
import { Badge, EmptyState, ErrorState, Segmented, Skeleton } from "@/components/ui/misc";
import { Input } from "@/components/ui/Field";
import type { ApiUser } from "@/types/api";
import {
  DesktopOnly,
  ListPager,
  MobileList,
  MobileSearch,
  PageHeader,
  Panel,
  Table,
  td,
  useMobileLimit,
} from "./kit";

const LIMIT = 20;

/** Daftar pelanggan terdaftar (hanya baca). Admin/staff tidak ditampilkan. */
export default function AdminUsers() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { limit } = useMobileLimit(LIMIT, () => setPage(1));
  const list = useAsync(
    () =>
      adminService.users({
        role: "customer",
        status: status || undefined,
        q: search || undefined,
        page,
        limit,
      }),
    [status, search, page, limit],
  );
  // Jaga-jaga bila API tetap mengembalikan akun back-office.
  const rows = (list.data?.data ?? []).filter((u) => u.role === "customer");

  useEffect(() => {
    const t = setTimeout(() => (setSearch(q.trim()), setPage(1)), 350);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <PageHeader
        title="Pelanggan"
        description="Daftar pelanggan yang terdaftar di toko. Halaman ini hanya untuk melihat data."
      />
      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <Segmented
            className="flex-1"
            value={status}
            onChange={(v) => (setStatus(v), setPage(1))}
            options={[
              { value: "", label: "Semua" },
              { value: "active", label: "Aktif" },
              { value: "inactive", label: "Nonaktif" },
            ]}
          />
          <MobileSearch
            value={search}
            onSearch={(v) => (setSearch(v), setPage(1))}
            placeholder="Nama atau email"
          />
          <div className="hidden md:block md:w-72">
            <Input
              leading={<Search className="size-4" />}
              className="h-10"
              placeholder="Nama atau email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Cari pelanggan"
            />
          </div>
        </div>
        {list.error ? (
          <div className="p-4">
            <ErrorState message={list.error} onRetry={list.reload} />
          </div>
        ) : list.loading && !list.data ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : !rows.length ? (
          <EmptyState
            title="Belum ada pelanggan"
            description={search ? "Coba kata kunci lain." : undefined}
          />
        ) : (
          <>
            <MobileList>
              {rows.map((u) => (
                <li key={u.id} className="flex items-start gap-3 p-4">
                  <Avatar u={u} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">{u.name}</p>
                      <StatusBadge u={u} />
                    </div>
                    <Email u={u} />
                    <p className="truncate text-xs text-muted">{u.phone || "Tanpa nomor HP"}</p>
                    <p className="mt-0.5 text-[11px] text-faint">Bergabung {formatDate(u.created_at)}</p>
                  </div>
                </li>
              ))}
            </MobileList>
            <DesktopOnly>
              <Table head={["Pelanggan", "No. HP", "Status", "Bergabung"]}>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <Avatar u={u} />
                        <div className="min-w-0">
                          <p className="font-semibold">{u.name}</p>
                          <Email u={u} />
                        </div>
                      </div>
                    </td>
                    <td className={td + " tabular text-muted"}>{u.phone || "—"}</td>
                    <td className={td}>
                      <StatusBadge u={u} />
                    </td>
                    <td className={td + " whitespace-nowrap text-muted"}>{formatDate(u.created_at)}</td>
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
    </div>
  );
}

function Avatar({ u }: { u: ApiUser }) {
  return (
    <span
      className="grid size-10 shrink-0 place-items-center rounded-full bg-stone-2 font-display text-sm font-bold uppercase"
      aria-hidden
    >
      {u.name.slice(0, 1)}
    </span>
  );
}

function Email({ u }: { u: ApiUser }) {
  return (
    <p className="flex min-w-0 items-center gap-1 text-xs text-muted">
      <span className="truncate">{u.email}</span>
      {u.email_verified_at && (
        <BadgeCheck className="size-3.5 shrink-0 text-success" aria-label="Email terverifikasi" />
      )}
    </p>
  );
}

function StatusBadge({ u }: { u: ApiUser }) {
  return u.status === "active" ? (
    <Badge tone="success">Aktif</Badge>
  ) : (
    <Badge tone="neutral">Nonaktif</Badge>
  );
}

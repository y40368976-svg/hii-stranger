"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  ExternalLink,
  Gauge,
  Image as ImageIcon,
  LogOut,
  Menu as MenuIcon,
  NotebookPen,
  Package,
  Settings,
  Shirt,
  Tags,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { adminService } from "@/services";
import { Logo } from "@/components/site/Logo";
import { LinkButton } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import AdminSummary from "./Summary";
import AdminAnalytics from "./Analytics";
import AdminOrders from "./Orders";
import AdminPayments from "./Payments";
import AdminProducts from "./Products";
import AdminCategories from "./Categories";
import AdminBanners from "./Banners";
import AdminJournal from "./Journal";
import AdminUsers from "./Users";
import AdminSettings from "./Settings";
import { BrandLoader } from "@/components/ui/Loader";
import { useScrollLock } from "@/components/ui/useDismiss";

type TabKey =
  | "summary"
  | "analytics"
  | "orders"
  | "payments"
  | "products"
  | "categories"
  | "banners"
  | "journal"
  | "users"
  | "settings";

type Role = "admin" | "staff";

const TABS: {
  key: TabKey;
  label: string;
  icon: React.ElementType;
  group: string;
  roles: Role[];
}[] = [
  {
    key: "summary",
    label: "Ringkasan",
    icon: Gauge,
    group: "Operasional",
    roles: ["admin", "staff"],
  },
  {
    key: "analytics",
    label: "Analitik",
    icon: BarChart3,
    group: "Operasional",
    roles: ["admin"],
  },
  {
    key: "orders",
    label: "Pesanan",
    icon: Package,
    group: "Operasional",
    roles: ["admin", "staff"],
  },
  {
    key: "payments",
    label: "Verifikasi bayar",
    icon: CreditCard,
    group: "Operasional",
    roles: ["admin", "staff"],
  },
  {
    key: "products",
    label: "Produk & stok",
    icon: Shirt,
    group: "Katalog",
    roles: ["admin", "staff"],
  },
  {
    key: "categories",
    label: "Kategori",
    icon: Tags,
    group: "Katalog",
    roles: ["admin", "staff"],
  },
  {
    key: "banners",
    label: "Banner & event",
    icon: ImageIcon,
    group: "Konten",
    roles: ["admin", "staff"],
  },
  {
    key: "journal",
    label: "News",
    icon: NotebookPen,
    group: "Konten",
    roles: ["admin", "staff"],
  },
  {
    key: "users",
    label: "Pelanggan",
    icon: Users,
    group: "Sistem",
    roles: ["admin"],
  },
  {
    key: "settings",
    label: "Pengaturan",
    icon: Settings,
    group: "Sistem",
    roles: ["admin"],
  },
];

const VIEWS: Record<TabKey, React.ComponentType> = {
  summary: AdminSummary,
  analytics: AdminAnalytics,
  orders: AdminOrders,
  payments: AdminPayments,
  products: AdminProducts,
  categories: AdminCategories,
  banners: AdminBanners,
  journal: AdminJournal,
  users: AdminUsers,
  settings: AdminSettings,
};

export default function AdminApp() {
  const { user, loading, isAdmin, isStaff, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [navOpen, setNavOpen] = useState(false);
  const [pending, setPending] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);

  useScrollLock(navOpen);

  // Esc menutup laci; fokus pindah ke tombol tutup saat dibuka.
  useEffect(() => {
    if (!navOpen) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  // Laci tidak boleh tertinggal terbuka (dan mengunci scroll) saat layar melebar ke desktop.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setNavOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const role: Role | null = isAdmin ? "admin" : isStaff ? "staff" : null;
  const allowed = TABS.filter((t) => role && t.roles.includes(role));
  const requested = sp.get("tab") as TabKey | null;
  const current = allowed.find((t) => t.key === requested) ?? allowed[0];

  // Tutup laci setiap kali halaman (tab) berganti, termasuk lewat tautan di konten.
  const [prevKey, setPrevKey] = useState(current?.key);
  if (prevKey !== current?.key) {
    setPrevKey(current?.key);
    setNavOpen(false);
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/signin?next=/admin");
  }, [loading, user, router]);

  // Badge antrean verifikasi pembayaran di menu.
  useEffect(() => {
    if (!isStaff) return;
    const load = () =>
      adminService
        .summary()
        .then((s) => setPending(s.proofs_to_review))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [isStaff, current?.key]);

  if (loading || !user) return <BrandLoader fullscreen label="Memuat panel" />;

  if (!role)
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <div className="max-w-sm text-center">
          <p className="font-display text-2xl font-extrabold uppercase">
            Khusus staf
          </p>
          <p className="mt-2 text-sm text-muted">
            Halaman ini hanya untuk admin dan staff Hii Stranger.
          </p>
          <LinkButton href="/" className="mt-6">
            Kembali ke toko
          </LinkButton>
        </div>
      </div>
    );

  const select = (k: TabKey) => {
    setNavOpen(false);
    if (k === current.key) return;
    router.replace(pathname + "?tab=" + k, { scroll: true });
  };

  const closeNav = () => {
    setNavOpen(false);
    menuRef.current?.focus({ preventScroll: true });
  };

  const View = VIEWS[current.key];
  const groups = Array.from(new Set(allowed.map((t) => t.group)));

  const nav = (
    <nav className="flex flex-col gap-5" aria-label="Menu panel">
      {groups.map((g) => (
        <div key={g}>
          <p className="caps mb-1.5 px-3 text-faint">{g}</p>
          <ul className="space-y-1">
            {allowed
              .filter((t) => t.group === g)
              .map(({ key, label, icon: Icon }) => {
                const active = current.key === key;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => select(key)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group/item relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors duration-150 motion-reduce:transition-none",
                        "before:absolute before:inset-y-2.5 before:left-0 before:w-1 before:rounded-r-full before:transition-colors",
                        active
                          ? "bg-ink text-canvas before:bg-lime"
                          : "text-ink-3 before:bg-transparent hover:bg-stone hover:text-ink active:bg-stone-2",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-lg transition-colors",
                          active ? "bg-white/10 text-lime" : "bg-stone text-ink-3 group-hover/item:bg-white",
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                      {key === "payments" && pending > 0 && (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-lime px-1.5 text-[11px] font-bold text-ink tabular">
                          {pending}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="space-y-1 border-t border-line pt-4">
      <div className="mb-2 flex items-center gap-3 px-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-stone-2 font-display text-sm font-bold uppercase"
          aria-hidden
        >
          {user.name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="caps text-muted">{role === "admin" ? "Admin" : "Staff"}</p>
        </div>
      </div>
      <Link
        href="/"
        className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink-3 transition-colors hover:bg-stone hover:text-ink"
      >
        <ExternalLink className="size-4" aria-hidden /> Lihat toko
      </Link>
      <button
        type="button"
        onClick={() => {
          logout();
          router.push("/signin");
        }}
        className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
      >
        <LogOut className="size-4" aria-hidden /> Keluar
      </button>
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-white p-5 lg:flex">
        <Logo href="/admin" />
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain">
          {nav}
          <div className="mt-auto">{footer}</div>
        </div>
      </aside>

      {/* Header mobile: latar solid (tanpa backdrop-blur) supaya scroll tetap mulus. */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-canvas px-2 lg:hidden">
        <button
          ref={menuRef}
          type="button"
          aria-label={
            pending > 0
              ? `Buka menu, ${pending} bukti bayar menunggu`
              : "Buka menu"
          }
          aria-expanded={navOpen}
          aria-controls="admin-drawer"
          onClick={() => setNavOpen(true)}
          className="relative grid size-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-stone active:bg-stone-2"
        >
          <MenuIcon className="size-5" />
          {pending > 0 && (
            <span
              className="absolute right-2 top-2 size-2.5 rounded-full bg-lime ring-2 ring-canvas"
              aria-hidden
            />
          )}
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-bold">
          {current.label}
        </p>
        <Logo href="/admin" compact className="mr-2" />
      </header>

      {/* Laci mobile: selalu ter-mount supaya buka/tutup bisa dianimasikan (transform + opacity). */}
      <div className="lg:hidden" aria-hidden={!navOpen}>
        <div
          className={cn(
            "fixed inset-0 z-50 bg-ink/40 transition-opacity duration-200 ease-out motion-reduce:transition-none",
            navOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={closeNav}
        />
        <div
          id="admin-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menu panel"
          inert={!navOpen}
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[min(300px,86vw)] flex-col gap-5 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-pop will-change-transform",
            "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none",
            navOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0",
          )}
        >
          <div className="flex items-center justify-between pl-1">
            <Logo href="/admin" />
            <button
              ref={closeRef}
              type="button"
              aria-label="Tutup menu"
              onClick={closeNav}
              className="grid size-11 place-items-center rounded-full transition-colors hover:bg-stone active:bg-stone-2"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain">
            {nav}
            <div className="mt-auto">{footer}</div>
          </div>
        </div>
      </div>

      <main className="min-w-0 px-4 py-6 md:px-8 md:py-10 xl:px-10">
        <div className="mx-auto min-w-0 max-w-1200px">
          <View key={current.key} />
        </div>
      </main>
    </div>
  );
}

"use client";
import React, { useEffect, useState } from "react";
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
    label: "Pengguna & role",
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
  useScrollLock(navOpen);

  // Esc menutup menu laci di mobile/tablet.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const role: Role | null = isAdmin ? "admin" : isStaff ? "staff" : null;
  const allowed = TABS.filter((t) => role && t.roles.includes(role));
  const requested = sp.get("tab") as TabKey | null;
  const current = allowed.find((t) => t.key === requested) ?? allowed[0];

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
      <div className="grid min-h-screen place-items-center p-6">
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
    router.replace(pathname + "?tab=" + k, { scroll: true });
  };
  const View = VIEWS[current.key];
  const groups = Array.from(new Set(allowed.map((t) => t.group)));

  const nav = (
    <nav className="flex flex-col gap-6" aria-label="Menu panel">
      {groups.map((g) => (
        <div key={g}>
          <p className="caps mb-2 px-3 text-faint">{g}</p>
          <ul className="space-y-0.5">
            {allowed
              .filter((t) => t.group === g)
              .map(({ key, label, icon: Icon }) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => select(key)}
                    aria-current={current.key === key ? "page" : undefined}
                    className={cn(
                      "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                      current.key === key
                        ? "bg-ink text-lime"
                        : "text-ink-3 hover:bg-stone",
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="flex-1 text-left">{label}</span>
                    {key === "payments" && pending > 0 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-lime px-1.5 text-[11px] font-bold text-ink tabular">
                        {pending}
                      </span>
                    )}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="space-y-2 border-t border-line pt-4">
      <div className="px-3">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className="caps text-muted">
          {role === "admin" ? "Admin" : "Staff"}
        </p>
      </div>
      <Link
        href="/"
        className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink-3 hover:bg-stone"
      >
        <ExternalLink className="size-4" /> Lihat toko
      </Link>
      <button
        type="button"
        onClick={() => {
          logout();
          router.push("/signin");
        }}
        className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-danger hover:bg-danger-soft"
      >
        <LogOut className="size-4" /> Keluar
      </button>
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-8 border-r border-line bg-white p-5 lg:flex">
        <Logo href="/admin" />
        <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto overscroll-contain">
          {nav}
          <div className="mt-auto">{footer}</div>
        </div>
      </aside>

      <header className="glass sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line px-4 lg:hidden">
        <button
          type="button"
          aria-label={
            pending > 0
              ? `Buka menu, ${pending} bukti bayar menunggu`
              : "Buka menu"
          }
          aria-expanded={navOpen}
          onClick={() => setNavOpen(true)}
          className="relative -ml-2 grid size-10 place-items-center rounded-full hover:bg-stone"
        >
          <MenuIcon className="size-5" />
          {pending > 0 && (
            <span
              className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-lime ring-2 ring-canvas"
              aria-hidden
            />
          )}
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-bold">
          {current.label}
        </p>
        <Logo href="/admin" />
      </header>
      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40 animate-fade-in"
            onClick={() => setNavOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu panel"
            className="absolute inset-y-0 left-0 flex w-280px max-w-[85vw] flex-col gap-6 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-pop animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <Logo href="/admin" />
              <button
                type="button"
                aria-label="Tutup menu"
                onClick={() => setNavOpen(false)}
                className="grid size-10 place-items-center rounded-full hover:bg-stone"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto overscroll-contain">
              {nav}
              <div className="mt-auto">{footer}</div>
            </div>
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 md:px-8 md:py-10 xl:px-10">
        <div className="mx-auto max-w-1200px">
          <View key={current.key} />
        </div>
      </main>
    </div>
  );
}

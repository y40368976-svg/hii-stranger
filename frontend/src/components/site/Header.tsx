"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Package,
  PenLine,
  Search,
  ShoppingBag,
  Store,
  User,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useCartModalContext } from "@/app/context/CartSidebarModalContext";
import { useAppSelector } from "@/redux/store";
import { selectCartCount } from "@/redux/features/cart-slice";
import { useCategories } from "@/hooks/useCategories";
import { Menu } from "@/components/ui/Menu";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";
import { SearchDialog } from "./SearchDialog";

const NAV = [
  { href: "/shop", label: "Katalog" },
  { href: "/shop?sort=newest", label: "Baru Datang" },
  { href: "/journal", label: "Jurnal" },
];

export default function Header() {
  const { user, isStaff, isCopywriter, logout } = useAuth();
  const count = useAppSelector(selectCartCount);
  const { openCartModal } = useCartModalContext();
  const categories = useCategories();
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

  const accountItems = user
    ? [
        ...(isStaff
          ? [
              {
                label: isCopywriter ? "Studio Jurnal" : "Panel Admin",
                icon: isCopywriter ? <PenLine className="size-4" /> : <LayoutDashboard className="size-4" />,
                href: isCopywriter ? "/admin?tab=journal" : "/admin",
              },
            ]
          : [
              { label: "Pesanan saya", icon: <Package className="size-4" />, href: "/my-account" },
              { label: "Profil & keamanan", icon: <UserRound className="size-4" />, href: "/my-account?tab=profile" },
            ]),
        "separator" as const,
        {
          label: "Keluar",
          icon: <LogOut className="size-4" />,
          danger: true,
          onSelect: () => {
            logout();
            router.push("/");
          },
        },
      ]
    : [];

  return (
    <>
      <header className="glass fixed inset-x-0 top-0 z-40 border-b border-line/70">
        <div className="container-x flex h-16 items-center gap-4 lg:h-[72px]">
          <Logo />

          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Utama">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors hover:bg-stone",
                  pathname === n.href.split("?")[0] && n.href.indexOf("?") < 0 && "bg-stone"
                )}
              >
                {n.label}
              </Link>
            ))}
            {categories.length > 0 && (
              <Menu
                label="Kategori"
                align="start"
                items={[
                  { label: "Semua produk", href: "/shop" },
                  "separator",
                  ...categories.map((c) => ({ label: c.name, href: "/shop?category=" + c.id })),
                ]}
                trigger={({ open, toggle, ref }) => (
                  <button
                    ref={ref}
                    type="button"
                    onClick={toggle}
                    aria-expanded={open}
                    aria-haspopup="menu"
                    className={cn("inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold hover:bg-stone", open && "bg-stone")}
                  >
                    Kategori <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
                  </button>
                )}
              />
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Cari produk"
              className="hidden h-10 items-center gap-2 rounded-full border border-line bg-white/70 pl-3.5 pr-4 text-sm text-muted transition-colors hover:border-line-strong md:inline-flex md:w-56"
            >
              <Search className="size-4" /> Cari produk…
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Cari produk"
              className="grid size-11 place-items-center rounded-full hover:bg-stone md:hidden"
            >
              <Search className="size-5" />
            </button>

            {user ? (
              <Menu
                label="Akun"
                items={accountItems}
                header={
                  <div>
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                }
                className="hidden sm:inline-block"
                trigger={({ open, toggle, ref }) => (
                  <button
                    ref={ref}
                    type="button"
                    onClick={toggle}
                    aria-expanded={open}
                    aria-haspopup="menu"
                    aria-label="Menu akun"
                    className={cn(
                      "inline-flex h-10 items-center gap-2 rounded-full pl-1 pr-3 text-sm font-semibold hover:bg-stone",
                      open && "bg-stone"
                    )}
                  >
                    <span className="grid size-8 place-items-center rounded-full bg-ink text-[13px] font-bold uppercase text-lime">
                      {user.name.trim().charAt(0) || "?"}
                    </span>
                    <span className="hidden max-w-28 truncate lg:inline">{user.name.split(" ")[0]}</span>
                  </button>
                )}
              />
            ) : (
              <Link
                href="/signin"
                className="hidden h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold hover:bg-stone sm:inline-flex"
              >
                <User className="size-4" /> Masuk
              </Link>
            )}

            {isStaff ? (
              <Link
                href={isCopywriter ? "/admin?tab=journal" : "/admin"}
                className="caps hidden h-10 items-center gap-2 rounded-full bg-ink px-4 text-lime sm:inline-flex"
              >
                {isCopywriter ? <PenLine className="size-3.5" /> : <LayoutDashboard className="size-3.5" />}
                {isCopywriter ? "Studio" : "Panel"}
              </Link>
            ) : (
              <button
                type="button"
                onClick={openCartModal}
                aria-label={`Tas belanja, ${count} barang`}
                className="relative grid size-11 place-items-center rounded-full hover:bg-stone"
              >
                <ShoppingBag className="size-5" />
                {count > 0 && (
                  <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-lime px-1 text-[11px] font-bold text-ink ring-2 ring-canvas tabular">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>
      <MobileTabBar />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

/** Navigasi bawah untuk satu tangan di mobile. */
function MobileTabBar() {
  const pathname = usePathname();
  const { user, isStaff, isCopywriter } = useAuth();
  const count = useAppSelector(selectCartCount);
  const { openCartModal } = useCartModalContext();

  const item = (active: boolean) =>
    cn(
      "relative flex flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-semibold",
      active ? "text-ink" : "text-muted"
    );
  const bar = (active: boolean) =>
    active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-ink" aria-hidden />;

  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line/70 pb-safe sm:hidden" aria-label="Navigasi bawah">
      <div className="flex h-16">
        <Link href="/" className={item(pathname === "/")}>
          {bar(pathname === "/")}
          <Home className="size-5" /> Beranda
        </Link>
        <Link href="/shop" className={item(pathname.startsWith("/shop") || pathname.startsWith("/product"))}>
          {bar(pathname.startsWith("/shop") || pathname.startsWith("/product"))}
          <Store className="size-5" /> Katalog
        </Link>
        <Link href="/journal" className={item(pathname.startsWith("/journal"))}>
          {bar(pathname.startsWith("/journal"))}
          <BookOpen className="size-5" /> Jurnal
        </Link>
        {isStaff ? (
          <Link href={isCopywriter ? "/admin?tab=journal" : "/admin"} className={item(false)}>
            <LayoutDashboard className="size-5" /> {isCopywriter ? "Studio" : "Panel"}
          </Link>
        ) : (
          <button type="button" onClick={openCartModal} className={item(false)}>
            <span className="relative">
              <ShoppingBag className="size-5" />
              {count > 0 && (
                <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-lime px-1 text-[10px] font-bold text-ink tabular">
                  {count}
                </span>
              )}
            </span>
            Tas
          </button>
        )}
        {user ? (
          <Link href={isStaff ? "/admin" : "/my-account"} className={item(pathname.startsWith("/my-account"))}>
            {bar(pathname.startsWith("/my-account"))}
            <UserRound className="size-5" /> Akun
          </Link>
        ) : (
          <Link href="/signin" className={item(pathname.startsWith("/signin"))}>
            {bar(pathname.startsWith("/signin"))}
            <LogIn className="size-5" /> Masuk
          </Link>
        )}
      </div>
    </nav>
  );
}

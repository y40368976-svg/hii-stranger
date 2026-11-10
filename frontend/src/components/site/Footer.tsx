import Link from "next/link";
import { Mail, QrCode, Truck } from "lucide-react";
import { Logo } from "./Logo";

const LINKS = [
  {
    title: "Belanja",
    items: [
      { href: "/shop?new=1", label: "Baru datang" },
      { href: "/shop?availability=preorder", label: "Pre-order" },
    ],
  },
  {
    title: "Bantuan",
    items: [
      { href: "/my-account", label: "Lacak pesanan" },
      { href: "/journal", label: "News" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-stone">
      <div className="container-x grid gap-3 border-b border-line py-6 sm:grid-cols-3">
        {[
          { icon: QrCode, title: "Bayar QRIS", text: "Semua bank & e-wallet" },
          {
            icon: Truck,
            title: "Kirim se-Indonesia",
            text: "Ongkir dihitung otomatis",
          },
          {
            icon: Mail,
            title: "Resi via email",
            text: "Lacak paket kapan saja",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-ink text-lime">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted">{text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="container-x grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            {/*Streetwear heavyweight dari Indonesia. Rilis dalam batch terbatas —
            begitu habis, arsipnya ditutup.*/}
          </p>
        </div>
        {LINKS.map((g) => (
          <div key={g.title}>
            <p className="caps mb-4 text-muted">{g.title}</p>
            <ul className="space-y-2.5">
              {g.items.map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    className="text-sm font-medium hover:underline hover:underline-offset-4"
                  >
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container-x flex flex-col gap-2 border-t border-line py-5 text-xs text-muted sm:flex-row sm:justify-between">
        <span>© 2026 Hii Stranger. Hak cipta dilindungi undang-undang.</span>
        <span></span>
      </div>
    </footer>
  );
}

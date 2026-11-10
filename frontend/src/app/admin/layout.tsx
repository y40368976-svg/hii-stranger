import type { Metadata } from "next";

export const metadata: Metadata = { title: "Panel", robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh overflow-x-clip bg-canvas">{children}</div>;
}

import type { Metadata } from "next";
import Shop from "@/components/shop/Shop";

export const metadata: Metadata = { title: "Katalog" };

export default function ShopPage() {
  return <Shop />;
}

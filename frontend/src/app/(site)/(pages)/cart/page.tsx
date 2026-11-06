import type { Metadata } from "next";
import CartPage from "@/components/cart/CartPage";

export const metadata: Metadata = { title: "Tas belanja" };

export default function Page() {
  return <CartPage />;
}

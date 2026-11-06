import type { Metadata } from "next";
import OrderDetail from "@/components/order/OrderDetail";

export const metadata: Metadata = { title: "Detail pesanan" };

export default function Page() {
  return <OrderDetail />;
}

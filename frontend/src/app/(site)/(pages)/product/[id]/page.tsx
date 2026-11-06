import type { Metadata } from "next";
import ProductDetail from "@/components/product/ProductDetail";

export const metadata: Metadata = { title: "Produk" };

export default function ProductPage() {
  return <ProductDetail />;
}

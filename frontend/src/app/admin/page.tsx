import { Suspense } from "react";
import AdminApp from "@/components/admin/AdminApp";
import { BrandLoader } from "@/components/ui/Loader";

export default function AdminPage() {
  return (
    <Suspense fallback={<BrandLoader fullscreen label="Memuat panel" />}>
      <AdminApp />
    </Suspense>
  );
}

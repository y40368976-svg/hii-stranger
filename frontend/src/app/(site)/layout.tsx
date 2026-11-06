import React, { Suspense } from "react";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import CartDrawer from "@/components/site/CartDrawer";
import MaintenanceGate from "@/components/site/MaintenanceGate";
import VerifyNotice from "@/components/site/VerifyNotice";
import { BrandLoader } from "@/components/ui/Loader";

function PageFallback() {
  return <BrandLoader />;
}

// Header & halaman memakai usePathname/useSearchParams (nilai runtime), jadi
// dibungkus Suspense agar prerender Cache Components tidak terblokir.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<div className="h-16 lg:h-[72px]" />}>
        <Header />
      </Suspense>
      <div className="pt-16 lg:pt-[72px]">
        <VerifyNotice />
        <main className="min-h-[70vh]">
          <Suspense fallback={<PageFallback />}>
            <MaintenanceGate>{children}</MaintenanceGate>
          </Suspense>
        </main>
      </div>
      <CartDrawer />
      <Footer />
    </>
  );
}

import type { Metadata } from "next";
import ResetPassword from "@/components/auth/ResetPassword";

export const metadata: Metadata = { title: "Atur ulang password", robots: { index: false } };

export default function Page() {
  return <ResetPassword />;
}

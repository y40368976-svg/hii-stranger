import type { Metadata } from "next";
import ForgotPassword from "@/components/auth/ForgotPassword";

export const metadata: Metadata = { title: "Lupa password", robots: { index: false } };

export default function Page() {
  return <ForgotPassword />;
}

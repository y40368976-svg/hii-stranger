import type { Metadata } from "next";
import VerifyEmail from "@/components/auth/VerifyEmail";

export const metadata: Metadata = { title: "Verifikasi email" };

export default function Page() {
  return <VerifyEmail />;
}

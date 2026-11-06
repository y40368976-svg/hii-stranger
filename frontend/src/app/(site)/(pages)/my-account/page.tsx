import type { Metadata } from "next";
import Account from "@/components/account/Account";

export const metadata: Metadata = { title: "Akun saya" };

export default function Page() {
  return <Account />;
}

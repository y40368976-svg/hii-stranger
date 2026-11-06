import type { Metadata } from "next";
import Signup from "@/components/auth/Signup";

export const metadata: Metadata = { title: "Daftar" };

export default function Page() {
  return <Signup />;
}

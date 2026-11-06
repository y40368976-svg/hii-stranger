import type { Metadata } from "next";
import Signin from "@/components/auth/Signin";

export const metadata: Metadata = { title: "Masuk" };

export default function Page() {
  return <Signin />;
}

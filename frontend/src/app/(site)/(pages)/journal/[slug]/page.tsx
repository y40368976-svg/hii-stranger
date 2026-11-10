import type { Metadata } from "next";
import JournalPost from "@/components/journal/JournalPost";

export const metadata: Metadata = { title: "News" };

export default function Page() {
  return <JournalPost />;
}

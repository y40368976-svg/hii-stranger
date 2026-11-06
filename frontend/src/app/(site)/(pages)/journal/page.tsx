import type { Metadata } from "next";
import JournalList from "@/components/journal/JournalList";

export const metadata: Metadata = { title: "Jurnal", description: "Cerita rilis, panduan ukuran, dan perawatan streetwear Hii Stranger." };

export default function Page() {
  return <JournalList />;
}

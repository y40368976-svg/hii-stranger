import Link from "next/link";
import { cn } from "@/lib/cn";

/** Wordmark Hii Stranger. */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2", className)} aria-label="Hii Stranger, ke beranda">
      <span className="grid size-8 place-items-center rounded-lg bg-ink font-display text-[15px] font-extrabold text-lime transition-transform group-hover:-rotate-6">
        H!
      </span>
      <span className="font-display text-[19px] font-extrabold uppercase leading-none tracking-[-0.03em]">
        Hii Stranger
      </span>
    </Link>
  );
}

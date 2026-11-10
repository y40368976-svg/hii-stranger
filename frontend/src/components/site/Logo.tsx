import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Logo Hii Stranger: emblem (public/Logo.png, putih transparan, jadi diberi
 * latar gelap supaya terbaca di tema terang) + wordmark.
 */
export function Logo({
  className,
  href = "/",
  compact = false,
}: {
  className?: string;
  href?: string;
  /** Hanya emblem, tanpa teks (mis. header sempit). */
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex shrink-0 items-center gap-2", className)}
      aria-label="Hii Stranger, ke beranda"
    >
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-ink transition-transform duration-200 group-hover:-rotate-6 motion-reduce:transition-none">
        <Image
          src="/Logo.png"
          alt=""
          width={36}
          height={36}
          sizes="36px"
          className="size-9 object-contain"
        />
      </span>
      {!compact && (
        <span className="whitespace-nowrap font-display text-[19px] font-extrabold uppercase leading-none tracking-[-0.03em]">
          Hii Stranger
        </span>
      )}
    </Link>
  );
}

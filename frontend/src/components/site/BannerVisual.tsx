import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ApiBanner } from "@/types/api";
import { cdn } from "@/lib/img";

/** Gambar banner responsif: gambar mobile (bila ada) dipakai di layar < 640px. */
export function BannerPicture({ banner, className, eager }: { banner: ApiBanner; className?: string; eager?: boolean }) {
  return (
    <picture>
      {banner.mobile_image_url && <source media="(max-width: 639px)" srcSet={cdn(banner.mobile_image_url, 1080)} />}
      <img
          decoding="async"
        src={cdn(banner.image_url, 1920)}
        alt={banner.title ?? "Banner Hii Stranger"}
        loading={eager ? "eager" : "lazy"}
        className={cn("size-full object-cover", className)}
      />
    </picture>
  );
}

/** Bungkus tautan banner: path internal memakai Link, URL luar membuka tab baru. */
export function BannerLink({
  href,
  className,
  children,
  label,
}: {
  href: string | null;
  className?: string;
  children: React.ReactNode;
  label?: string;
}) {
  if (!href) return <div className={className}>{children}</div>;
  if (/^https?:\/\//.test(href))
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={label}>
        {children}
      </a>
    );
  return (
    <Link href={href} className={className} aria-label={label}>
      {children}
    </Link>
  );
}

export function CtaPill({ label }: { label: string }) {
  return (
    <span className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-lime px-5 text-sm font-semibold text-ink transition-transform group-hover:translate-x-0.5">
      {label} <ArrowRight className="size-4" />
    </span>
  );
}

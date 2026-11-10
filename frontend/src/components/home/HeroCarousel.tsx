"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ApiBanner } from "@/types/api";
import { BannerLink, BannerPicture, CtaPill } from "@/components/site/BannerVisual";

const INTERVAL = 6000;

/** Carousel hero beranda (banner penempatan "hero"). Geser di mobile, auto-play, jeda saat hover. */
export function HeroCarousel({ banners }: { banners: ApiBanner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  const n = banners.length;
  const go = useCallback((i: number) => setIndex(((i % n) + n) % n), [n]);

  useEffect(() => {
    if (n < 2 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % n), INTERVAL);
    return () => clearInterval(t);
  }, [n, paused]);

  return (
    <section
      className="container-x pt-3 md:pt-6"
      aria-roledescription="carousel"
      aria-label="Kampanye"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="relative overflow-hidden rounded-2xl bg-ink md:rounded-3xl"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
          touch.current = null;
        }}
      >
        <div className="flex transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)]" style={{ transform: `translateX(-${index * 100}%)` }}>
          {banners.map((b, i) => (
            <BannerLink
              key={b.id}
              href={b.link_url}
              label={b.title ?? undefined}
              className="group relative block aspect-[4/5] w-full shrink-0 sm:aspect-[16/9] lg:aspect-[12/5]"
            >
              <div aria-hidden={i !== index}>
                <div className="absolute inset-0">
                  <BannerPicture banner={b} eager={i === 0} />
                </div>
                {(b.title || b.subtitle || b.cta_label) && (
                  <>
                    <div className="absolute inset-0 bg-linear-to-t from-ink/85 via-ink/25 to-transparent md:bg-linear-to-r md:from-ink/80 md:via-ink/30" />
                    <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 md:bottom-auto md:top-1/2 md:max-w-xl md:-translate-y-1/2 md:p-12">
                      {b.subtitle && (
                        <span className="caps inline-flex self-start rounded-full bg-lime px-2.5 py-1 text-ink">{b.subtitle}</span>
                      )}
                      {b.title && (
                        <h1 className="font-display text-[34px] font-extrabold uppercase leading-[0.95] tracking-tight text-canvas md:text-6xl">
                          {b.title}
                        </h1>
                      )}
                      {b.cta_label && b.link_url && (
                        <div className="pt-1">
                          <CtaPill label={b.cta_label} />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </BannerLink>
          ))}
        </div>

        {n > 1 && (
          <>
            <button
              type="button"
              aria-label="Banner sebelumnya"
              onClick={() => go(index - 1)}
              className="absolute left-4 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-canvas/90 text-ink backdrop-blur hover:bg-canvas md:grid"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Banner berikutnya"
              onClick={() => go(index + 1)}
              className="absolute right-4 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-canvas/90 text-ink backdrop-blur hover:bg-canvas md:grid"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Banner ${i + 1}`}
              aria-current={i === index}
              onClick={() => go(i)}
              className={cn("h-1.5 rounded-full transition-[width,background-color]", i === index ? "w-6 bg-ink" : "w-1.5 bg-line-strong")}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** Hero tipografis saat belum ada banner hero yang tayang. */
export function HeroFallback() {
  return (
    <section className="container-x pt-3 md:pt-6">
      <div className="relative overflow-hidden rounded-2xl bg-ink px-6 py-14 text-canvas md:rounded-3xl md:px-14 md:py-24">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-lime/20 blur-3xl" />
        <p className="caps mb-4 text-lime">Hii Stranger · Heavyweight Streetwear</p>
        <h1 className="max-w-3xl font-display text-[40px] font-extrabold uppercase leading-[0.92] tracking-tight md:text-7xl">
          Dibuat tebal. Dirilis terbatas.
        </h1>
        <p className="mt-5 max-w-md text-[15px] text-canvas/70">
          Siluet oversized, cotton 300+ GSM, dan potongan yang dirancang untuk dipakai lama.
        </p>
        <Link href="/shop" className="group mt-8 inline-block">
          <CtaPill label="Belanja koleksi" />
        </Link>
      </div>
    </section>
  );
}

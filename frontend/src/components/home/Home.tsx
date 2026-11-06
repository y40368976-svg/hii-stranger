"use client";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MailCheck, MapPin, QrCode, Shirt } from "lucide-react";
import { bannerService, postService, productService } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import { useCategories } from "@/hooks/useCategories";
import { ProductCard, ProductCardSkeleton } from "@/components/site/ProductCard";
import { BannerLink, BannerPicture, CtaPill } from "@/components/site/BannerVisual";
import { ErrorState, SectionHeading, Skeleton } from "@/components/ui/misc";
import { formatDate } from "@/lib/format";
import { HeroCarousel, HeroFallback } from "./HeroCarousel";
import { cdn } from "@/lib/img";

const STEPS = [
  { icon: Shirt, title: "Pilih ukuran", text: "Cek stok per size langsung di halaman produk." },
  { icon: MapPin, title: "Isi alamat", text: "Ongkir dihitung otomatis sampai kelurahan." },
  { icon: QrCode, title: "Bayar QRIS", text: "Scan dari bank atau e-wallet apa pun, unggah bukti." },
  { icon: MailCheck, title: "Terima resi", text: "No. resi & tautan lacak dikirim ke email." },
];

export default function Home() {
  const hero = useAsync(() => bannerService.live("hero"), []);
  const main = useAsync(() => bannerService.live("main"), []);
  const products = useAsync(() => productService.list({ sort: "newest", limit: 8 }), []);
  const posts = useAsync(() => postService.list({ limit: 3 }), []);
  const categories = useCategories();

  return (
    <div className="pb-6">
      {hero.loading ? (
        <div className="container-x pt-3 md:pt-6">
          <Skeleton className="aspect-[4/5] w-full rounded-2xl sm:aspect-[16/9] lg:aspect-[12/5]" />
        </div>
      ) : hero.data && hero.data.length > 0 ? (
        <HeroCarousel banners={hero.data} />
      ) : (
        <HeroFallback />
      )}

      {categories.length > 0 && (
        <section className="mt-8">
          <div className="container-x mb-3 flex items-center justify-between">
            <p className="caps text-muted">Kategori</p>
            <Link href="/shop" className="text-[13px] font-semibold hover:underline">
              Semua
            </Link>
          </div>
          <div className="no-scrollbar container-x flex gap-2 overflow-x-auto">
            <Link href="/shop" className="inline-flex h-10 shrink-0 items-center rounded-full bg-ink px-5 text-[13px] font-semibold text-lime">
              Semua produk
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={"/shop?category=" + c.id}
                className="inline-flex h-10 shrink-0 items-center rounded-full border border-line bg-stone px-5 text-[13px] font-semibold text-ink-3 transition-colors hover:border-ink hover:text-ink"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container-x mt-12 md:mt-16">
        <SectionHeading
          eyebrow="Katalog terbaru"
          title="Baru datang"
          action={
            <Link href="/shop?sort=newest" className="inline-flex items-center gap-1 text-sm font-semibold hover:underline">
              Lihat semua <ArrowRight className="size-4" />
            </Link>
          }
        />
        {products.error ? (
          <ErrorState message={products.error} onRetry={products.reload} />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {products.loading
              ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : products.data?.data.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
          </div>
        )}
        {!products.loading && products.data?.data.length === 0 && (
          <p className="rounded-2xl border border-line bg-stone p-8 text-center text-sm text-muted">
            Produk baru sedang disiapkan. Kembali sebentar lagi.
          </p>
        )}
      </section>

      {main.data && main.data.length > 0 && (
        <section className="container-x mt-14 space-y-4 md:mt-20">
          {main.data.map((b) => (
            <BannerLink
              key={b.id}
              href={b.link_url}
              label={b.title ?? undefined}
              className="group grid overflow-hidden rounded-2xl border border-line bg-stone md:grid-cols-[1.35fr_1fr] md:rounded-3xl"
            >
              <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[420px]">
                <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.02]">
                  <BannerPicture banner={b} />
                </div>
              </div>
              {(b.subtitle || b.title || (b.cta_label && b.link_url)) && (
              <div className="flex flex-col justify-center gap-4 p-6 md:p-12">
                {b.subtitle && <p className="caps text-muted">{b.subtitle}</p>}
                {b.title && (
                  <h2 className="font-display text-3xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-5xl">
                    {b.title}
                  </h2>
                )}
                {b.cta_label && b.link_url && (
                  <div>
                    <CtaPill label={b.cta_label} />
                  </div>
                )}
              </div>
              )}
            </BannerLink>
          ))}
        </section>
      )}

      <section className="container-x mt-14 md:mt-20">
        <SectionHeading eyebrow="Pedoman pemesanan" title="Cara belanja" />
        <ol className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="flex flex-col gap-5 rounded-2xl border border-line bg-stone p-4 md:p-6">
              <div className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-full bg-ink font-display text-base font-bold text-lime">{i + 1}</span>
                <Icon className="size-5 text-muted" aria-hidden />
              </div>
              <div>
                <p className="text-[15px] font-bold">{title}</p>
                <p className="mt-1 text-[13px] leading-snug text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {posts.data && posts.data.data.length > 0 && (
        <section className="container-x mt-14 md:mt-20">
          <SectionHeading
            eyebrow="Jurnal"
            title="Cerita & panduan"
            action={
              <Link href="/journal" className="inline-flex items-center gap-1 text-sm font-semibold hover:underline">
                Semua artikel <ArrowRight className="size-4" />
              </Link>
            }
          />
          <div className="grid gap-4 md:grid-cols-3 md:gap-5">
            {posts.data.data.map((p) => (
              <Link key={p.id} href={"/journal/" + p.slug} className="group flex flex-col">
                <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-stone-2">
                  {p.cover_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
          decoding="async" src={cdn(p.cover_image_url, 900)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  )}
                </div>
                <p className="caps mt-4 text-muted">
                  {p.tag ?? "Jurnal"} · {formatDate(p.published_at)}
                </p>
                <h3 className="mt-1.5 flex items-start gap-2 text-lg font-bold leading-snug">
                  <span className="flex-1">{p.title}</span>
                  <ArrowUpRight className="mt-1 size-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

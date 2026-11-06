"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { postService } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import { EmptyState, ErrorState, SectionHeading, Skeleton } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/Button";
import { ProductCard } from "@/components/site/ProductCard";
import { formatDate } from "@/lib/format";
import { Prose } from "./Prose";
import { cdn } from "@/lib/img";

export default function JournalPost() {
  const { slug } = useParams<{ slug: string }>();
  const { data: p, error, loading, reload } = useAsync(() => postService.get(slug), [slug]);

  if (loading)
    return (
      <div className="container-x [--cx-max:48rem] space-y-4 py-10">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="aspect-[16/9] w-full" />
      </div>
    );
  if (error)
    return (
      <div className="container-x [--cx-max:48rem] py-14">
        {error.toLowerCase().includes("tidak ditemukan") ? (
          <EmptyState title="Artikel tidak ditemukan" action={<LinkButton href="/journal">Ke jurnal</LinkButton>} />
        ) : (
          <ErrorState message={error} onRetry={reload} />
        )}
      </div>
    );
  if (!p) return null;

  return (
    <article className="py-8 md:py-12">
      <div className="container-x [--cx-max:48rem]">
        <Link href="/journal" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Jurnal
        </Link>
        <p className="caps mt-6 flex flex-wrap items-center gap-2 text-muted">
          <span className="rounded-full bg-ink px-2.5 py-1 text-lime">{p.tag ?? "Jurnal"}</span>
          <span>{formatDate(p.published_at)}</span>·
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" /> {p.read_minutes} mnt baca
          </span>
        </p>
        <h1 className="mt-4 font-display text-[36px] font-extrabold uppercase leading-[0.95] tracking-tight md:text-6xl">{p.title}</h1>
        {p.excerpt && <p className="mt-5 text-lg leading-relaxed text-muted">{p.excerpt}</p>}
        {p.author_name && <p className="mt-5 text-sm">Ditulis oleh <b>{p.author_name}</b></p>}
      </div>

      {p.cover_image_url && (
        <div className="container-x mt-8 max-w-5xl">
          <div className="aspect-[16/9] overflow-hidden rounded-3xl border border-line bg-stone-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
          decoding="async" src={cdn(p.cover_image_url, 1600)} alt="" className="size-full object-cover" />
          </div>
        </div>
      )}

      <div className="container-x mt-10 max-w-3xl">
        <Prose source={p.content} />
      </div>

      {p.products.length > 0 && (
        <section className="container-x mt-16">
          <SectionHeading eyebrow="Disebut di artikel" title="Belanja tampilannya" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {p.products.map((pr) => (
              <ProductCard key={pr.id} product={pr} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { postService } from "@/services";
import { useAsync } from "@/hooks/useAsync";
import {
  EmptyState,
  ErrorState,
  Pagination,
  Skeleton,
} from "@/components/ui/misc";
import { formatDate } from "@/lib/format";
import type { ApiPost } from "@/types/api";
import { cdn } from "@/lib/img";

const LIMIT = 9;

export default function JournalList() {
  const [page, setPage] = useState(1);
  const list = useAsync(() => postService.list({ page, limit: LIMIT }), [page]);
  const posts = list.data?.data ?? [];
  const [lead, ...rest] = page === 1 ? posts : [undefined, ...posts];

  return (
    <div className="container-x py-8 md:py-12">
      <p className="caps mb-1 text-muted">News Hii Stranger</p>
      <h1 className="font-display text-[40px] font-extrabold uppercase leading-[0.9] tracking-tight md:text-7xl">
        Catatan dari studio
      </h1>
      <p className="mt-3 max-w-xl text-muted">
        Cerita di balik rilis, panduan ukuran, dan cara merawat bahan
        heavyweight supaya awet.
      </p>

      <div className="mt-10">
        {list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : list.loading ? (
          <div className="grid gap-5 md:grid-cols-3">
            <Skeleton className="aspect-4/3 md:col-span-3 md:aspect-21/9" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="aspect-4/3" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            className="rounded-2xl border border-line bg-stone"
            title="Belum ada artikel"
            description="Tim kami sedang menulis. Cek lagi nanti."
          />
        ) : (
          <>
            {lead && <LeadCard post={lead} />}
            <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {rest.filter(Boolean).map((p) => (
                <PostCard key={p!.id} post={p!} />
              ))}
            </div>
            <div className="mt-12">
              <Pagination
                page={page}
                limit={LIMIT}
                total={list.data?.meta.total ?? 0}
                onPage={setPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Meta({ post }: { post: ApiPost }) {
  return (
    <p className="caps flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
      <span>{post.tag ?? "News"}</span>·
      <span>{formatDate(post.published_at)}</span>·
      <span className="inline-flex items-center gap-1">
        <Clock className="size-3" /> {post.read_minutes} mnt
      </span>
    </p>
  );
}

function LeadCard({ post }: { post: ApiPost }) {
  return (
    <Link
      href={"/journal/" + post.slug}
      className="group grid overflow-hidden rounded-3xl border border-line bg-stone md:grid-cols-[1.4fr_1fr]"
    >
      <div className="aspect-4/3 overflow-hidden bg-stone-2 md:aspect-auto md:min-h-380px">
        {post.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            decoding="async"
            src={cdn(post.cover_image_url, 900)}
            alt=""
            className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <div className="flex flex-col justify-center p-6 md:p-10">
        <Meta post={post} />
        <h2 className="mt-3 font-display text-3xl font-extrabold uppercase leading-[0.98] tracking-tight md:text-4xl">
          {post.title}
        </h2>
        {post.excerpt && <p className="mt-4 text-muted">{post.excerpt}</p>}
        <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold">
          Baca artikel{" "}
          <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export function PostCard({ post }: { post: ApiPost }) {
  return (
    <Link href={"/journal/" + post.slug} className="group flex flex-col">
      <div className="aspect-4/3 overflow-hidden rounded-2xl border border-line bg-stone-2">
        {post.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            decoding="async"
            src={cdn(post.cover_image_url, 900)}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <div className="mt-4">
        <Meta post={post} />
      </div>
      <h3 className="mt-2 text-xl font-bold leading-snug">{post.title}</h3>
      {post.excerpt && (
        <p className="mt-2 line-clamp-2 text-sm text-muted">{post.excerpt}</p>
      )}
    </Link>
  );
}

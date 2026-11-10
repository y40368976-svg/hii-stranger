import React from "react";
import Link from "next/link";
import { cdn } from "@/lib/img";

/**
 * Perender Markdown ringan & aman untuk artikel News. Tidak memakai
 * dangerouslySetInnerHTML: teks dirender sebagai elemen React, dan hanya
 * tautan http(s)/path internal yang diizinkan.
 *
 * Didukung: # ## ### judul, paragraf, - / 1. daftar, > kutipan, --- garis,
 * ![alt](url) gambar, **tebal**, *miring*, `kode`, [teks](url).
 */
export function Prose({ source }: { source: string }) {
  const blocks = parseBlocks(source);
  return <div className="space-y-5 text-[16.5px] leading-[1.75] text-ink-3">{blocks.map((b, i) => renderBlock(b, i))}</div>;
}

type Block =
  | { t: "h"; level: 1 | 2 | 3; text: string }
  | { t: "p"; text: string }
  | { t: "ul" | "ol"; items: string[] }
  | { t: "quote"; text: string }
  | { t: "img"; alt: string; src: string }
  | { t: "hr" };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ t: "p", text: para.join(" ") });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (h) {
      flush();
      out.push({ t: "h", level: h[1].length as 1 | 2 | 3, text: h[2] });
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flush();
      out.push({ t: "hr" });
      continue;
    }
    const img = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(trimmed);
    if (img) {
      flush();
      if (safeUrl(img[2])) out.push({ t: "img", alt: img[1], src: img[2] });
      continue;
    }
    if (trimmed.startsWith(">")) {
      flush();
      const q: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) q.push(lines[i++].trim().replace(/^>\s?/, ""));
      i--;
      out.push({ t: "quote", text: q.join(" ") });
      continue;
    }
    const ul = /^[-*]\s+/.test(trimmed);
    const ol = /^\d+[.)]\s+/.test(trimmed);
    if (ul || ol) {
      flush();
      const items: string[] = [];
      const re = ul ? /^[-*]\s+/ : /^\d+[.)]\s+/;
      while (i < lines.length && re.test(lines[i].trim())) items.push(lines[i++].trim().replace(re, ""));
      i--;
      out.push({ t: ul ? "ul" : "ol", items });
      continue;
    }
    para.push(trimmed);
  }
  flush();
  return out;
}

function safeUrl(u: string) {
  return /^https?:\/\//i.test(u) || (u.startsWith("/") && !u.startsWith("//"));
}

function renderBlock(b: Block, key: number) {
  switch (b.t) {
    case "h": {
      const cls =
        b.level === 1
          ? "font-display text-3xl font-extrabold uppercase tracking-tight text-ink pt-4"
          : b.level === 2
            ? "font-display text-2xl font-extrabold uppercase tracking-tight text-ink pt-4"
            : "text-lg font-bold text-ink pt-2";
      const Tag = (`h${b.level + 1}`) as "h2" | "h3" | "h4";
      return (
        <Tag key={key} className={cls}>
          {inline(b.text)}
        </Tag>
      );
    }
    case "p":
      return <p key={key}>{inline(b.text)}</p>;
    case "ul":
      return (
        <ul key={key} className="list-disc space-y-1.5 pl-6 marker:text-ink">
          {b.items.map((it, i) => (
            <li key={i}>{inline(it)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="list-decimal space-y-1.5 pl-6 marker:font-bold marker:text-ink">
          {b.items.map((it, i) => (
            <li key={i}>{inline(it)}</li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <blockquote key={key} className="border-l-4 border-lime bg-stone py-3 pl-5 pr-4 font-display text-xl font-bold leading-snug text-ink">
          {inline(b.text)}
        </blockquote>
      );
    case "img":
      return (
        <figure key={key} className="overflow-hidden rounded-2xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
          decoding="async" src={cdn(b.src, 1400)} alt={b.alt} loading="lazy" className="w-full" />
          {b.alt && <figcaption className="bg-stone px-4 py-2 text-xs text-muted">{b.alt}</figcaption>}
        </figure>
      );
    case "hr":
      return <hr key={key} className="border-line" />;
  }
}

const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function inline(text: string): React.ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code key={i} className="rounded bg-stone-2 px-1.5 py-0.5 text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      if (!safeUrl(link[2])) return link[1];
      return link[2].startsWith("/") ? (
        <Link key={i} href={link[2]} className="font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4">
          {link[1]}
        </Link>
      ) : (
        <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4">
          {link[1]}
        </a>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

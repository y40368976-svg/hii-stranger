"use client";
import React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "dark" | "outline" | "soft" | "ghost" | "danger" | "danger-outline";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  // Lime khusus aksi konversi (beli, checkout, bayar).
  primary: "bg-lime text-ink hover:bg-lime-deep border border-transparent",
  dark: "bg-ink text-canvas hover:bg-ink-2 border border-ink",
  outline: "bg-transparent text-ink border border-ink hover:bg-ink hover:text-canvas",
  soft: "bg-stone text-ink border border-line hover:border-line-strong hover:bg-stone-2",
  // Tanpa warna teks agar bisa diwarnai lewat className (mis. text-danger).
  ghost: "bg-transparent border border-transparent hover:bg-stone",
  danger: "bg-danger text-white border border-danger hover:opacity-90",
  "danger-outline": "bg-white text-danger border border-danger/40 hover:border-danger hover:bg-danger hover:text-white",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-xl",
  md: "h-11 px-5 text-sm gap-2 rounded-xl",
  lg: "h-12 md:h-13 px-6 text-[15px] gap-2 rounded-xl",
  icon: "h-10 w-10 rounded-full",
};

type Common = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function buttonClass({ variant = "dark", size = "md", block, className }: Omit<Common, "children" | "loading">) {
  return cn(
    "inline-flex select-none items-center justify-center font-semibold whitespace-nowrap transition-[background,color,border,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    block && "w-full",
    className
  );
}

type ButtonProps = Common & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, block, className, children, disabled, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, block, className })}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

type LinkButtonProps = Common & { href: string; target?: string; rel?: string; onClick?: () => void };

export function LinkButton({ variant, size, block, className, children, href, ...rest }: LinkButtonProps) {
  const external = /^https?:\/\//.test(href);
  const cls = buttonClass({ variant, size, block, className });
  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

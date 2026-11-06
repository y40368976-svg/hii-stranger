"use client";
import React, { useId } from "react";
import { cn } from "@/lib/cn";

export const inputClass =
  "w-full h-12 rounded-xl border border-line bg-white px-3.5 text-ink placeholder:text-faint outline-none transition-colors focus:border-ink disabled:bg-stone disabled:text-muted aria-[invalid=true]:border-danger";

type FieldProps = {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: (id: string, describedBy?: string) => React.ReactNode;
};

/** Label + hint + error dengan id yang terhubung ke kontrol (aksesibel). */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? id + "-err" : hint ? id + "-hint" : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-[13px] font-semibold text-ink">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      {children(id, describedBy)}
      {error ? (
        <p id={id + "-err"} className="text-[12.5px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={id + "-hint"} className="text-[12.5px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; leading?: React.ReactNode };

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, leading, ...rest },
  ref
) {
  if (leading) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">{leading}</span>
        <input ref={ref} aria-invalid={invalid || undefined} className={cn(inputClass, "pl-10", className)} {...rest} />
      </div>
    );
  }
  return <input ref={ref} aria-invalid={invalid || undefined} className={cn(inputClass, className)} {...rest} />;
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(inputClass, "h-auto min-h-[110px] py-3 leading-relaxed", className)}
      {...rest}
    />
  );
});

/** Saklar on/off. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", disabled && "cursor-not-allowed opacity-60")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked ? "border-ink bg-ink" : "border-line-strong bg-stone-2"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-[18px] rounded-full transition-all",
            checked ? "left-[22px] bg-lime" : "left-0.5 bg-white shadow-sm"
          )}
        />
      </button>
      {(label || description) && (
        <span className="flex flex-col">
          {label && <span className="text-sm font-semibold text-ink">{label}</span>}
          {description && <span className="text-[13px] text-muted">{description}</span>}
        </span>
      )}
    </label>
  );
}

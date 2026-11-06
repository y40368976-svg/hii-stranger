import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ApiOrderDetail } from "@/types/api";

const STEPS = ["Bayar", "Verifikasi", "Dikemas", "Dikirim", "Selesai"];

/** Posisi langkah (0-4) dari status order & pembayaran. */
export function stepOf(o: ApiOrderDetail): number {
  switch (o.order_status) {
    case "pending_payment":
      return o.payment?.has_proof && o.payment.status === "pending" ? 1 : 0;
    case "paid":
    case "processing":
      return 2;
    case "shipped":
      return 3;
    case "completed":
      return 5;
    default:
      return -1;
  }
}

export function OrderStepper({ order }: { order: ApiOrderDetail }) {
  const step = stepOf(order);
  if (step < 0) return null;
  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label="Progres pesanan">
      {STEPS.map((s, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={s} className="flex flex-col gap-2" aria-current={current ? "step" : undefined}>
            <span className={cn("h-1.5 rounded-full", done ? "bg-ink" : current ? "bg-lime" : "bg-line")} />
            <span className={cn("flex min-w-0 items-center gap-1 truncate text-[10.5px] font-semibold sm:text-xs", done || current ? "text-ink" : "text-faint")}>
              {done && <Check className="hidden size-3 shrink-0 sm:block" />}
              {s}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

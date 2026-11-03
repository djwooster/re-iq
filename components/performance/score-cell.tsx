import { toneFor } from "@/components/ui/metric";
import { cn } from "@/lib/cn";

/** A measure where higher is better, colored by sign, with an optional second line. */
export function ScoreCell({ value, text, sub }: { value: number; text: string; sub?: string }) {
  return (
    <span className="inline-flex flex-col items-end">
      <span className={cn("num", toneFor(value, 0.002))}>{text}</span>
      {sub && <span className="num text-[10px] text-fg-3">{sub}</span>}
    </span>
  );
}

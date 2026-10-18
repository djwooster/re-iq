import { cn } from "@/lib/cn";

export type Tone = "neutral" | "favorable" | "unfavorable" | "warning" | "data" | "muted";

const TONES: Record<Tone, string> = {
  neutral: "text-fg-2 bg-fg/[0.06] border-fg/10",
  muted: "text-fg-3 bg-transparent border-border",
  favorable: "text-favorable bg-favorable/10 border-favorable/20",
  unfavorable: "text-unfavorable bg-unfavorable/10 border-unfavorable/20",
  warning: "text-warning bg-warning/10 border-warning/25",
  data: "text-data bg-data/10 border-data/20",
};

export function Badge({ tone = "neutral", dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-[18px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-1.5 text-[10px] font-medium leading-none",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export function Dot({ tone = "neutral", className }: { tone?: Tone; className?: string }) {
  const color = {
    neutral: "bg-fg-3",
    muted: "bg-fg/20",
    favorable: "bg-favorable",
    unfavorable: "bg-unfavorable",
    warning: "bg-warning",
    data: "bg-data",
  }[tone];
  return <span className={cn("inline-block size-1.5 shrink-0 rounded-full", color, className)} aria-hidden />;
}

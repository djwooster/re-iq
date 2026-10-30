import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The call to action every homepage section ends with: jump to the early-access
 * form, or open the demo on the page that shows what the section describes.
 */
export function SectionCta({ demo = "/app", className }: { demo?: string; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", className)}>
      <a
        href="#early-access"
        className="inline-flex h-9 items-center rounded-md bg-inverted px-4 text-[13px] font-medium text-inverted-fg transition-opacity duration-150 hover:opacity-90"
      >
        Request early access
      </a>
      <a href={`/demo?to=${demo}`} className="group inline-flex items-center gap-1 text-[13px] text-fg-2 transition-colors duration-150 hover:text-fg">
        See it in the demo
        <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={1.75} aria-hidden />
      </a>
    </div>
  );
}

// import { ArrowRight } from "lucide-react"; (for the parked demo link)
import { cn } from "@/lib/cn";
import { BookCall } from "./book-call";

/**
 * The call to action every homepage section ends with: book a call, or open the demo on the page that shows what the section describes.
 */
/** `demo` is the page the parked demo link opens; kept so the link can come back as it was. */
export function SectionCta({ className }: { demo?: string; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", className)}>
      <BookCall />
      {/* Demo parked while its mock data is out of date (see proxy.ts).
      <a href={`/demo?to=${demo}`} className="group inline-flex items-center gap-1 text-[13px] text-fg-2 transition-colors duration-150 hover:text-fg">
        See it in the demo
        <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={1.75} aria-hidden />
      </a> */}
    </div>
  );
}

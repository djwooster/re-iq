import { cn } from "@/lib/cn";
import { BookCall } from "./book-call";

/**
 * The call to action every homepage section ends with: book a call.
 */
export function SectionCta({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", className)}>
      <BookCall />
    </div>
  );
}

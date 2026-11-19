import { cn } from "@/lib/cn";
import { BOOKING_URL } from "@/lib/marketing";

/** The site's primary call to action. Opens the booking page, or the final section until one exists. */
export function BookCall({ className }: { className?: string }) {
  return (
    <a
      href={BOOKING_URL || "/#book-a-call"}
      {...(BOOKING_URL ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "inline-flex h-9 items-center rounded-md bg-inverted px-4 text-[13px] font-medium text-inverted-fg transition-opacity duration-150 hover:opacity-90",
        className,
      )}
    >
      Book a call
    </a>
  );
}

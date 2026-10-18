import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon && <div className="mb-3 flex size-8 items-center justify-center rounded-md border border-border bg-surface text-fg-3">{icon}</div>}
      <h3 className="text-[13px] font-semibold text-fg">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-fg-3">{description}</p>}
      {action && <div className="mt-4 flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-fg/[0.06]", className)} aria-hidden />;
}

"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import { Progress } from "./progress";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-inverted text-inverted-fg hover:opacity-90 border border-transparent",
  secondary: "bg-surface text-fg border border-border hover:border-border-strong hover:bg-surface-2",
  ghost: "text-fg-2 hover:text-fg hover:bg-surface-2 border border-transparent",
  danger: "bg-unfavorable text-white hover:opacity-90 border border-transparent dark:text-black",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: React.ReactNode;
  size?: "sm" | "xs";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", loading, icon, size = "sm", className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-[background-color,border-color,opacity,color] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-2 py-1 text-[11px]",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      <span className={cn("inline-flex items-center gap-1.5", loading && "invisible")}>
        {icon}
        {children}
      </span>
      {loading && (
        <span className="absolute inset-x-3 top-1/2 -translate-y-1/2">
          <Progress indeterminate className={variant === "primary" ? "bg-inverted-fg/20 [&>span]:bg-inverted-fg" : undefined} />
        </span>
      )}
    </button>
  );
});

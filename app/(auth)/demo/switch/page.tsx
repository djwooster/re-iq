import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { enterDemo } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "View the demo" };

type Props = { searchParams: Promise<{ to?: string; fresh?: string }> };

/** Shown when someone signed in opens a /demo link: the demo needs them signed out first. */
export default function DemoSwitchPage({ searchParams }: Props) {
  return (
    <Suspense>
      <Confirm searchParams={searchParams} />
    </Suspense>
  );
}

async function Confirm({ searchParams }: Props) {
  const { to = "/app", fresh } = await searchParams;
  return (
    <div>
      <h1 className="text-[15px] font-semibold text-fg">You&apos;ll be signed out to view the demo</h1>
      <p className="mt-1 text-xs text-fg-3">The demo uses a sample portfolio. Sign back in any time to return to your workspace.</p>
      <form action={enterDemo} className="mt-6 flex flex-col gap-3">
        <input type="hidden" name="to" value={to} />
        <input type="hidden" name="fresh" value={fresh === "1" ? "1" : ""} />
        <Button type="submit" variant="primary" className="w-full">
          Sign out and view the demo
        </Button>
      </form>
      <p className="mt-6 text-xs text-fg-3">
        <Link href="/app" className="text-fg-2 underline-offset-2 hover:text-fg hover:underline">
          Back to my workspace
        </Link>
      </p>
    </div>
  );
}

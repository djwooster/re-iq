import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import { PRODUCT_NAME } from "@/lib/labels";

/** The property manager's side: a plain page with the wordmark and sign-out. */
export default function UploaderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex h-12 items-center justify-between border-b border-border px-4 sm:px-6">
        <Link href="/upload" className="num text-[13px] font-semibold tracking-[0.06em] text-fg">
          {PRODUCT_NAME}
        </Link>
        <form action={signOut}>
          <button type="submit" className="cursor-pointer text-xs text-fg-2 hover:text-fg">
            Sign out
          </button>
        </form>
      </header>
      <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/labels";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex h-12 items-center px-6">
        <Link href="/login" className="num text-[13px] font-semibold tracking-[0.06em] text-fg">
          {PRODUCT_NAME}
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-[14vh] pb-16">
        <div className="w-full max-w-[340px]">{children}</div>
      </main>
    </div>
  );
}

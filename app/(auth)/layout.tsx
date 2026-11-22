import Link from "next/link";
import { AuthShowcase } from "@/components/shell/auth-showcase";
import { PRODUCT_NAME } from "@/lib/labels";

/** Sign-in pages: the form on the left, what RE-IQ does on the right (wide screens only). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-2">
      <main className="flex flex-col items-center px-4 pt-[12vh] pb-12">
        <Link href="/" className="num text-[15px] font-semibold tracking-[0.06em] text-fg">
          {PRODUCT_NAME}
        </Link>
        <div className="mt-8 w-full max-w-[400px]">{children}</div>
      </main>
      <aside className="hidden p-3 lg:block">
        <div className="sticky top-3 h-[calc(100vh-1.5rem)]">
          <AuthShowcase />
        </div>
      </aside>
    </div>
  );
}

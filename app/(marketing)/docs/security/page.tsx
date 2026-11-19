import type { Metadata } from "next";
import Link from "next/link";
import { DocBody, readDoc } from "@/lib/docs/markdown";

const doc = readDoc("security");

export const metadata: Metadata = { title: doc.title, description: doc.description };

/** Customer-facing security documentation. The content lives in content/docs/security.md. */
export default function SecurityDocsPage() {
  return (
    <div className="mx-auto grid max-w-[1120px] gap-10 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:pt-14">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="eyebrow">Docs</div>
        <nav aria-label="On this page" className="mt-3">
          <Link href="/docs/security" className="block text-[13px] font-semibold text-fg">
            {doc.title}
          </Link>
          <ul className="mt-2 flex flex-col gap-1 border-l border-border pl-3 text-[13px]">
            {doc.toc.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="block py-0.5 text-fg-2 transition-colors hover:text-fg">
                  {t.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <article className="min-w-0 max-w-[720px] [&_a]:text-fg [&_a]:underline [&_a]:decoration-fg/30 [&_a]:underline-offset-[3px] hover:[&_a]:decoration-fg [&_strong]:font-medium [&_strong]:text-fg">
        <div className="eyebrow">Docs</div>
        <h1 className="mt-2 text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-fg sm:text-[40px]">{doc.title}</h1>
        <p className="mt-3 text-[15px] leading-[1.65] text-fg-2">{doc.description}</p>
        <div className="mt-10">
          <DocBody doc={doc} />
        </div>
      </article>
    </div>
  );
}

import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Fragment } from "react";
import { LEGAL } from "@/lib/legal";

/**
 * A small renderer for the public docs in content/docs/*.md. It covers exactly what the docs use:
 * front matter (title, description), ## and ### headings, paragraphs, "- " bullets, > callouts,
 * pipe tables, **bold** and [links](url). Output is React elements, never raw HTML, so nothing in
 * a doc can inject markup. {{PLACEHOLDERS}} are filled from lib/legal.ts.
 */

export interface Doc {
  title: string;
  description: string;
  blocks: Block[];
  toc: { id: string; title: string }[];
}

type Block =
  | { kind: "h2" | "h3"; id: string; text: string }
  | { kind: "p" | "callout"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] };

const PLACEHOLDERS: Record<string, string> = {
  SECURITY_EMAIL: LEGAL.securityEmail,
  PRIVACY_EMAIL: LEGAL.privacyEmail,
  SUPPORT_EMAIL: LEGAL.supportEmail,
};

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function readDoc(name: string): Doc {
  return parseDoc(readFileSync(path.join(process.cwd(), "content", "docs", `${name}.md`), "utf8"));
}

export function parseDoc(source: string): Doc {
  const filled = source.replace(/\{\{([A-Z_]+)\}\}/g, (m, key: string) => PLACEHOLDERS[key] ?? m);
  const [, front = "", body = filled] = filled.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
  const meta = Object.fromEntries(front.split("\n").filter(Boolean).map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));

  const blocks: Block[] = [];
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const heading = line.match(/^(#{2,3}) (.+)$/);
    if (heading) {
      blocks.push({ kind: heading[1] === "##" ? "h2" : "h3", id: slug(heading[2]), text: heading[2] });
    } else if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) items.push(lines[i++].slice(2));
      i--;
      blocks.push({ kind: "ul", items });
    } else if (line.startsWith("> ")) {
      blocks.push({ kind: "callout", text: line.slice(2) });
    } else if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++].split("|").slice(1, -1).map((c) => c.trim()));
      i--;
      blocks.push({ kind: "table", head: rows[0], rows: rows.slice(2) });
    } else {
      blocks.push({ kind: "p", text: line });
    }
  }
  return {
    title: meta.title ?? "",
    description: meta.description ?? "",
    blocks,
    toc: blocks.flatMap((b) => (b.kind === "h2" ? [{ id: b.id, title: b.text }] : [])),
  };
}

/** **bold** and [text](href) inside a line. Internal links use next/link; others open normally. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        if (bold) return <strong key={i}>{bold[1]}</strong>;
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          const [, label, href] = link;
          if (href.startsWith("/") || href.startsWith("#")) return <Link key={i} href={href}>{label}</Link>;
          if (/^(https:|mailto:)/.test(href)) return <a key={i} href={href}>{label}</a>;
          return <Fragment key={i}>{label}</Fragment>;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

export function DocBody({ doc }: { doc: Doc }) {
  return (
    <>
      {doc.blocks.map((b, i) => {
        switch (b.kind) {
          case "h2":
            return (
              <h2 key={i} id={b.id} className="mt-12 scroll-mt-20 border-t border-border pt-8 text-[20px] font-semibold tracking-[-0.01em] text-fg first:mt-0 first:border-t-0 first:pt-0">
                {b.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} id={b.id} className="mt-6 scroll-mt-20 text-[15px] font-semibold text-fg">
                {b.text}
              </h3>
            );
          case "p":
            return (
              <p key={i} className="mt-3 text-[14px] leading-[1.65] text-fg-2">
                <Inline text={b.text} />
              </p>
            );
          case "callout":
            return (
              <p key={i} className="mt-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[13px] leading-[1.6] text-fg">
                <Inline text={b.text} />
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-[1.65] text-fg-2 marker:text-fg-3">
                {b.items.map((item, k) => (
                  <li key={k}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            );
          case "table":
            return (
              <div key={i} className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      {b.head.map((h) => (
                        <th key={h} scope="col" className="px-3 py-2 font-medium text-fg">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, r) => (
                      <tr key={r} className="border-b border-border/70 last:border-b-0">
                        {row.map((cell, c) => (
                          <td key={c} className={c === 0 ? "px-3 py-2 font-medium whitespace-nowrap text-fg" : "px-3 py-2 text-fg-2"}>
                            <Inline text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </>
  );
}

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseDoc } from "@/lib/docs/markdown";
import { SUBPROCESSORS } from "@/lib/legal";

/** Wording rules for the public legal and trust pages. */
const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");
const PAGES = ["app/(marketing)/privacy/page.tsx", "app/(marketing)/terms/page.tsx", "app/(marketing)/security/page.tsx", "lib/legal.ts", "content/docs/security.md", "app/(marketing)/docs/security/page.tsx"];

describe("legal and trust pages", () => {
  it("never claim certifications or absolute security", () => {
    const banned = /soc\s*2\s*(type\s*(i|ii|1|2)\s*)?(compliant|certified)|bank[- ]level|bank[- ]grade|military[- ]grade|100%\s*secure|fully secure|completely secure|unhackable/i;
    for (const p of PAGES) expect(read(p), p).not.toMatch(banned);
  });

  it("label the security roadmap as not yet live", () => {
    expect(read("app/(marketing)/security/page.tsx")).toMatch(/Not yet live/);
  });

  it("show the draft banner on Privacy and Terms, controlled by one flag", () => {
    expect(read("lib/legal.ts")).toMatch(/export const LEGAL_DRAFT = (true|false);/);
    for (const p of ["app/(marketing)/privacy/page.tsx", "app/(marketing)/terms/page.tsx"]) expect(read(p), p).toMatch(/<LegalPage\s+draft/);
    expect(read("components/marketing/legal.tsx")).toMatch(/draft && LEGAL_DRAFT/);
  });

  it("are linked from the footer and the sign-up form", () => {
    const footer = read("components/marketing/site-chrome.tsx");
    for (const href of ["/privacy", "/terms", "/security", "/docs/security"]) expect(footer).toContain(`"${href}"`);
    expect(read("app/(marketing)/security/page.tsx")).toMatch(/href="\/docs\/security">Read the full security docs/);
    const signup = read("components/shell/auth-form.tsx");
    expect(signup).toMatch(/By creating an account you agree to the/);
    expect(signup).toContain('href="/terms"');
    expect(signup).toContain('href="/privacy"');
  });
});

describe("security docs (content/docs/security.md)", () => {
  const source = read("content/docs/security.md");
  const doc = parseDoc(source);
  const section = (title: string) => {
    const start = source.indexOf(`## ${title}`);
    const next = source.indexOf("\n## ", start + 3);
    return source.slice(start, next === -1 ? undefined : next);
  };

  it("has every agreed section, in order", () => {
    expect(doc.toc.map((t) => t.title)).toEqual([
      "Overview",
      "How your data is protected",
      "Accounts and roles",
      "Sign-in",
      "Uploads and files",
      "Data we don't keep",
      "Where your data lives",
      "On our roadmap",
      "Reporting a security issue",
    ]);
  });

  it("labels what isn't live: uploads (until the upload flow ships), parsing rules, and the roadmap", () => {
    expect(section("Uploads and files")).toMatch(/Not yet live/);
    expect(section("Data we don't keep")).toMatch(/Not yet live[\s\S]*Payroll[\s\S]*Residents/);
    expect(section("On our roadmap")).toMatch(/Not yet live/);
  });

  it("lists the same subprocessors as the Security page", () => {
    const table = doc.blocks.find((b) => b.kind === "table");
    expect(table && "rows" in table ? table.rows.map((r) => r[0]) : []).toEqual(SUBPROCESSORS.map((s) => s.name));
  });

  it("keeps internal details out", () => {
    expect(source).not.toMatch(/staging|preview|production|TODO|Supabase CLI|pg_cron|RLS|row-level|service role|LLC|Colorado/i);
  });
});

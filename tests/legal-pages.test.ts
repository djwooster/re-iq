import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Wording rules for the public legal and trust pages. */
const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");
const PAGES = ["app/(marketing)/privacy/page.tsx", "app/(marketing)/terms/page.tsx", "app/(marketing)/security/page.tsx", "lib/legal.ts"];

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
    for (const href of ["/privacy", "/terms", "/security"]) expect(footer).toContain(`"${href}"`);
    const signup = read("components/shell/auth-form.tsx");
    expect(signup).toMatch(/By creating an account you agree to the/);
    expect(signup).toContain('href="/terms"');
    expect(signup).toContain('href="/privacy"');
  });
});

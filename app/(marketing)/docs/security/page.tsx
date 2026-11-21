import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, SUBPROCESSORS } from "@/lib/legal";

const TITLE = "Security & data";
const DESCRIPTION = "How RE-IQ protects your properties' data, who can see what, and what we're still building.";

export const metadata: Metadata = { title: TITLE, description: DESCRIPTION };

const SECTIONS = [
  { id: "overview", title: "Overview" },
  { id: "how-your-data-is-protected", title: "How your data is protected" },
  { id: "accounts-and-roles", title: "Accounts and roles" },
  { id: "sign-in", title: "Sign-in" },
  { id: "uploads-and-files", title: "Uploads and files" },
  { id: "reading-reports", title: "Reading reports" },
  { id: "where-your-data-lives", title: "Where your data lives" },
  { id: "on-our-roadmap", title: "On our roadmap" },
  { id: "reporting-a-security-issue", title: "Reporting a security issue" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/** Customer-facing security documentation. Describe only what's in place; the rest goes under the roadmap. */
export default function SecurityDocsPage() {
  return (
    <div className="mx-auto grid max-w-[1120px] gap-10 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:pt-14">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="eyebrow">Docs</div>
        <nav aria-label="On this page" className="mt-3">
          <Link href="/docs/security" className="block text-[13px] font-semibold text-fg">
            {TITLE}
          </Link>
          <ul className="mt-2 flex flex-col gap-1 border-l border-border pl-3 text-[13px]">
            {SECTIONS.map((t) => (
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
        <h1 className="mt-2 text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-fg sm:text-[40px]">{TITLE}</h1>
        <p className="mt-3 text-[15px] leading-[1.65] text-fg-2">{DESCRIPTION}</p>
        <div className="mt-10">
          <H2 id="overview" />
          <Ul>
            <li>Each customer&apos;s data is kept separate from every other customer&apos;s, and automated tests check this before we release changes to data or access.</li>
            <li>Your data is encrypted while it travels and while it&apos;s stored, in the United States.</li>
            <li>People only see what their role allows. Property managers you invite can upload reports, but never see your dashboards.</li>
            <li>We describe only what&apos;s actually in place. Anything still being built is listed under &quot;On our roadmap&quot;.</li>
          </Ul>

          <H2 id="how-your-data-is-protected" />
          <H3>Kept separate</H3>
          <Ul>
            <li>Every record belongs to one organization, and the database itself refuses to show it to anyone outside that organization.</li>
            <li>Before we release a change to data or access, automated tests try to read and change another organization&apos;s data, and check that they can&apos;t.</li>
          </Ul>
          <H3>Encrypted and stored in the US</H3>
          <Ul>
            <li>Every connection uses HTTPS, and browsers are told to always use it.</li>
            <li>Stored data is encrypted.</li>
            <li>Your data is stored in the United States (Oregon).</li>
          </Ul>
          <H3>Error reports without personal data</H3>
          <Ul>
            <li>When something breaks, we&apos;re alerted so we can fix it.</li>
            <li>Before an error report leaves the app, email addresses are removed and people appear only as an anonymous ID. IP addresses aren&apos;t stored.</li>
          </Ul>

          <H2 id="accounts-and-roles" />
          <H3>Three roles</H3>
          <Ul>
            <li>
              <strong>Owner</strong>: manages the organization and invites people.
            </li>
            <li>
              <strong>Member</strong>: sees the organization&apos;s dashboards and reports.
            </li>
            <li>
              <strong>Uploader</strong>: a property manager who sends monthly reports. Uploaders join only by invitation, see only the properties each organization gives them, and
              can&apos;t see dashboards.
            </li>
          </Ul>
          <H3>Invitations</H3>
          <Ul>
            <li>Each invite works only for the email address it was sent to.</li>
            <li>It expires after 7 days and works once.</li>
            <li>An owner can cancel a pending invite at any time.</li>
          </Ul>

          <H2 id="sign-in" />
          <Ul>
            <li>Sign in with your email and password, or with Google or Microsoft. Property managers sign in with email and password only.</li>
            <li>New accounts must confirm their email address before they can sign in.</li>
            <li>Passwords need at least 8 characters, and passwords known from data breaches are refused.</li>
            <li>Repeated sign-in attempts are slowed down to stop password guessing.</li>
            <li>Sign-in errors never reveal whether an account exists.</li>
          </Ul>

          <H2 id="uploads-and-files" />
          <Ul>
            <li>Owners choose which properties each property manager can upload to, and can change or remove that access at any time, effective immediately.</li>
            <li>Accepted files: Excel (.xlsx, .xls), CSV, PDF and photos (.jpg, .png, .heic), up to 25 MB each.</li>
            <li>Every file&apos;s contents are checked, not just its name. A file that isn&apos;t what its name says is refused, and spreadsheets containing macros are refused.</li>
            <li>Location and camera details are removed from photos before they&apos;re stored.</li>
            <li>Uploaded files are private: only our servers can read them, never the public. Downloads use links that expire within a minute.</li>
            <li>Uploading the same file again for the same property and month saves a new version instead of replacing the old one.</li>
            <li>Original files are kept as uploaded, privately, and deleted 90 days after a customer cancels, or right away when an organization&apos;s only owner deletes their account.</li>
          </Ul>

          <H2 id="reading-reports" />
          <Ul>
            <li>Spreadsheet reports (income statements, T-12s and AR aging) are read with Anthropic&apos;s Claude, which doesn&apos;t train on the data we send it.</li>
            <li>
              Resident names, contact details and bank account numbers are removed when a report is read. They&apos;re never in the figures we extract, never in our logs, and never
              sent to our AI provider.
            </li>
            <li>
              <strong>Benchmarks</strong>: we never pool customers&apos; private rent or occupancy data into shared benchmarks.
            </li>
          </Ul>

          <H2 id="where-your-data-lives" />
          <P>These companies help us run RE-IQ and process data on our behalf. Each one handles only what its job needs.</P>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th scope="col" className="px-3 py-2 font-medium text-fg">Company</th>
                  <th scope="col" className="px-3 py-2 font-medium text-fg">What it does for us</th>
                  <th scope="col" className="px-3 py-2 font-medium text-fg">Where</th>
                </tr>
              </thead>
              <tbody>
                {SUBPROCESSORS.map((s) => (
                  <tr key={s.name} className="border-b border-border/70 last:border-b-0">
                    <td className="px-3 py-2 font-medium whitespace-nowrap text-fg">{s.name}</td>
                    <td className="px-3 py-2 text-fg-2">{s.purpose}</td>
                    <td className="px-3 py-2 text-fg-2">{s.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <H2 id="on-our-roadmap" />
          <Callout>
            <strong>Not yet live.</strong> We&apos;ll move each item into the sections above only once it&apos;s done.
          </Callout>
          <Ul>
            <li>Payroll totals only, never what an individual is paid.</li>
            <li>Multi-factor sign-in.</li>
            <li>An independent security review.</li>
            <li>SOC 2.</li>
          </Ul>

          <H2 id="reporting-a-security-issue" />
          <Ul>
            <li>If you think you&apos;ve found a security problem, email {LEGAL.securityEmail} with the details.</li>
            <li>Please don&apos;t test against other customers&apos; data or share the issue publicly until we&apos;ve fixed it.</li>
            <li>We&apos;ll acknowledge your report and keep you updated.</li>
          </Ul>
        </div>
      </article>
    </div>
  );
}

function H2({ id }: { id: SectionId }) {
  return (
    <h2 id={id} className="mt-12 scroll-mt-20 border-t border-border pt-8 text-[20px] font-semibold tracking-[-0.01em] text-fg first:mt-0 first:border-t-0 first:pt-0">
      {SECTIONS.find((s) => s.id === id)!.title}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 text-[15px] font-semibold text-fg">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[14px] leading-[1.65] text-fg-2">{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-[1.65] text-fg-2 marker:text-fg-3">{children}</ul>;
}

function Callout({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[13px] leading-[1.6] text-fg">{children}</p>;
}

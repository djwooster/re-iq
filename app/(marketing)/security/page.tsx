import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/marketing/legal";
import { LEGAL, SUBPROCESSORS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Security",
  description: "How RE-IQ protects owners' and asset managers' data: what's in place today, what's on our roadmap, and who helps us run the service.",
};

/** Only what's live goes under "In place today". Roadmap items stay labeled until they ship. */
const LIVE = [
  { title: "Your data is kept separate", body: "Each customer's data is isolated in our database, so one organization can't see another's. Automated tests check this on every change we make." },
  { title: "Encrypted in transit and at rest", body: "Every connection uses HTTPS, and browsers are told to always use it (HSTS). Stored data is encrypted." },
  { title: "Careful sign-in", body: "New accounts confirm their email address. You can also sign in with Google or Microsoft. Repeated sign-in attempts are limited to slow down password guessing." },
  { title: "Errors monitored, without personal data", body: "We're alerted when something breaks. Before anything reaches our error monitoring, email addresses are removed and people appear only as an anonymous ID; IP addresses aren't stored." },
  { title: "Hosted in the United States", body: "The app, database and file storage run in the US." },
];

const ROADMAP = [
  "We won't keep residents' names or bank account numbers from uploaded reports.",
  "AI providers that don't train on customer data.",
  "Multi-factor sign-in.",
  "An independent security review.",
  "SOC 2.",
];

export default function SecurityPage() {
  return (
    <LegalPage
      eyebrow="Trust"
      title="Security"
      dateLabel="Last updated"
      intro={
        <p>
          You trust us with your properties&apos; financials. This page explains, in plain English, how we protect them today and what we&apos;re working on next. It describes
          only what is actually in place; everything else is labeled as roadmap.{" "}
          <Link href="/docs/security">Read the full security docs</Link>.
        </p>
      }
    >
      <Section title="In place today">
        <div className="grid gap-3 sm:grid-cols-2">
          {LIVE.map((item) => (
            <div key={item.title} className="rounded-lg border border-border bg-surface p-4">
              <h3 className="text-[14px] font-semibold text-fg">{item.title}</h3>
              <p className="mt-1.5 text-[13px] leading-[1.6] text-fg-2">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="On our roadmap">
        <p>
          <strong>Not yet live.</strong> These are planned, and we&apos;ll move each one up to &quot;In place today&quot; only once it&apos;s done.
        </p>
        <ul>
          {ROADMAP.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section id="subprocessors" title="Who helps us run RE-IQ">
        <p>These companies process data on our behalf to provide the service (our subprocessors). Each one only handles what its job needs.</p>
        <div className="overflow-x-auto rounded-lg border border-border">
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
                  <td className="px-3 py-2">{s.purpose}</td>
                  <td className="px-3 py-2">{s.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          How we handle personal information is in our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </Section>

      <Section title="Report a security issue">
        <p>
          If you think you&apos;ve found a security problem, email <a href={`mailto:${LEGAL.securityEmail}`}>{LEGAL.securityEmail}</a> with the details. Please don&apos;t
          test against other customers&apos; data or share the issue publicly until we&apos;ve fixed it. We&apos;ll acknowledge your report and keep you updated.
        </p>
      </Section>
    </LegalPage>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ForCounsel, LegalPage, Section } from "@/components/marketing/legal";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using RE-IQ, software for multifamily owners and asset managers.",
};

const mail = (address: string) => <a href={`mailto:${address}`}>{address}</a>;

export default function TermsPage() {
  return (
    <LegalPage
      draft
      eyebrow="Legal"
      title="Terms of Service"
      intro={
        <p>
          These terms are an agreement between {LEGAL.company}, {LEGAL.companyDescription} (&quot;RE-IQ&quot;, &quot;we&quot;), and the organization that uses RE-IQ
          (&quot;Customer&quot;, &quot;you&quot;). By creating an account or using the service, you agree to them on behalf of your organization, and you confirm you&apos;re
          authorized to do so.
        </p>
      }
    >
      <Section title="1. The service">
        <p>
          RE-IQ is software for multifamily owners and asset managers. You and the property managers you invite upload monthly property reports; RE-IQ standardizes, reconciles
          and analyzes them and shows the results. We may improve and change the service over time.
        </p>
        <ForCounsel>Confirm whether early-access and pilot use needs separate terms (for example a pilot agreement or order form that takes precedence).</ForCounsel>
      </Section>

      <Section title="2. Accounts">
        <ul>
          <li>Give accurate information when you create an account, and keep it up to date.</li>
          <li>Keep sign-in details private. You&apos;re responsible for activity under your organization&apos;s accounts, including property managers you invite.</li>
          <li>Tell us promptly at {mail(LEGAL.securityEmail)} if you think an account has been compromised.</li>
        </ul>
      </Section>

      <Section title="3. Your data">
        <p>
          <strong>You own your data.</strong> The reports and other information you or your property managers upload (&quot;Customer Data&quot;) remain yours. You give us
          permission to host, copy, process and display Customer Data only as needed to provide and support the service for you.
        </p>
        <p>
          <strong>Your right to upload.</strong> You confirm that you have the rights and permissions needed to upload Customer Data, including under your management agreements
          and any laws that apply to information about residents and employees in those reports, and that our processing it for you won&apos;t violate anyone&apos;s rights.
        </p>
        <p>
          We handle Customer Data as your service provider (processor). You decide what is uploaded and why. Our{" "}
          <Link href="/privacy#customer-data">Privacy Policy</Link> explains how we treat it, and our <Link href="/security">Security page</Link> lists the companies that help us
          run the service.
        </p>
        <ForCounsel>Add or reference a data processing agreement (DPA), and decide whether we may use de-identified, aggregated data to improve the service.</ForCounsel>
      </Section>

      <Section title="4. Acceptable use">
        <p>Don&apos;t, and don&apos;t let anyone else:</p>
        <ul>
          <li>Upload data you don&apos;t have the right to share, or anything unlawful or malicious, such as malware.</li>
          <li>Try to access another customer&apos;s data or any part of the service you aren&apos;t authorized to use.</li>
          <li>Probe, scan or test the service&apos;s security without our written permission. Report issues to {mail(LEGAL.securityEmail)} instead.</li>
          <li>Disrupt the service or place an unreasonable load on it, including by automated scraping.</li>
          <li>Copy, resell or reverse-engineer the service, or use it to build a competing product.</li>
        </ul>
      </Section>

      <Section title="5. Analysis and reports are informational">
        <p>
          RE-IQ&apos;s analysis, including summaries, flags and explanations generated with the help of AI, is for information only. It is <strong>not</strong> financial,
          investment, legal, tax or accounting advice, and it can be incomplete or wrong, especially when the source reports are.
        </p>
        <p>
          Reports and figures RE-IQ produces are <strong>unaudited</strong>. You&apos;re responsible for reviewing them and for any decisions you make. Review every report before
          you share it with investors, lenders or anyone else.
        </p>
      </Section>

      <Section title="6. Fees">
        <p>Fees, billing terms and payment schedules are set out in your order form or plan.</p>
        <ForCounsel>Complete: fees, billing cycle, taxes, late payment, renewals and price changes, refunds, and what applies during free pilots.</ForCounsel>
      </Section>

      <Section title="7. Confidentiality">
        <p>Each of us will keep the other&apos;s non-public information confidential and use it only to perform under these terms.</p>
        <ForCounsel>Complete the confidentiality terms (definitions, exceptions, duration).</ForCounsel>
      </Section>

      <Section title="8. Third-party services">
        <p>
          If you choose to sign in with Google or Microsoft, their terms also apply to that sign-in. We aren&apos;t responsible for third-party services we don&apos;t control.
        </p>
      </Section>

      <Section title="9. Suspension and termination">
        <p>
          You can stop using the service and close your account at any time. We may suspend or end access if you breach these terms, if your use puts the service or other
          customers at risk, or if required by law; where reasonable, we&apos;ll tell you first.
        </p>
        <p>
          When your account closes, you can ask us to export your Customer Data within a set period. After that, we delete Customer Data from the service, except where the law
          requires us to keep it, and it is removed from backups as they expire.
        </p>
        <ForCounsel>Set the export window and the deletion timeline after termination, and the backup retention period.</ForCounsel>
      </Section>

      <Section title="10. Disclaimers">
        <p>The service is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind, to the extent the law allows.</p>
        <ForCounsel>Complete the warranty disclaimer.</ForCounsel>
      </Section>

      <Section title="11. Limitation of liability">
        <p>To the extent the law allows, neither party is liable for indirect or consequential losses, and each party&apos;s total liability is capped.</p>
        <ForCounsel>Complete: excluded damages, the liability cap (for example fees paid in the prior 12 months), and carve-outs.</ForCounsel>
      </Section>

      <Section title="12. Indemnification">
        <p>You&apos;re responsible for claims arising from Customer Data you upload without the rights to do so, or from your breach of these terms.</p>
        <ForCounsel>Complete mutual or one-way indemnities and the claims procedure.</ForCounsel>
      </Section>

      <Section title="13. Governing law">
        <p>These terms are governed by the laws of the State of {LEGAL.governingLaw}, without regard to its conflict-of-laws rules.</p>
        <ForCounsel>Set the venue (courts in a Colorado county, or arbitration) and any jury-waiver or notice provisions.</ForCounsel>
      </Section>

      <Section title="14. Changes to these terms">
        <p>
          If we change these terms, we&apos;ll update the effective date above and, for significant changes, tell account holders by email or in the app before they take effect.
          Continuing to use the service after that means you accept the changes.
        </p>
      </Section>

      <Section title="15. Contact">
        <p>
          Questions about these terms: {mail(LEGAL.supportEmail)}.
          <br />
          {LEGAL.company}, {LEGAL.mailingAddress}
        </p>
      </Section>
    </LegalPage>
  );
}

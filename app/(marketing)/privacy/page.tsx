import type { Metadata } from "next";
import Link from "next/link";
import { ForCounsel, LegalPage, Section } from "@/components/marketing/legal";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How RE-IQ collects, uses and protects information about website visitors and app users, and how it handles customers' report data.",
};

const mail = (address: string) => <a href={`mailto:${address}`}>{address}</a>;

export default function PrivacyPage() {
  return (
    <LegalPage
      draft
      eyebrow="Legal"
      title="Privacy Policy"
      intro={
        <p>
          {LEGAL.company} (&quot;RE-IQ&quot;, &quot;we&quot;) makes software for multifamily owners and asset managers. Customers and their property managers upload monthly property
          reports, and we standardize, reconcile and analyze them. This policy explains what we collect about people who visit our website or use the RE-IQ app, why, and the
          choices you have.
        </p>
      }
    >
      <Section title="Who this policy covers">
        <p>This policy covers visitors to our website and people who sign in to the RE-IQ app: our customers&apos; staff and the property managers they invite.</p>
        <p>
          It doesn&apos;t govern the property reports and other data our customers upload. We handle that data on our customers&apos; behalf, under our agreement with them. See{" "}
          <a href="#customer-data">Customer report data</a> below.
        </p>
      </Section>

      <Section title="What we collect">
        <p>
          <strong>Account information.</strong> Your name, work email address, company name and password when you create an account. We store passwords only in a form that
          can&apos;t be read back. If you sign in with Google or Microsoft, we receive your name and email address from them, and nothing else.
        </p>
        <p>
          <strong>Sign-in information.</strong> Records that keep you signed in and protect your account: session details, when you signed in, and, for a short time, a
          scrambled form of your IP address and email address that we use to limit repeated sign-in attempts.
        </p>
        <p>
          <strong>Information needed to run the service.</strong> Technical records such as errors and how the app is performing, which we use to keep it working. We remove
          personal details, such as email addresses, from these records, and we don&apos;t store IP addresses with them.
        </p>
        <p>
          <strong>Early-access requests.</strong> If you ask for early access on our website, we keep the email address you give us and which form you used.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          We use only the cookies needed to sign you in and keep you signed in, and one that lets visitors try our demo. We don&apos;t use advertising cookies, and we don&apos;t
          track you across other websites. The demo keeps your changes in your own browser, not on our servers.
        </p>
      </Section>

      <Section title="How we use information">
        <ul>
          <li>To provide the RE-IQ app, including signing you in and showing you your organization&apos;s data.</li>
          <li>To keep the service secure, for example by limiting repeated sign-in attempts and investigating errors.</li>
          <li>To contact you about your account, the service, and early access you asked for.</li>
          <li>To meet legal obligations.</li>
        </ul>
        <p>We don&apos;t sell personal information, and we don&apos;t share it for advertising.</p>
      </Section>

      <Section id="customer-data" title="Customer report data">
        <p>
          The property reports our customers and their property managers upload, such as operating statements, rent rolls and aging reports, belong to the customer. The customer
          (the owner or sponsor) decides what is uploaded and why; we process it only to provide the service to them, under our customer agreement, and not for our own purposes.
        </p>
        <p>
          Customers confirm they have the right to upload what they upload. If you are a resident or employee named in a property&apos;s records and have a question about that
          data, please contact the property&apos;s owner or manager. If you contact us, we&apos;ll pass your request to them.
        </p>
        <p>We don&apos;t sell customer data.</p>
        <ForCounsel>Confirm this section matches the customer agreement and data processing terms once they&apos;re drafted.</ForCounsel>
      </Section>

      <Section title="Who we share information with">
        <p>
          We share information only with companies that help us run the service (our subprocessors, listed on our <Link href="/security#subprocessors">Security page</Link>), when
          the law requires it, or as part of a merger, acquisition or sale of our business, in which case this policy continues to apply to the information transferred.
        </p>
      </Section>

      <Section title="How long we keep information">
        <ul>
          <li>Account information: for as long as your account is open, and for a limited period after it closes.</li>
          <li>Records used to limit sign-in attempts: deleted after about a day.</li>
          <li>Early-access requests: until you ask us to remove them.</li>
          <li>Customer report data: as set out in our agreement with the customer.</li>
        </ul>
        <ForCounsel>Set the retention period for closed accounts, and for error and technical records.</ForCounsel>
      </Section>

      <Section title="Your choices and rights">
        <p>
          You can ask to see, correct or delete the personal information we hold about you by emailing {mail(LEGAL.privacyEmail)}. We&apos;ll confirm your identity before acting
          on the request. If your account belongs to a customer organization, some requests may need that organization&apos;s approval.
        </p>
        <ForCounsel>Add any rights under state privacy laws that apply to us (for example California and Colorado), and how to appeal a decision.</ForCounsel>
      </Section>

      <Section title="Security">
        <p>
          We protect information with measures including encryption in transit and at rest, separation of each customer&apos;s data, and limits on repeated sign-in attempts. No
          system is perfectly secure, but we work to keep yours safe. Our <Link href="/security">Security page</Link> describes what&apos;s in place.
        </p>
      </Section>

      <Section title="Where information is stored">
        <p>We store information in the United States.</p>
      </Section>

      <Section title="Children">
        <p>RE-IQ is a business service and isn&apos;t intended for children. We don&apos;t knowingly collect information from anyone under 16.</p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If we change this policy, we&apos;ll update the effective date above. If a change is significant, we&apos;ll tell account holders by email or in the app before it takes
          effect.
        </p>
      </Section>

      <Section title="Contact us">
        <p>
          Questions about this policy or your information: {mail(LEGAL.privacyEmail)}.
          <br />
          {LEGAL.company}, {LEGAL.mailingAddress}
        </p>
      </Section>
    </LegalPage>
  );
}

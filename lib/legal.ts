/**
 * Facts and placeholders for /privacy, /terms and /security, in one place.
 * Fill the {{…}} values before launch; flip LEGAL_DRAFT to false once counsel signs off on the
 * Privacy Policy and Terms (it hides the draft banner and the notes for counsel).
 */
export const LEGAL_DRAFT = true;

export const LEGAL = {
  company: "RE-IQ LLC",
  companyDescription: "a Colorado limited liability company",
  governingLaw: "Colorado",
  effectiveDate: "{{EFFECTIVE_DATE}}",
  privacyEmail: "{{PRIVACY_EMAIL}}",
  securityEmail: "{{SECURITY_EMAIL}}",
  supportEmail: "{{SUPPORT_EMAIL}}",
  mailingAddress: "{{MAILING_ADDRESS}}",
};

/** Companies that process data on our behalf. Shown on /security; /privacy links to it. */
export const SUBPROCESSORS: { name: string; purpose: string; location: string }[] = [
  { name: "Vercel", purpose: "Hosts the website and the app", location: "United States" },
  { name: "Supabase", purpose: "Database, sign-in and file storage", location: "United States (West US, Oregon)" },
  { name: "Sentry", purpose: "Error monitoring, with personal data removed and IP addresses not stored", location: "United States" },
  { name: "Resend", purpose: "Sign-in and account emails", location: "United States" },
  { name: "Anthropic", purpose: "Reads uploaded spreadsheet reports (Claude), with resident names and bank account numbers removed first; doesn't train on our data", location: "United States and other countries" },
  { name: "Google", purpose: "Sign-in with Google, only if you choose it", location: "United States and other countries" },
  { name: "Microsoft", purpose: "Sign-in with Microsoft, only if you choose it", location: "United States and other countries" },
];

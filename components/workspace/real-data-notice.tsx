import { PageBody, PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";

/** Shown to demo sessions on screens that only work with a real workspace. No data is loaded. */
export function RealDataNotice({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <PageBody>
        <EmptyState title="Available in your own workspace" description="This screen uses your organization's real properties and reports. Sign in with your account to use it; the demo uses sample data." />
      </PageBody>
    </>
  );
}

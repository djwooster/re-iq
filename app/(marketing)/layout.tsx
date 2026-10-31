import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { ForceLight } from "@/components/theme/theme-provider";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <ForceLight />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

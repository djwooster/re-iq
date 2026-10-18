import type { Metadata } from "next";
import { NotBuilt } from "@/components/shell/not-built";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <NotBuilt title="Settings" subtitle="Appearance, organization, and team" description="Light, dark, or system appearance; organization name and logo; and team members with invites." />;
}

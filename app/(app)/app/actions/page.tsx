import type { Metadata } from "next";
import { NotBuilt } from "@/components/shell/not-built";

export const metadata: Metadata = { title: "Actions" };

export default function ActionsPage() {
  return (
    <NotBuilt
      title="Actions"
      subtitle="Recommendations to accept, assign, dismiss, or mark done"
      description="An inbox of every recommended action with status, estimated impact, property, and assignee. You can already accept or dismiss actions from any insight on the Overview."
    />
  );
}

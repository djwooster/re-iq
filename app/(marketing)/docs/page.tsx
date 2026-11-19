import { redirect } from "next/navigation";

/** One doc so far. */
export default function DocsIndex() {
  redirect("/docs/security");
}

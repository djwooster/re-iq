import type { Metadata } from "next";
import { CloseView } from "@/components/close/close-view";

export const metadata: Metadata = { title: "Close" };

export default function ClosePage() {
  return <CloseView />;
}

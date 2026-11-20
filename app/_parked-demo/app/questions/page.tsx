import type { Metadata } from "next";
import { QuestionsView } from "@/components/questions/questions-view";

export const metadata: Metadata = { title: "Questions for managers" };

export default function QuestionsPage() {
  return <QuestionsView />;
}

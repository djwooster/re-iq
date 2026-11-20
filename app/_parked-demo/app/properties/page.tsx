import type { Metadata } from "next";
import { PropertiesView } from "@/components/properties/properties-view";

export const metadata: Metadata = { title: "Properties" };

export default function PropertiesPage() {
  return <PropertiesView />;
}

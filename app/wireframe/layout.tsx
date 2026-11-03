import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Wireframe", template: "%s · Wireframe" } };

export default function WireframeLayout({ children }: { children: React.ReactNode }) {
  return children;
}

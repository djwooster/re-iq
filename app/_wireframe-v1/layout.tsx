import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Wireframe", template: "%s · Wireframe" } };

/** The wireframe's one accent: Apple's system blue, for every action. Defined once here. */
const ACCENT = { "--wf-accent": "#0071e3" } as React.CSSProperties;

export default function WireframeLayout({ children }: { children: React.ReactNode }) {
  return <div style={ACCENT}>{children}</div>;
}

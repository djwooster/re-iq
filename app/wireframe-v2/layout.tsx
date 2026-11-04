import { ToastProvider } from "@/components/ui/toast";
import { WfStore } from "@/components/wireframe-v2/store";

const ACCENT = { "--wf-accent": "#0071e3" } as React.CSSProperties;

/** State lives here so it carries from login through every screen; a reload resets it. */
export default function WireframeV2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={ACCENT}>
      <WfStore>
        <ToastProvider>{children}</ToastProvider>
      </WfStore>
    </div>
  );
}

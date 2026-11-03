import { ToastProvider } from "@/components/ui/toast";
import { WireframeShell } from "@/components/wireframe/shell";

export default function WireframeShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <WireframeShell>{children}</WireframeShell>
    </ToastProvider>
  );
}

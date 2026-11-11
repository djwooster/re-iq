import { ToastProvider } from "@/components/ui/toast";
import { WfStore } from "@/components/prototype/store";

/** State lives here so it carries from sign-in and setup through every screen. */
export default function PrototypeLayout({ children }: { children: React.ReactNode }) {
  return (
    <WfStore>
      <ToastProvider>{children}</ToastProvider>
    </WfStore>
  );
}

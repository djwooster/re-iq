"use client";

import { Upload } from "lucide-react";
import { createContext, useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay";
import { UploadFlow } from "./upload-flow";

const UploadContext = createContext<() => void>(() => {});

/** Lets any component on the page open the shared upload modal. */
export const useOpenUpload = () => useContext(UploadContext);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <UploadContext.Provider value={() => setOpen(true)}>
      {children}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        width={720}
        title="Upload reports"
        description="We detect the report type, property, and period, then map line items to your chart. You confirm anything we're unsure about."
      >
        <div className="max-h-[64vh] overflow-y-auto">
          <UploadFlow compact />
        </div>
      </Modal>
    </UploadContext.Provider>
  );
}

export function UploadReportButton({ variant = "primary" }: { variant?: "primary" | "secondary" }) {
  const open = useOpenUpload();
  return (
    <Button variant={variant} icon={<Upload className="size-3" />} onClick={open}>
      Upload report
    </Button>
  );
}

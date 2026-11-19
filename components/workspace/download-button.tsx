"use client";

import { Download } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { downloadUrl } from "@/lib/uploads/actions";

/** Fetches a 60-second signed link and starts the download. */
export function DownloadButton({ uploadId }: { uploadId: string }) {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  return (
    <Button
      type="button"
      size="xs"
      variant="ghost"
      loading={pending}
      icon={<Download className="size-3" />}
      onClick={() =>
        start(async () => {
          const res = await downloadUrl(uploadId);
          if (!res.ok) return setFailed(true);
          setFailed(false);
          window.location.assign(res.url);
        })
      }
    >
      {failed ? "Unavailable" : "Download"}
    </Button>
  );
}

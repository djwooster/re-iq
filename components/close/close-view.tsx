"use client";

import { ArrowRight, Check, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { UploadReportButton } from "@/components/data-sources/upload-button";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/empty-state";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { Table, Td, Th, THead } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatDate, formatMonth } from "@/lib/dates";
import { type CloseStatus, type ReportSlot, REQUIRED_REPORTS, getCloseStatus, markReminderSent, reminderEmail } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { pluralize } from "@/lib/format";
import { REPORT_TYPE_LABELS, REPORT_TYPE_SHORT } from "@/lib/labels";

export function CloseView() {
  const { orgId } = useApp();
  const { data: close } = useData(() => getCloseStatus(orgId), [orgId]);
  const monthName = close ? formatMonth(close.month, "long").split(" ")[0] : "";

  return (
    <>
      <PageHeader
        title={close ? `${monthName} close` : "Close"}
        subtitle={close ? `Reports were due ${formatDate(close.due_date)} · ${close.ready_count} of ${close.properties.length} properties ready` : " "}
        actions={<UploadReportButton />}
      />
      <PageBody>
        <div className="flex flex-col gap-3">
          <FadeIn>{close ? <CloseCounts close={close} /> : <Skeleton className="h-[86px] w-full rounded-lg" />}</FadeIn>
          <FadeIn delay={0.05}>{close ? <ManagerReminders close={close} /> : <Skeleton className="h-40 w-full rounded-lg" />}</FadeIn>
          <FadeIn delay={0.1}>{close ? <ReportChecklist close={close} /> : <Skeleton className="h-96 w-full rounded-lg" />}</FadeIn>
        </div>
      </PageBody>
    </>
  );
}

function CloseCounts({ close }: { close: CloseStatus }) {
  const cells = [
    { label: "Ready to report", value: `${close.ready_count} of ${close.properties.length}`, detail: "Every required report received and mapped" },
    { label: "Needs your review", value: String(close.review_count), detail: "Uploads with mappings to confirm", tone: close.review_count ? "text-warning" : undefined },
    { label: "Owed by managers", value: String(close.outstanding_count), detail: "Missing or unreadable reports", tone: close.outstanding_count ? "text-warning" : undefined },
  ];
  return (
    <Card className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {cells.map((c) => (
        <div key={c.label} className="px-4 py-3">
          <div className="eyebrow">{c.label}</div>
          <div className={cn("num mt-1 text-xl leading-7 font-medium text-fg", c.tone)}>{c.value}</div>
          <div className="mt-0.5 text-[11px] text-fg-3">{c.detail}</div>
        </div>
      ))}
    </Card>
  );
}

function ManagerReminders({ close }: { close: CloseStatus }) {
  const toast = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const owing = close.managers.filter((m) => m.outstanding.length > 0);
  const allIn = close.managers.filter((m) => m.outstanding.length === 0);

  const copy = async (managerId: string) => {
    const email = reminderEmail(close, managerId);
    if (!email) return;
    try {
      await navigator.clipboard.writeText(`To: ${email.to}\nSubject: ${email.subject}\n\n${email.body}`);
    } catch {
      // Clipboard can be blocked; the reminder is still logged.
    }
    await markReminderSent(managerId, close.month);
    setCopied(managerId);
    toast("Reminder copied", { detail: `Paste it into an email to ${email.to}. RE-IQ doesn't send email yet.` });
  };

  return (
    <Card>
      <CardHeader title="What managers still owe" description="Draft a reminder for each property manager with outstanding reports" />
      {owing.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-fg-2">Every manager has sent their reports.</p>
      ) : (
        <Stagger as="ul" className="border-t border-border">
          {owing.map((m, i) => {
            const email = reminderEmail(close, m.manager.id)!;
            return (
              <StaggerItem as="li" key={m.manager.id} className={cn("grid gap-3 px-4 py-3 md:grid-cols-[220px_minmax(0,1fr)_auto]", i > 0 && "border-t border-border/70")}>
                <div>
                  <div className="text-xs font-medium text-fg">{m.manager.name}</div>
                  <div className="text-[11px] text-fg-3">{m.manager.contact_name}</div>
                </div>
                <ul className="flex flex-col gap-1 text-xs text-fg-2">
                  {m.outstanding.map((o) => (
                    <li key={`${o.property.id}:${o.report_type}`} className="flex flex-wrap items-center gap-2">
                      <span>
                        {o.property.name} · {REPORT_TYPE_LABELS[o.report_type]}
                      </span>
                      {o.state === "failed" ? <Badge tone="unfavorable">Unreadable</Badge> : <Badge tone="warning">Missing</Badge>}
                    </li>
                  ))}
                  <li className="mt-1 text-[11px] text-fg-3">Subject: {email.subject}</li>
                </ul>
                <div className="flex items-start gap-2 md:justify-end">
                  {m.reminder_sent_at && <span className="num pt-1.5 text-[11px] text-fg-3">Copied {formatDate(m.reminder_sent_at.slice(0, 10))}</span>}
                  <Button size="xs" icon={copied === m.manager.id ? <Check className="size-3" /> : <Copy className="size-3" />} onClick={() => copy(m.manager.id)}>
                    {m.reminder_sent_at ? "Copy again" : "Copy reminder"}
                  </Button>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
      {allIn.length > 0 && <CardFooter>All reports in from {allIn.map((m) => m.manager.name).join(", ")}.</CardFooter>}
    </Card>
  );
}

function ReportChecklist({ close }: { close: CloseStatus }) {
  const rows = [...close.properties].sort(
    (a, b) => Number(a.ready) - Number(b.ready) || a.property.property_manager.name.localeCompare(b.property.property_manager.name) || a.property.name.localeCompare(b.property.name),
  );
  return (
    <Card>
      <CardHeader title="Reports by property" description={`${pluralize(REQUIRED_REPORTS.length, "report")} per property each month, due ${formatDate(close.due_date)}`} />
      <Table>
        <THead>
          <Th>Property</Th>
          <Th>Manager</Th>
          {REQUIRED_REPORTS.map((t) => (
            <Th key={t}>{REPORT_TYPE_SHORT[t]}</Th>
          ))}
          <Th align="right">Status</Th>
        </THead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.property.id} className="border-b border-border/70 last:border-b-0">
              <Td>
                <Link href={`/app/properties/${p.property.id}`} className="text-fg hover:underline">
                  {p.property.name}
                </Link>
              </Td>
              <Td className="text-fg-3">{p.property.property_manager.name}</Td>
              {p.reports.map((r) => (
                <Td key={r.report_type}>
                  <SlotCell slot={r} />
                </Td>
              ))}
              <Td align="right">{p.ready ? <Badge tone="favorable">Ready</Badge> : <Badge tone="warning">Blocked</Badge>}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <CardFooter className="flex flex-wrap items-center justify-between gap-2">
        <span>Questions for managers are drafted as each property&apos;s T12 posts.</span>
        <Link href="/app/questions" className="inline-flex items-center gap-1 text-fg-2 hover:text-fg">
          Next: questions for managers <ArrowRight className="size-3" />
        </Link>
      </CardFooter>
    </Card>
  );
}

function SlotCell({ slot }: { slot: ReportSlot }) {
  if (slot.state === "received") {
    const late = slot.days_late > 0;
    return (
      <span className="inline-flex items-center gap-1.5 text-fg-2">
        <Check className="size-3 text-favorable" strokeWidth={2} />
        <span className="num">{formatDate(slot.import!.uploaded_at.slice(0, 10))}</span>
        {late && <span className="num text-[11px] text-warning">{slot.days_late}d late</span>}
      </span>
    );
  }
  if (slot.state === "needs_review") {
    return (
      <Link href={`/app/data-sources?import=${slot.import!.id}`} className="inline-flex">
        <Badge tone="warning">Review mappings</Badge>
      </Link>
    );
  }
  if (slot.state === "failed") {
    return (
      <Link href={`/app/data-sources?import=${slot.import!.id}`} className="inline-flex">
        <Badge tone="unfavorable">Unreadable</Badge>
      </Link>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge tone="warning">Missing</Badge>
      {slot.days_late > 0 && <span className="num text-[11px] text-fg-3">{slot.days_late}d overdue</span>}
    </span>
  );
}

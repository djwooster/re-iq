"use client";

import { ArrowRight, Copy, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/shell/app-context";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Field, Tabs, Textarea } from "@/components/ui/controls";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { Modal } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { LATEST_MONTH, compareMonths, formatDate, formatMonth, monthOf } from "@/lib/dates";
import { QUESTION_THRESHOLD, getCurrentMember, getOrganization, listProperties, listQuestions, markQuestionsSent, recordAnswer, setQuestionStatus } from "@/lib/data";
import { useData } from "@/lib/hooks/use-data";
import { formatCurrency, formatCurrencyShort, joinList } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/labels";
import type { PropertyManager, PropertyRecord, QuestionStatus, VarianceQuestion } from "@/lib/types";

const TABS: { id: QuestionStatus; label: string; empty: string }[] = [
  { id: "draft", label: "To send", empty: "Every drafted question has gone out." },
  { id: "sent", label: "Awaiting reply", empty: "No questions waiting on a manager." },
  { id: "answered", label: "To review", empty: "No answers waiting on you." },
  { id: "accepted", label: "Accepted", empty: "Accepted explanations go into the owner report." },
];

export function QuestionsView() {
  const { orgId } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState<QuestionStatus>("draft");
  const [recording, setRecording] = useState<VarianceQuestion | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const { data } = useData(async () => {
    const [questions, properties, me, org] = await Promise.all([listQuestions(orgId), listProperties(orgId), getCurrentMember(), getOrganization(orgId)]);
    return { questions, properties: properties.map((p) => p.property), me, org };
  }, [orgId]);

  const questions = data?.questions ?? [];
  const count = (s: QuestionStatus) => questions.filter((q) => q.status === s).length;
  const visible = questions.filter((q) => q.status === tab);
  const property = (id: string) => data?.properties.find((p) => p.id === id);
  const lagging = data?.properties.filter((p) => compareMonths(monthOf(p.data_through), LATEST_MONTH) < 0) ?? [];
  const monthName = formatMonth(LATEST_MONTH, "long").split(" ")[0];

  // Drafts are sent one email per manager.
  const byManager = new Map<string, { manager: PropertyManager; items: VarianceQuestion[] }>();
  for (const q of visible) {
    const m = property(q.property_id)!.property_manager;
    byManager.set(m.id, { manager: m, items: [...(byManager.get(m.id)?.items ?? []), q] });
  }

  const copyAndSend = async (manager: PropertyManager, items: VarianceQuestion[]) => {
    setPending(manager.id);
    const body = [
      `Hi ${manager.contact_name.split(" ")[0]},`,
      "",
      `A few questions on ${monthName} before we send the owner report:`,
      "",
      ...items.map((q, i) => `${i + 1}. ${property(q.property_id)!.name}, ${CATEGORY_LABELS[q.category]}: ${q.question}`),
      "",
      "Thanks,",
      data?.me?.name ?? "",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(`To: ${manager.contact_email}\nSubject: ${monthName} variance questions · ${data?.org?.name ?? ""}\n\n${body}`);
    } catch {
      // Clipboard can be blocked; the questions are still marked sent.
    }
    await markQuestionsSent(items.map((q) => q.id));
    setPending(null);
    toast(`${items.length} ${items.length === 1 ? "question" : "questions"} copied for ${manager.name}`, { detail: `Paste into an email to ${manager.contact_email}. RE-IQ doesn't send email yet.` });
  };

  const setStatus = async (q: VarianceQuestion, status: "accepted" | "sent") => {
    setPending(q.id);
    await setQuestionStatus(q.id, status);
    setPending(null);
    toast(status === "accepted" ? "Explanation accepted" : "Moved back to awaiting reply", {
      detail: status === "accepted" ? "It appears next to this line in the owner report." : "Follow up with the manager for a fuller answer.",
    });
  };

  return (
    <>
      <PageHeader
        title="Questions for managers"
        subtitle={
          data
            ? `${monthName} lines more than ${formatCurrencyShort(QUESTION_THRESHOLD.dollars)} and ${Math.round(QUESTION_THRESHOLD.percent * 100)}% worse than budget · ${questions.length} questions, ${count("accepted")} accepted`
            : " "
        }
      />
      <PageBody>
        <div className="flex flex-col gap-3">
          <Tabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ id: t.id, label: t.label, count: count(t.id) }))} />
          {!data ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : visible.length === 0 ? (
            <Card>
              <EmptyState icon={<MessageSquareText className="size-3.5" strokeWidth={1.75} />} title="Nothing here" description={TABS.find((t) => t.id === tab)!.empty} />
            </Card>
          ) : (
            <FadeIn className="flex flex-col gap-3">
              {[...byManager.values()].map(({ manager, items }) => (
                <Card key={manager.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                    <div>
                      <h2 className="text-[13px] font-semibold text-fg">{manager.name}</h2>
                      <p className="text-[11px] text-fg-3">
                        {manager.contact_name} · {manager.contact_email}
                      </p>
                    </div>
                    {tab === "draft" && (
                      <Button size="xs" variant="primary" icon={<Copy className="size-3" />} loading={pending === manager.id} onClick={() => copyAndSend(manager, items)}>
                        Copy {items.length === 1 ? "question" : `${items.length} questions`} and mark sent
                      </Button>
                    )}
                  </div>
                  <Stagger as="ul">
                    {items.map((q, i) => (
                      <StaggerItem as="li" key={q.id} className={cn("px-4 py-3", i > 0 && "border-t border-border/70")}>
                        <QuestionRow
                          q={q}
                          property={property(q.property_id)!}
                          pending={pending === q.id}
                          onRecord={() => setRecording(q)}
                          onAccept={() => setStatus(q, "accepted")}
                          onReopen={() => setStatus(q, "sent")}
                        />
                      </StaggerItem>
                    ))}
                  </Stagger>
                </Card>
              ))}
            </FadeIn>
          )}
          {data && (
            <Card>
              <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t-0">
                <span>
                  {lagging.length
                    ? `${joinList(lagging.map((p) => p.name))} get questions once ${lagging.length === 1 ? "its" : "their"} ${monthName} T12 posts.`
                    : `Every property's ${monthName} T12 has posted.`}
                </span>
                <Link href="/app/reports" className="inline-flex items-center gap-1 text-fg-2 hover:text-fg">
                  Next: owner report <ArrowRight className="size-3" />
                </Link>
              </CardFooter>
            </Card>
          )}
        </div>
      </PageBody>
      <RecordAnswer
        question={recording}
        property={recording ? property(recording.property_id) : undefined}
        onClose={() => setRecording(null)}
        onSave={async (text) => {
          const q = recording!;
          const m = property(q.property_id)!.property_manager;
          await recordAnswer(q.id, text, `${m.contact_name}, ${m.name}`);
          setRecording(null);
          toast("Reply recorded", { detail: "Review it under To review, then accept it for the owner report." });
        }}
      />
    </>
  );
}

function QuestionRow({
  q,
  property,
  pending,
  onRecord,
  onAccept,
  onReopen,
}: {
  q: VarianceQuestion;
  property: PropertyRecord;
  pending: boolean;
  onRecord: () => void;
  onAccept: () => void;
  onReopen: () => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[200px_minmax(0,1fr)]">
      <div>
        <Link href={`/app/properties/${property.id}`} className="text-xs font-medium text-fg hover:underline">
          {property.name}
        </Link>
        <div className="mt-0.5 text-[11px] text-fg-3">{CATEGORY_LABELS[q.category]}</div>
        <div className="num mt-1 text-xs text-unfavorable">{formatCurrency(q.variance)}</div>
      </div>
      <div className="min-w-0">
        <p className="text-xs leading-relaxed text-fg-2">{q.question}</p>
        {q.answer && (
          <blockquote className="mt-2 rounded-md border border-border bg-bg px-3 py-2">
            <p className="text-xs leading-relaxed text-fg">{q.answer}</p>
            <footer className="mt-1.5 text-[11px] text-fg-3">
              {q.answered_by} · <span className="num">{formatDate(q.answered_at!.slice(0, 10))}</span>
            </footer>
          </blockquote>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {q.status === "sent" && (
            <>
              <span className="num text-[11px] text-fg-3">Sent {formatDate(q.sent_at!.slice(0, 10))} · awaiting reply</span>
              <Button size="xs" onClick={onRecord}>
                Record reply
              </Button>
            </>
          )}
          {q.status === "answered" && (
            <>
              <Button size="xs" variant="primary" loading={pending} onClick={onAccept}>
                Accept explanation
              </Button>
              <Button size="xs" variant="ghost" loading={pending} onClick={onReopen}>
                Ask again
              </Button>
            </>
          )}
          {q.status === "accepted" && <Badge tone="favorable">In the owner report</Badge>}
        </div>
      </div>
    </div>
  );
}

function RecordAnswer({
  question,
  property,
  onClose,
  onSave,
}: {
  question: VarianceQuestion | null;
  property?: PropertyRecord;
  onClose: () => void;
  onSave: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const close = () => {
    setText("");
    onClose();
  };
  return (
    <Modal
      open={Boolean(question)}
      onClose={close}
      title="Record the manager's reply"
      description={question && property ? `${property.name} · ${CATEGORY_LABELS[question.category]} · ${formatCurrency(question.variance)}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!text.trim()}
            loading={saving}
            onClick={async () => {
              setSaving(true);
              await onSave(text.trim());
              setSaving(false);
              setText("");
            }}
          >
            Save reply
          </Button>
        </>
      }
    >
      <Field label={`Reply from ${property?.property_manager.contact_name ?? "the manager"}`} hint="Paste the relevant part of their email.">
        {(id) => <Textarea id={id} value={text} onChange={(e) => setText(e.target.value)} />}
      </Field>
    </Modal>
  );
}

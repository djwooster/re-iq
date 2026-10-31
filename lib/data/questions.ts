import { LATEST_MONTH, TODAY, compareMonths, formatMonth, monthOf } from "@/lib/dates";
import { formatCurrency, formatPercent } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/labels";
import type { GlCategory, MonthKey, VarianceQuestion } from "@/lib/types";
import { categoryVariance, delay, propertyRecords, sumFinancials } from "./core";
import { ORG_ID } from "./mock/catalog";
import { readOverlay, writeOverlay } from "./store";

/**
 * Variance questions: for every line that misses budget by more than the
 * threshold in the month being closed, RE-IQ drafts the question an asset
 * manager would email the property manager. Answers are recorded here and
 * carried into the owner report next to the number they explain.
 */

/** A line gets a question when it is unfavorable by at least both amounts. A future org setting. */
export const QUESTION_THRESHOLD = { dollars: 3_000, percent: 0.1 };

/** Lines property managers can explain. Taxes, insurance, and fees are set elsewhere. */
const ASKABLE: GlCategory[] = [
  "vacancy_loss",
  "concessions",
  "bad_debt",
  "other_income",
  "loss_to_lease",
  "payroll",
  "repairs_maintenance",
  "turnover",
  "utilities",
  "contract_services",
  "marketing",
  "administrative",
];

const ASK: Partial<Record<GlCategory, string>> = {
  vacancy_loss: "What is the leasing plan for the next 60 days, and how many move-ins are scheduled?",
  concessions: "What concession policy is in place now, and when do you expect to step it down?",
  loss_to_lease: "How are renewals being priced against market, and which below-market leases expire in the next 90 days?",
  bad_debt: "How many accounts are more than 60 days past due, and what is the plan for each?",
  payroll: "Which positions are open or covered by contract labor, and when does that end?",
  repairs_maintenance: "What drove it, and how much of it is one-time versus ongoing?",
  turnover: "How many turns were completed, and what was the average cost per turn?",
  utilities: "Is this usage, rates, or a billing issue? Please send the bills by meter.",
  contract_services: "Which contracts changed, and were they rebid?",
};

function questionText(category: GlCategory, actual: number, budget: number, variance: number, month: MonthKey) {
  const label = CATEGORY_LABELS[category];
  const over = Math.abs(variance);
  const ratio = budget ? Math.abs(variance / budget) : 0;
  const lead = ["vacancy_loss", "concessions", "bad_debt", "loss_to_lease"].includes(category)
    ? `${label} cost ${formatCurrency(over)} more than budget in ${formatMonth(month, "long").split(" ")[0]} (${formatCurrency(Math.abs(actual))} against ${formatCurrency(Math.abs(budget))}).`
    : category === "other_income"
      ? `${label} came in ${formatCurrency(over)} under budget in ${formatMonth(month, "long").split(" ")[0]} (${formatPercent(ratio)} below plan).`
      : `${label} ran ${formatCurrency(over)} over budget in ${formatMonth(month, "long").split(" ")[0]} (${formatPercent(ratio)} above plan).`;
  return `${lead} ${ASK[category] ?? "What drove the variance, and do you expect it to continue?"}`;
}

type Seeded = Pick<VarianceQuestion, "status" | "sent_at" | "answer" | "answered_by" | "answered_at">;

/** Where the September conversations stand on the demo clock. */
const SEEDED: Record<string, Seeded> = {
  "prop_mesa:repairs_maintenance": {
    status: "answered",
    sent_at: "2026-10-13T15:10:00Z",
    answer:
      "Six of the original 1986 condensers keep failing and Coolflow has been patching them since May. We'd rather replace them than keep repairing; bids from Coolflow and one other contractor are due Oct 28. About $9K of September is the emergency calls on units 112 and 214.",
    answered_by: "Kara Lindqvist, Summit Living",
    answered_at: "2026-10-15T19:42:00Z",
  },
  "prop_willow:payroll": {
    status: "accepted",
    sent_at: "2026-10-09T14:02:00Z",
    answer:
      "Both maintenance tech roles are filled. The first started Oct 6, the second starts Oct 20. StaffBridge rolls off at the end of October, so November payroll should be back near budget.",
    answered_by: "Luis Ortega, Harbor Property Group",
    answered_at: "2026-10-10T16:25:00Z",
  },
  "prop_lakeline:concessions": {
    status: "answered",
    sent_at: "2026-10-09T14:02:00Z",
    answer:
      "Two lease-ups within a mile are offering eight weeks free. We matched at six weeks on 12-month leases to protect occupancy. Agreed on a four-week cap starting Nov 1; we'll send weekly traffic and conversion so we can see whether it costs us leases.",
    answered_by: "Luis Ortega, Harbor Property Group",
    answered_at: "2026-10-11T13:30:00Z",
  },
  "prop_lakeline:vacancy_loss": {
    status: "sent",
    sent_at: "2026-10-09T14:02:00Z",
    answer: null,
    answered_by: null,
    answered_at: null,
  },
  "prop_peachtree:utilities": {
    status: "sent",
    sent_at: "2026-10-14T16:48:00Z",
    answer: null,
    answered_by: null,
    answered_at: null,
  },
};

function computeQuestions(month: MonthKey): VarianceQuestion[] {
  const overlay = readOverlay();
  const out: VarianceQuestion[] = [];
  for (const property of propertyRecords()) {
    // Months that have not posted yet get their questions once the T12 arrives.
    if (compareMonths(monthOf(property.data_through), month) < 0) continue;
    const f = sumFinancials(property.id, [month], "mtd");
    for (const category of ASKABLE) {
      const variance = categoryVariance(f, category);
      const { actual, budget } = f.byCategory[category];
      const unfavorable = -variance;
      if (unfavorable < QUESTION_THRESHOLD.dollars) continue;
      if (budget && unfavorable / Math.abs(budget) < QUESTION_THRESHOLD.percent) continue;
      const key = `${property.id}:${category}`;
      const id = `q_${property.id.slice(5)}_${category}_${month.replace("-", "")}`;
      const seeded = month === LATEST_MONTH ? SEEDED[key] : undefined;
      out.push({
        id,
        org_id: ORG_ID,
        property_id: property.id,
        month,
        category,
        actual,
        budget,
        variance,
        question: questionText(category, actual, budget, variance, month),
        status: "draft",
        sent_at: null,
        answer: null,
        answered_by: null,
        answered_at: null,
        ...seeded,
        ...overlay.questionPatches[id],
      });
    }
  }
  return out.sort((a, b) => a.variance - b.variance);
}

export async function listQuestions(orgId: string, month: MonthKey = LATEST_MONTH): Promise<VarianceQuestion[]> {
  await delay();
  return computeQuestions(month).filter((q) => q.org_id === orgId);
}

const now = () => `${TODAY}T${new Date().toISOString().slice(11, 19)}Z`;

export async function markQuestionsSent(ids: string[]): Promise<void> {
  await delay(200);
  const at = now();
  writeOverlay((d) => {
    for (const id of ids) d.questionPatches[id] = { ...d.questionPatches[id], status: "sent", sent_at: at };
  });
}

export async function recordAnswer(id: string, answer: string, answeredBy: string): Promise<void> {
  await delay(200);
  writeOverlay((d) => {
    d.questionPatches[id] = { ...d.questionPatches[id], status: "answered", answer, answered_by: answeredBy, answered_at: now() };
  });
}

/** Accepting puts the explanation in the owner report; reopening sends it back for a better answer. */
export async function setQuestionStatus(id: string, status: "accepted" | "sent"): Promise<void> {
  await delay(200);
  writeOverlay((d) => {
    d.questionPatches[id] = { ...d.questionPatches[id], status };
  });
}

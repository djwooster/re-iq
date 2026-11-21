import type Anthropic from "@anthropic-ai/sdk";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import type { Layout } from "@/lib/reading/layout";
import { readReport } from "@/lib/reading/read";

/**
 * Resident names, contact details and bank account numbers never leave the file: not in what's
 * sent to Claude, and not in the read result (saved as-is to report_reads.result).
 */

const NAMES = ["Jordan Avery", "Priya Natarajan"];
const PHONE = "5552013344";
const BANK = "000123456789";
const ROUTING = "021000021";

function rentRoll(): Uint8Array {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Cedar Ridge Apartments"],
    ["Rent Roll", "As of 10/31/2026"],
    [],
    ["Unit", "Resident", "Phone", "Bank Account", "Market Rent", "Resident Deposit", "Notes"],
    ["0111", NAMES[0], PHONE, BANK, 1690, 500, `Autopay from acct ${BANK}, routing ${ROUTING}`],
    ["0112", NAMES[1], "(555) 201-7788", "", 1465, "500.00", "Paid by money order"],
    ["Total", "", "", "", 3155, 1000, ""],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rent Roll");
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
}

/** Claude stand-in: records what it was sent and points the label column at the residents. */
function fakeClaude(sent: string[]): Anthropic {
  const layout: Layout = {
    report_type: "other",
    property_name: "Cedar Ridge Apartments",
    period: "2026-10",
    sheet: "Rent Roll",
    scale: "units",
    label_column: "B",
    columns: [{ column: "E", meaning: "actual", period: "2026-10" }],
    lines: [5, 6].map((row) => ({ row, kind: "line", section: "income", account: "Gross potential rent", confidence: "low", role: "none", children: [] })),
    aging: null,
    notes: [],
  };
  const parse = async (request: { messages: { content: string }[] }) => {
    sent.push(JSON.stringify(request));
    return { stop_reason: "end_turn", parsed_output: layout, usage: { input_tokens: 1, output_tokens: 1 } };
  };
  return { messages: { parse } } as unknown as Anthropic;
}

describe("reading strips personal and bank details", () => {
  it("keeps names, phones and bank numbers out of the request and the saved result, and still reads the amounts", async () => {
    const sent: string[] = [];
    const reading = await readReport(fakeClaude(sent), "CR_RentRoll_1026.xlsx", rentRoll());
    const saved = JSON.stringify(reading);

    for (const secret of [...NAMES, PHONE, "201-7788", BANK, ROUTING]) {
      expect(sent[0]).not.toContain(secret);
      expect(saved).not.toContain(secret);
    }
    expect(reading.lines.map((l) => [l.label, l.amount])).toEqual([
      ["[removed]", 1690],
      ["[removed]", 1465],
    ]);
    expect(sent[0]).toContain("Paid by money order");
    expect(sent[0]).toContain("500.00");
  });
});

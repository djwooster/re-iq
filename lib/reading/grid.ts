import * as XLSX from "xlsx";
import { parseAmount } from "./amount";

/**
 * A report file opened into sheets of cells. Each cell keeps its stored value (a number, or text
 * when the system exported numbers as text) and the text Excel shows. Rows and columns are named
 * the way Excel names them (row 1, column A) so Claude and our code point at the same cell.
 */

export interface Cell {
  value: string | number | boolean | null;
  text: string;
}

export interface Sheet {
  name: string;
  hidden: boolean;
  /** rows[0] is Excel row 1; columns[0] is column A. Blank cells are null. */
  rows: (Cell | null)[][];
}

export function openWorkbook(bytes: Uint8Array): Sheet[] {
  const wb = XLSX.read(bytes, { type: "array", cellDates: false, cellFormula: false, cellHTML: false });
  return wb.SheetNames.map((name, i) => {
    const ws = wb.Sheets[name];
    const rows: (Cell | null)[][] = [];
    if (ws["!ref"]) {
      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let r = 0; r <= range.e.r; r++) {
        const row: (Cell | null)[] = [];
        for (let c = 0; c <= range.e.c; c++) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
          const text = cell ? String(cell.w ?? cell.v ?? "").trim() : "";
          row.push(cell && text ? { value: (cell.v ?? null) as Cell["value"], text: String(cell.w ?? cell.v ?? "") } : null);
        }
        rows.push(row);
      }
    }
    return redactPersonal({ name, hidden: Boolean(wb.Workbook?.Sheets?.[i]?.Hidden), rows });
  });
}

/** Column headers whose values name or reach a person. */
const PERSON = /^(primary |co-?)?(resident|tenant|occupant|lessee|guarantor|applicant|payer|household)s?( names?)?$|^(first |last |full |resident |tenant )?names?$|^(home |cell |mobile |work )?phone( number| #)?s?$|^e-?mail( address)?$|^ssn$|social security|date of birth|^dob$/i;
/** Column headers whose values are bank details. */
const BANK = /routing|\baba\b|\biban\b|bank\s*(acct|account)|direct deposit/i;
/** A bank, account or routing number written next to its label anywhere in a cell. */
const LABELED_NUMBER = /\b(acct|account|a\/c|routing|aba|bank)\b([^0-9]{0,15})\d[\d -]{3,}\d/gi;
/** A bare 9–17 digit run in text: the length of bank account and routing numbers (and phone numbers). */
const LONG_NUMBER = /(?<![\d.,])\d{9,17}(?![\d.,])/g;

export const REMOVED = "[removed]";

/**
 * Strips resident names, contact details and bank account numbers as a report is opened, so nothing
 * downstream (Claude, read results, logs) ever sees them. Values under a person header are removed
 * unless they're amounts (a "Resident Deposit" column keeps its numbers); values under a bank header
 * are always removed; account and routing numbers are removed from any text cell.
 */
function redactPersonal(sheet: Sheet): Sheet {
  const person = new Map<number, number>();
  const bank = new Map<number, number>();
  const rows = sheet.rows.map((row, r) => {
    row.forEach((cell, c) => {
      // A header is a short label without digits, so a note that mentions an account isn't one.
      const header = cell?.text.trim() ?? "";
      if (!header || header.length > 40 || /\d/.test(header) || typeof cell?.value === "number") return;
      if (PERSON.test(header) && !person.has(c)) person.set(c, r);
      if (BANK.test(header) && !bank.has(c)) bank.set(c, r);
    });
    return row.map((cell, c): Cell | null => {
      if (!cell) return null;
      if (r > (bank.get(c) ?? Infinity)) return { value: REMOVED, text: REMOVED };
      const isAmount = typeof cell.value === "number" || parseAmount(cell.text) !== null;
      if (r > (person.get(c) ?? Infinity) && !isAmount) return { value: REMOVED, text: REMOVED };
      if (typeof cell.value === "number") return cell;
      const text = cell.text.replace(LABELED_NUMBER, `$1$2${REMOVED}`).replace(LONG_NUMBER, REMOVED);
      return text === cell.text ? cell : { value: text, text };
    });
  });
  return { ...sheet, rows };
}

export const columnName = (index: number) => XLSX.utils.encode_col(index);
export const columnIndex = (name: string) => XLSX.utils.decode_col(name.trim().toUpperCase());

export function cellAt(sheet: Sheet, row: number, column: string): Cell | null {
  return sheet.rows[row - 1]?.[columnIndex(column)] ?? null;
}

/**
 * The sheet as compact text for Claude: one line per non-empty row, only filled cells, each as
 * `C=text`. Leading spaces are kept (indentation shows the account hierarchy). Personal details
 * were already removed when the workbook was opened. Long sheets are cut at `maxRows` non-empty
 * rows, and the cut is stated.
 */
export function renderSheet(sheet: Sheet, maxRows = 400): string {
  const lines: string[] = [];
  let shown = 0;
  let total = 0;
  sheet.rows.forEach((row, r) => {
    const cells = row.flatMap((cell, c) => (cell ? [`${columnName(c)}=${JSON.stringify(cell.text.replace(/\s+$/, ""))}`] : []));
    if (!cells.length) return;
    total++;
    if (shown >= maxRows) return;
    shown++;
    lines.push(`${r + 1}: ${cells.join(" ")}`);
  });
  if (total > shown) lines.push(`(${total - shown} more non-empty rows not shown)`);
  return lines.join("\n");
}

import * as XLSX from "xlsx";

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
    return { name, hidden: Boolean(wb.Workbook?.Sheets?.[i]?.Hidden), rows };
  });
}

export const columnName = (index: number) => XLSX.utils.encode_col(index);
export const columnIndex = (name: string) => XLSX.utils.decode_col(name.trim().toUpperCase());

export function cellAt(sheet: Sheet, row: number, column: string): Cell | null {
  return sheet.rows[row - 1]?.[columnIndex(column)] ?? null;
}

/** Column headers whose values are personal details the reader never needs. */
const PERSONAL = /^(resident|tenant|occupant|lessee)s?( name)?$|^(first |last |full )?name$|phone|e-?mail|ssn|date of birth/i;

/**
 * The sheet as compact text for Claude: one line per non-empty row, only filled cells, each as
 * `C=text`. Leading spaces are kept (indentation shows the account hierarchy). Values under a
 * personal-details header (resident name, phone, email) are replaced, so they're never sent. Long
 * sheets are cut at `maxRows` non-empty rows, and the cut is stated.
 */
export function renderSheet(sheet: Sheet, maxRows = 400): string {
  const lines: string[] = [];
  const personal = new Map<number, number>();
  let shown = 0;
  let total = 0;
  sheet.rows.forEach((row, r) => {
    row.forEach((cell, c) => cell && PERSONAL.test(cell.text.trim()) && !personal.has(c) && personal.set(c, r));
    const cells = row.flatMap((cell, c) => {
      if (!cell) return [];
      const text = personal.has(c) && r > personal.get(c)! ? "[removed]" : cell.text.replace(/\s+$/, "");
      return [`${columnName(c)}=${JSON.stringify(text)}`];
    });
    if (!cells.length) return;
    total++;
    if (shown >= maxRows) return;
    shown++;
    lines.push(`${r + 1}: ${cells.join(" ")}`);
  });
  if (total > shown) lines.push(`(${total - shown} more non-empty rows not shown)`);
  return lines.join("\n");
}

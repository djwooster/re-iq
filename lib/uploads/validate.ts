/**
 * Upload checks, run on the server against the file's actual bytes. The extension must be allowed
 * AND match what the contents are; macro-enabled workbooks are refused however they're named.
 */

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type FileKind = "xlsx" | "xls" | "csv" | "pdf" | "jpeg" | "png" | "heic";

export const ACCEPTED_EXTENSIONS = ["xlsx", "xls", "csv", "pdf", "jpg", "jpeg", "png", "heic"] as const;

const KIND_BY_EXTENSION: Record<string, FileKind> = { xlsx: "xlsx", xls: "xls", csv: "csv", pdf: "pdf", jpg: "jpeg", jpeg: "jpeg", png: "png", heic: "heic" };

export const CONTENT_TYPE: Record<FileKind, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  pdf: "application/pdf",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
};

export const isImage = (kind: FileKind) => kind === "jpeg" || kind === "png" || kind === "heic";

export type Rejection = "empty" | "too_large" | "type_not_allowed" | "content_mismatch" | "macros";
export type Verdict = { ok: true; kind: FileKind; contentType: string } | { ok: false; reason: Rejection };

/** What each rejection tells the uploader. */
export const REJECTION_MESSAGE: Record<Rejection, string> = {
  empty: "This file is empty.",
  too_large: "Files can be up to 25 MB.",
  type_not_allowed: "Upload Excel (.xlsx, .xls), CSV, PDF, or a photo (.jpg, .png, .heic).",
  content_mismatch: "This file's contents don't match its type.",
  macros: "Files with macros can't be uploaded. Save it as a regular .xlsx and try again.",
};

export const extensionOf = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "");

export function checkFile(name: string, bytes: Uint8Array): Verdict {
  if (bytes.length === 0) return { ok: false, reason: "empty" };
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, reason: "too_large" };
  const claimed = KIND_BY_EXTENSION[extensionOf(name)];
  if (!claimed) return { ok: false, reason: "type_not_allowed" };
  const actual = sniff(bytes);
  if (actual === "macros") return { ok: false, reason: "macros" };
  if (actual !== claimed) return { ok: false, reason: "content_mismatch" };
  return { ok: true, kind: actual, contentType: CONTENT_TYPE[actual] };
}

/** A storage-safe file name: letters, digits, spaces and . _ - ( ) only, extension kept, 200 characters max. */
export function safeFileName(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "file").normalize("NFKC");
  const cleaned = base.replace(/[^A-Za-z0-9._\- ()]+/g, "_").replace(/_+/g, "_").replace(/^[.\s_]+/, "").trim();
  const ext = extensionOf(cleaned);
  const stem = cleaned.slice(0, cleaned.length - (ext ? ext.length + 1 : 0)).slice(0, 200 - ext.length - 1);
  return (stem || "file") + (ext ? `.${ext}` : "");
}

// ---- Content sniffing --------------------------------------------------------------------------

const startsWith = (b: Uint8Array, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v);
const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const utf16le = (s: string) => Array.from(s).flatMap((c) => [c.charCodeAt(0), 0]);

function contains(b: Uint8Array, needle: number[], limit = b.length): boolean {
  const end = Math.min(b.length, limit) - needle.length;
  outer: for (let i = 0; i <= end; i++) {
    for (let j = 0; j < needle.length; j++) if (b[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

const HEIC_BRANDS = new Set(["heic", "heix", "heim", "heis", "hevc", "hevx"]);

function sniff(b: Uint8Array): FileKind | "macros" | null {
  if (startsWith(b, ascii("%PDF-"))) return "pdf";
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(b, [0xff, 0xd8, 0xff])) return "jpeg";
  if (b.length >= 12 && startsWith(b, ascii("ftyp"), 4)) {
    const boxSize = Math.min((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3], b.length, 256);
    const brands: string[] = [];
    for (let i = 8; i + 4 <= boxSize; i += 4) if (i !== 12) brands.push(String.fromCharCode(...b.slice(i, i + 4)));
    const major = brands[0];
    if (HEIC_BRANDS.has(major) || ((major === "mif1" || major === "msf1") && brands.some((x) => HEIC_BRANDS.has(x)))) return "heic";
    return null;
  }
  // Office 97-2003 (OLE compound file): a workbook stream, and no VBA project.
  if (startsWith(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    if (contains(b, utf16le("_VBA_PROJECT"))) return "macros";
    return contains(b, utf16le("Workbook")) || contains(b, utf16le("Book")) ? "xls" : null;
  }
  // Office Open XML (zip): an Excel workbook, and no VBA project. Entry names are stored uncompressed.
  if (startsWith(b, [0x50, 0x4b, 0x03, 0x04])) {
    if (contains(b, ascii("vbaProject.bin")) || contains(b, ascii("macroEnabled"))) return "macros";
    return contains(b, ascii("[Content_Types].xml")) && contains(b, ascii("xl/workbook.xml")) ? "xlsx" : null;
  }
  return looksLikeCsv(b) ? "csv" : null;
}

/** Plain text with no binary bytes, and not markup or a script disguised as CSV. */
function looksLikeCsv(b: Uint8Array): boolean {
  const head = b.subarray(0, 65536);
  for (const byte of head) if (byte === 0 || (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d)) return false;
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(head.length < b.length ? head.subarray(0, head.lastIndexOf(0x0a) + 1 || head.length) : head);
  } catch {
    text = new TextDecoder("windows-1252").decode(head);
  }
  if (/^\s*(<|#!|MZ|\{\s*")/i.test(text)) return false;
  return true;
}

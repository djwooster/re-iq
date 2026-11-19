import { describe, expect, it } from "vitest";
import { stripMetadata } from "@/lib/uploads/strip-metadata";
import { MAX_UPLOAD_BYTES, checkFile, safeFileName } from "@/lib/uploads/validate";

/** File checks run on the bytes, not the name; photos lose EXIF (including GPS) before storage. */

const enc = (s: string) => new TextEncoder().encode(s);
const bytes = (...parts: (number[] | Uint8Array | string)[]) => {
  const chunks = parts.map((p) => (typeof p === "string" ? enc(p) : p instanceof Uint8Array ? p : Uint8Array.from(p)));
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let i = 0;
  for (const c of chunks) {
    out.set(c, i);
    i += c.length;
  }
  return out;
};
const u16 = (n: number) => [(n >> 8) & 255, n & 255];
const u32 = (n: number) => [(n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];
const has = (hay: Uint8Array, needle: string) => Buffer.from(hay).includes(Buffer.from(needle));

const GPS = "GPS-SECRET-39.7392N-104.9903W";

// Minimal real-looking files.
const PDF = bytes("%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const pngChunk = (type: string, data: Uint8Array | string) => {
  const d = typeof data === "string" ? enc(data) : data;
  return bytes(u32(d.length), type, d, [0, 0, 0, 0]);
};
const PNG = bytes(PNG_SIG, pngChunk("IHDR", new Uint8Array(13)), pngChunk("eXIf", `MM\0*${GPS}`), pngChunk("tEXt", "Comment\0shot on site"), pngChunk("IDAT", "pixels"), pngChunk("IEND", ""));
const jpegSegment = (marker: number, payload: Uint8Array | string) => {
  const p = typeof payload === "string" ? enc(payload) : payload;
  return bytes([0xff, marker], u16(p.length + 2), p);
};
const JPEG = bytes(
  [0xff, 0xd8],
  jpegSegment(0xe0, bytes("JFIF\0", [1, 1, 0, 0, 1, 0, 1, 0, 0])),
  jpegSegment(0xe1, `Exif\0\0MM\0*${GPS}`),
  jpegSegment(0xe1, `http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>${GPS}</x:xmpmeta>`),
  jpegSegment(0xfe, "taken at 120 Maple St"),
  jpegSegment(0xdb, new Uint8Array(65)),
  [0xff, 0xda],
  u16(8),
  [1, 1, 0, 0, 63, 0],
  "compressed-image-data",
  [0xff, 0xd9],
);
const ZIP = (...names: string[]) => bytes(...names.flatMap((n) => [[0x50, 0x4b, 0x03, 0x04], new Uint8Array(26), n]));
const XLSX = ZIP("[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/worksheets/sheet1.xml");
const XLSM = ZIP("[Content_Types].xml", "xl/workbook.xml", "xl/vbaProject.bin");
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const utf16 = (s: string) => Uint8Array.from(Array.from(s).flatMap((c) => [c.charCodeAt(0), 0]));
const XLS = bytes(OLE, new Uint8Array(64), utf16("Workbook"));
const XLS_MACROS = bytes(OLE, new Uint8Array(64), utf16("Workbook"), utf16("_VBA_PROJECT_CUR"));
const CSV = enc("Account,Oct 2026\nGross potential rent,312000\nVacancy,-16224\n");

/** A minimal HEIC: ftyp, then meta (iinf with an Exif item, iloc pointing at it), then mdat. */
function heic(): { file: Uint8Array; exifAt: number; exifLength: number } {
  const box = (type: string, ...body: (number[] | Uint8Array | string)[]) => {
    const b = bytes(...body);
    return bytes(u32(b.length + 8), type, b);
  };
  const ftyp = box("ftyp", "heic", u32(0), "mif1", "heic");
  const exif = bytes(u32(6), "Exif\0\0", `MM\0*${GPS}`);
  const build = (exifAt: number) => {
    const hdlr = box("hdlr", u32(0), u32(0), "pict", new Uint8Array(12), [0]);
    const infe = box("infe", [2, 0, 0, 0], u16(1), u16(0), "Exif", [0]);
    const iinf = box("iinf", u32(0), u16(1), infe);
    const iloc = box("iloc", u32(0), [0x44, 0x00], u16(1), u16(1), u16(0), u16(1), u32(exifAt), u32(exif.length));
    const meta = box("meta", u32(0), hdlr, iinf, iloc);
    return bytes(ftyp, meta);
  };
  const head = build(0);
  const exifAt = head.length + 8; // after mdat's header
  return { file: bytes(build(exifAt), box("mdat", exif, "hevc-image-data")), exifAt, exifLength: exif.length };
}

describe("checkFile", () => {
  it("accepts each allowed type when the contents match", () => {
    expect(checkFile("t12.pdf", PDF)).toMatchObject({ ok: true, kind: "pdf" });
    expect(checkFile("t12.xlsx", XLSX)).toMatchObject({ ok: true, kind: "xlsx" });
    expect(checkFile("t12.xls", XLS)).toMatchObject({ ok: true, kind: "xls" });
    expect(checkFile("rent roll.csv", CSV)).toMatchObject({ ok: true, kind: "csv" });
    expect(checkFile("site.jpg", JPEG)).toMatchObject({ ok: true, kind: "jpeg" });
    expect(checkFile("site.JPEG", JPEG)).toMatchObject({ ok: true, kind: "jpeg" });
    expect(checkFile("site.png", PNG)).toMatchObject({ ok: true, kind: "png" });
    expect(checkFile("site.heic", heic().file)).toMatchObject({ ok: true, kind: "heic" });
  });

  it("rejects types that aren't allowed, including macro workbooks by name", () => {
    for (const name of ["report.xlsm", "report.exe", "report.html", "report.docx", "report.zip", "report", "report.svg"]) {
      expect(checkFile(name, XLSX)).toEqual({ ok: false, reason: "type_not_allowed" });
    }
  });

  it("rejects disguised files: contents that don't match the extension", () => {
    const exe = bytes("MZ", new Uint8Array(200));
    expect(checkFile("t12.pdf", exe)).toEqual({ ok: false, reason: "content_mismatch" });
    expect(checkFile("t12.xlsx", PDF)).toEqual({ ok: false, reason: "content_mismatch" });
    expect(checkFile("photo.jpg", PNG)).toEqual({ ok: false, reason: "content_mismatch" });
    expect(checkFile("data.csv", enc("<html><script>alert(1)</script></html>"))).toEqual({ ok: false, reason: "content_mismatch" });
    expect(checkFile("data.csv", exe)).toEqual({ ok: false, reason: "content_mismatch" });
    expect(checkFile("t12.xlsx", ZIP("word/document.xml", "[Content_Types].xml"))).toEqual({ ok: false, reason: "content_mismatch" });
  });

  it("rejects macro-enabled workbooks renamed to an allowed extension", () => {
    expect(checkFile("t12.xlsx", XLSM)).toEqual({ ok: false, reason: "macros" });
    expect(checkFile("t12.xls", XLS_MACROS)).toEqual({ ok: false, reason: "macros" });
  });

  it("rejects empty and oversized files", () => {
    expect(checkFile("t12.pdf", new Uint8Array(0))).toEqual({ ok: false, reason: "empty" });
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    big.set(enc("%PDF-1.7"));
    expect(checkFile("t12.pdf", big)).toEqual({ ok: false, reason: "too_large" });
  });

  it("keeps stored file names safe", () => {
    expect(safeFileName("../../etc/passwd")).toBe("passwd");
    expect(safeFileName("Oct T-12 <final>.xlsx")).toBe("Oct T-12 _final_.xlsx");
    expect(safeFileName("..hidden.pdf")).toBe("hidden.pdf");
  });
});

describe("stripMetadata", () => {
  it("removes EXIF (with GPS), XMP and comments from JPEGs, keeping the image", () => {
    const out = stripMetadata("jpeg", JPEG);
    expect(has(out, GPS)).toBe(false);
    expect(has(out, "Exif")).toBe(false);
    expect(has(out, "120 Maple St")).toBe(false);
    expect(has(out, "JFIF")).toBe(true);
    expect(has(out, "compressed-image-data")).toBe(true);
    expect(checkFile("site.jpg", out)).toMatchObject({ ok: true, kind: "jpeg" });
  });

  it("removes eXIf and text chunks from PNGs, keeping the image", () => {
    const out = stripMetadata("png", PNG);
    expect(has(out, GPS)).toBe(false);
    expect(has(out, "eXIf")).toBe(false);
    expect(has(out, "shot on site")).toBe(false);
    expect(has(out, "IDAT")).toBe(true);
    expect(checkFile("site.png", out)).toMatchObject({ ok: true, kind: "png" });
  });

  it("blanks the Exif item in HEIC photos without moving anything", () => {
    const { file, exifAt, exifLength } = heic();
    expect(has(file, GPS)).toBe(true);
    const out = stripMetadata("heic", file);
    expect(out.length).toBe(file.length);
    expect(has(out, GPS)).toBe(false);
    expect(out.subarray(exifAt, exifAt + exifLength).every((b) => b === 0)).toBe(true);
    expect(has(out, "hevc-image-data")).toBe(true);
    expect(checkFile("site.heic", out)).toMatchObject({ ok: true, kind: "heic" });
  });

  it("leaves documents untouched", () => {
    expect(stripMetadata("pdf", PDF)).toBe(PDF);
  });
});

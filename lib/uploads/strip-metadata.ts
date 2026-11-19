import type { FileKind } from "./validate";

/**
 * Removes photo metadata (EXIF, including GPS location, XMP, IPTC and comments) before a photo is
 * stored. JPEG and PNG metadata segments are dropped; HEIC metadata items are overwritten with
 * zeros in place, so the file's internal offsets stay valid. Other file types pass through.
 */
export function stripMetadata(kind: FileKind, bytes: Uint8Array): Uint8Array {
  if (kind === "jpeg") return stripJpeg(bytes);
  if (kind === "png") return stripPng(bytes);
  if (kind === "heic") return stripHeic(bytes);
  return bytes;
}

// ---- JPEG: keep image data and the segments needed to show it (JFIF, Adobe, ICC color) ----------

function stripJpeg(b: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) break;
    const marker = b[i + 1];
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    // Start of scan: the rest is compressed image data and the end marker.
    if (marker === 0xda) {
      out.push(b.subarray(i));
      return concat(out);
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      out.push(b.subarray(i, i + 2));
      i += 2;
      continue;
    }
    const length = (b[i + 2] << 8) | b[i + 3];
    const segment = b.subarray(i, i + 2 + length);
    if (keepJpegSegment(marker, segment)) out.push(segment);
    i += 2 + length;
  }
  out.push(b.subarray(i));
  return concat(out);
}

function keepJpegSegment(marker: number, segment: Uint8Array): boolean {
  if (marker === 0xe0 || marker === 0xee) return true; // APP0 JFIF, APP14 Adobe color transform
  if (marker === 0xe2) return startsWithText(segment, 4, "ICC_PROFILE\0"); // APP2: keep only the color profile
  if (marker >= 0xe1 && marker <= 0xef) return false; // EXIF, XMP, IPTC and other application data
  if (marker === 0xfe) return false; // comments
  return true;
}

// ---- PNG: drop metadata chunks ------------------------------------------------------------------

const PNG_METADATA = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

function stripPng(b: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const length = readU32(b, i);
    const type = String.fromCharCode(...b.subarray(i + 4, i + 8));
    const chunk = b.subarray(i, i + 12 + length);
    if (!PNG_METADATA.has(type)) out.push(chunk);
    i += 12 + length;
    if (type === "IEND") break;
  }
  return concat(out);
}

// ---- HEIC (ISO base media file): zero the Exif and XMP items ------------------------------------

interface Box {
  type: string;
  start: number;
  body: number;
  end: number;
}

function* boxes(b: Uint8Array, from: number, to: number): Generator<Box> {
  let i = from;
  while (i + 8 <= to) {
    let size = readU32(b, i);
    const type = String.fromCharCode(...b.subarray(i + 4, i + 8));
    let body = i + 8;
    if (size === 1) {
      size = readU64(b, i + 8);
      body = i + 16;
    } else if (size === 0) size = to - i;
    if (size < 8 || i + size > to) return;
    yield { type, start: i, body, end: i + size };
    i += size;
  }
}

function stripHeic(input: Uint8Array): Uint8Array {
  const b = new Uint8Array(input);
  const meta = [...boxes(b, 0, b.length)].find((x) => x.type === "meta");
  if (!meta) return b;
  const children = [...boxes(b, meta.body + 4, meta.end)]; // meta is a full box: skip version and flags
  const iinf = children.find((x) => x.type === "iinf");
  const iloc = children.find((x) => x.type === "iloc");
  const idat = children.find((x) => x.type === "idat");
  if (!iinf || !iloc) return b;

  const metadataItems = new Set<number>();
  const iinfVersion = b[iinf.body];
  const entriesAt = iinf.body + 4 + (iinfVersion === 0 ? 2 : 4);
  for (const infe of boxes(b, entriesAt, iinf.end)) {
    if (infe.type !== "infe") continue;
    const version = b[infe.body];
    if (version < 2) continue;
    let p = infe.body + 4;
    const itemId = version === 2 ? readU16(b, p) : readU32(b, p);
    p += (version === 2 ? 2 : 4) + 2; // item ID, protection index
    const itemType = String.fromCharCode(...b.subarray(p, p + 4));
    p += 4;
    if (itemType === "Exif") metadataItems.add(itemId);
    if (itemType === "mime") {
      const rest = new TextDecoder().decode(b.subarray(p, infe.end));
      if (/xmp|rdf\+xml/i.test(rest)) metadataItems.add(itemId);
    }
  }
  if (!metadataItems.size) return b;

  const version = b[iloc.body];
  let p = iloc.body + 4;
  const offsetSize = b[p] >> 4;
  const lengthSize = b[p] & 0x0f;
  const baseOffsetSize = b[p + 1] >> 4;
  const indexSize = version === 1 || version === 2 ? b[p + 1] & 0x0f : 0;
  p += 2;
  const itemCount = version < 2 ? readU16(b, p) : readU32(b, p);
  p += version < 2 ? 2 : 4;
  for (let n = 0; n < itemCount; n++) {
    const itemId = version < 2 ? readU16(b, p) : readU32(b, p);
    p += version < 2 ? 2 : 4;
    let construction = 0;
    if (version === 1 || version === 2) {
      construction = readU16(b, p) & 0x0f;
      p += 2;
    }
    p += 2; // data reference index
    const base = readSized(b, p, baseOffsetSize);
    p += baseOffsetSize;
    const extents = readU16(b, p);
    p += 2;
    for (let e = 0; e < extents; e++) {
      p += indexSize;
      const offset = readSized(b, p, offsetSize);
      p += offsetSize;
      const length = readSized(b, p, lengthSize);
      p += lengthSize;
      if (!metadataItems.has(itemId)) continue;
      const origin = construction === 1 ? (idat?.body ?? -1) : 0;
      if (origin < 0) continue;
      const from = origin + base + offset;
      const to = length === 0 ? (construction === 1 ? idat!.end : b.length) : from + length;
      if (from >= 0 && to <= b.length && from < to) b.fill(0, from, to);
    }
  }
  return b;
}

// ---- Byte helpers ---------------------------------------------------------------------------------

const readU16 = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const readU32 = (b: Uint8Array, i: number) => ((b[i] << 24) >>> 0) + ((b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]);
const readU64 = (b: Uint8Array, i: number) => readU32(b, i) * 2 ** 32 + readU32(b, i + 4);
const readSized = (b: Uint8Array, i: number, size: number) => (size === 0 ? 0 : size === 4 ? readU32(b, i) : size === 8 ? readU64(b, i) : size === 2 ? readU16(b, i) : 0);
const startsWithText = (b: Uint8Array, at: number, text: string) => Array.from(text).every((c, k) => b[at + k] === c.charCodeAt(0));

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, x) => n + x.length, 0));
  let i = 0;
  for (const x of parts) {
    out.set(x, i);
    i += x.length;
  }
  return out;
}

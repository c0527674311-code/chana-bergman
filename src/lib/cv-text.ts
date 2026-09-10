import JSZip from "jszip";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";

/**
 * Works out what an uploaded CV really is and pulls its text out.
 *
 * The extension is not trusted: the 12 "blank candidates" from the first
 * import were Word's `~$` lock files (162 bytes) carrying a .docx or .pdf
 * name, and an old binary .doc was read as UTF-8 and sent to the model as
 * garbage. The first bytes of the file decide.
 */

export type CvFormat =
  | { kind: "pdf" }
  | { kind: "image"; mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp" }
  | { kind: "docx" | "doc" | "odt" | "rtf" | "txt" };

/** A file we will never be able to read. Retrying it is pointless. */
export class UnreadableFileError extends Error {}

function startsWith(buf: Buffer, bytes: number[], offset = 0) {
  return bytes.every((b, i) => buf[offset + i] === b);
}

/**
 * True for files that are not CVs at all: Office lock files (`~$name.docx`,
 * written next to every open document), macOS/Windows metadata, and document
 * files too small to hold anything.
 */
export function isJunkFile(fileName: string, size: number) {
  const base = fileName.split("/").pop() ?? fileName;
  if (base.startsWith("~$") || base.startsWith("._")) return true;
  if (/^(\.ds_store|thumbs\.db|desktop\.ini)$/i.test(base)) return true;
  return /\.(docx?|pdf|odt|rtf|pages)$/i.test(base) && size < 200;
}

export async function detectFormat(buffer: Buffer, fileName: string): Promise<CvFormat> {
  if (isJunkFile(fileName, buffer.length)) {
    throw new UnreadableFileError("זה קובץ זמני של Word ולא קורות חיים — דילגנו עליו.");
  }

  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46])) return { kind: "pdf" };
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47])) return { kind: "image", mediaType: "image/png" };
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return { kind: "image", mediaType: "image/jpeg" };
  if (startsWith(buffer, [0x47, 0x49, 0x46, 0x38])) return { kind: "image", mediaType: "image/gif" };
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && buffer.subarray(8, 12).toString("latin1") === "WEBP") {
    return { kind: "image", mediaType: "image/webp" };
  }
  const ftyp = buffer.subarray(4, 12).toString("latin1");
  if (/^ftyp(heic|heix|hevc|mif1|msf1|avif)/.test(ftyp)) {
    throw new UnreadableFileError(
      "צילום בפורמט HEIC (של אייפון) לא נתמך. אפשר לשמור אותו כ-JPG או PDF ולהעלות שוב.",
    );
  }
  if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return { kind: "doc" };
  if (buffer.subarray(0, 5).toString("latin1") === "{\\rtf") return { kind: "rtf" };

  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) {
    const zip = await JSZip.loadAsync(buffer).catch(() => null);
    if (zip?.file("word/document.xml")) return { kind: "docx" };
    if (zip?.file("content.xml")) return { kind: "odt" };
    if (zip && (zip.file("Index/Document.iwa") || zip.file("index.xml"))) {
      throw new UnreadableFileError("קובץ Pages לא נתמך. אפשר לייצא אותו ל-PDF או Word ולהעלות שוב.");
    }
    throw new UnreadableFileError("הקובץ פגום או שאינו מסמך Word תקין.");
  }

  // Anything else must be readable text to be worth sending anywhere.
  if (decodeText(buffer) !== null) return { kind: "txt" };

  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  throw new UnreadableFileError(
    ext === "pages"
      ? "קובץ Pages לא נתמך. אפשר לייצא אותו ל-PDF או Word ולהעלות שוב."
      : "לא הצלחנו לזהות את סוג הקובץ. אפשר לשמור אותו כ-PDF או Word ולהעלות שוב.",
  );
}

/**
 * UTF-8 first; Hebrew text files saved on Windows are usually windows-1255.
 * Returns null for binary content.
 */
export function decodeText(buffer: Buffer): string | null {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    text = new TextDecoder("windows-1255").decode(buffer);
  }
  text = text.replace(/^\uFEFF/, "");
  if (!text.trim()) return null;
  const control = text.match(/[\u0000-\u0008\u000e-\u001f\ufffd]/g)?.length ?? 0;
  return control / text.length > 0.02 ? null : text;
}

function stripRtf(rtf: string): string {
  const cp1255 = new TextDecoder("windows-1255");
  return rtf
    .replace(/\\'([0-9a-f]{2})/gi, (_, h) => cp1255.decode(Uint8Array.of(parseInt(h, 16))))
    .replace(/\\u(-?\d+)\??/g, (_, n) => String.fromCharCode(Number(n) < 0 ? Number(n) + 65536 : Number(n)))
    .replace(/\\(par|line)\b/g, "\n")
    .replace(/\{\\\*[^{}]*\}/g, "")
    .replace(/\\[a-z]+-?\d* ?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

async function pdfText(buffer: Buffer): Promise<string | null> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  } catch {
    // Text is for search only; the model still reads the PDF itself.
    return null;
  }
}

/**
 * Plain text of a CV, for search and (for Word/text files) for the model.
 * PDFs keep word order imperfectly for Hebrew, but every word is intact, so
 * searching for a word still finds her. Images have no text layer: null.
 */
export async function extractText(buffer: Buffer, format: CvFormat): Promise<string | null> {
  let text: string | null = null;
  switch (format.kind) {
    case "pdf":
      text = await pdfText(buffer);
      break;
    case "image":
      return null;
    case "docx":
      text = (await mammoth.extractRawText({ buffer })).value;
      break;
    case "doc":
      text = (await new WordExtractor().extract(buffer)).getBody();
      break;
    case "odt": {
      const zip = await JSZip.loadAsync(buffer);
      const xml = (await zip.file("content.xml")?.async("string")) ?? "";
      text = xml
        .replace(/<text:(p|h|line-break)[^>]*\/?>/g, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&");
      break;
    }
    case "rtf":
      text = stripRtf(buffer.toString("latin1"));
      break;
    case "txt":
      text = decodeText(buffer);
      break;
  }
  const clean = text?.replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").trim();
  return clean ? clean : null;
}

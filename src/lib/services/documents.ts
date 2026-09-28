import zlib from "node:zlib";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { ALLOWED_UPLOADS, getStorage, sniffMime } from "@/lib/providers/storage";

export const MAX_CV_BYTES = 10 * 1024 * 1024;

export class UploadError extends Error {}

/** Minimal ZIP reader to pull word/document.xml out of a .docx without extra dependencies. */
function docxToText(buf: Buffer): string {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new UploadError("Invalid DOCX file.");
  const cdCount = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < cdCount; i++) {
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString();
    if (name === "word/document.xml") {
      const lNameLen = buf.readUInt16LE(localOffset + 26);
      const lExtraLen = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const data = buf.subarray(start, start + compSize);
      const xml = (method === 8 ? zlib.inflateRawSync(data) : data).toString("utf8");
      return xml
        .replace(/<w:tab\/>/g, "\t")
        .replace(/<\/w:p>/g, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new UploadError("DOCX contains no document body.");
}

export async function extractText(buf: Buffer, mime: string): Promise<string> {
  if (mime === "text/plain") return buf.toString("utf8");
  if (mime === "application/pdf") {
    const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await pdfText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : text;
  }
  if (mime.includes("wordprocessingml")) return docxToText(buf);
  return "";
}

/** Validates (size + magic bytes), encrypts, stores and extracts text from a candidate document. */
export async function storeCandidateDocument(orgId: string, candidateId: string, file: { buffer: Buffer; filename: string; mime: string }, kind = "CV") {
  if (file.buffer.length === 0) throw new UploadError("The uploaded file is empty.");
  if (file.buffer.length > MAX_CV_BYTES) throw new UploadError("File is too large (max 10 MB).");
  const mime = sniffMime(file.buffer, file.mime);
  if (!mime || !ALLOWED_UPLOADS[mime] || mime.startsWith("video") || mime.startsWith("audio"))
    throw new UploadError("Unsupported file type. Please upload a PDF, DOCX or TXT file.");
  let text = "";
  try {
    text = (await extractText(file.buffer, mime)).replace(/\u0000/g, "").slice(0, 100_000);
  } catch (e) {
    console.error("[documents] text extraction failed", e);
  }
  const key = await getStorage().put(orgId, `candidates/${candidateId}`, file.buffer, ALLOWED_UPLOADS[mime]);
  return db.document.create({
    data: {
      orgId,
      candidateId,
      kind,
      filename: file.filename.replace(/[^\w.\- ()äöüÄÖÜ]/g, "_").slice(0, 120),
      mimeType: mime,
      size: file.buffer.length,
      storageKey: key,
      sha256: sha256(file.buffer),
      extractedText: text || null,
    },
  });
}

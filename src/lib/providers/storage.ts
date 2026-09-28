import fs from "node:fs/promises";
import path from "node:path";
import { decryptBuffer, encryptBuffer, randomToken } from "@/lib/crypto";

/**
 * Object storage abstraction. The local provider encrypts every object with
 * AES-256-GCM before writing to disk; an S3 provider would use SSE-KMS plus the
 * same envelope. Keys are tenant-prefixed (`<orgId>/...`) for isolation.
 */
export interface StorageProvider {
  name: string;
  put(orgId: string, prefix: string, data: Buffer, ext: string): Promise<string>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

class LocalEncryptedStorage implements StorageProvider {
  name = "local-encrypted";
  private root = path.resolve(process.env.STORAGE_DIR || "./storage");

  private resolve(key: string) {
    const p = path.resolve(this.root, key);
    if (!p.startsWith(this.root + path.sep)) throw new Error("Invalid storage key");
    return p;
  }
  async put(orgId: string, prefix: string, data: Buffer, ext: string) {
    const safeExt = ext.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
    const key = `${orgId}/${prefix}/${randomToken(16)}.${safeExt}.enc`;
    const p = this.resolve(key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, encryptBuffer(data));
    return key;
  }
  async get(key: string) {
    return decryptBuffer(await fs.readFile(this.resolve(key)));
  }
  async delete(key: string) {
    await fs.rm(this.resolve(key), { force: true });
  }
}

let instance: StorageProvider | null = null;
export function getStorage(): StorageProvider {
  if (!instance) instance = new LocalEncryptedStorage();
  return instance;
}

export const ALLOWED_UPLOADS: Record<string, string> = {
  "application/pdf": "pdf",
  "text/plain": "txt",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "video/webm": "webm",
  "video/mp4": "mp4",
  "audio/webm": "webm",
};

/** Validates type by magic bytes, not by the client-supplied MIME alone. */
export function sniffMime(buf: Buffer, claimed: string): string | null {
  if (buf.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  if (buf[0] === 0x50 && buf[1] === 0x4b) return claimed.includes("wordprocessingml") ? claimed : null;
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return claimed.startsWith("audio") ? "audio/webm" : "video/webm";
  if (buf.subarray(4, 8).toString() === "ftyp") return "video/mp4";
  if (claimed === "text/plain" && !buf.subarray(0, 2048).includes(0)) return "text/plain";
  return null;
}

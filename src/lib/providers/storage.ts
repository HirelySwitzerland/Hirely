import fs from "node:fs/promises";
import path from "node:path";
import { decryptBuffer, encryptBuffer, randomToken } from "@/lib/crypto";
import { db } from "@/lib/db";

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

/** Same encryption, kept in the database (STORAGE_PROVIDER=db): for serverless hosting where files on disk do not survive. */
class DbEncryptedStorage implements StorageProvider {
  name = "db-encrypted";
  async put(orgId: string, prefix: string, data: Buffer, ext: string) {
    const safeExt = ext.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
    const key = `${orgId}/${prefix}/${randomToken(16)}.${safeExt}.enc`;
    await db.storedObject.create({ data: { key, orgId, data: new Uint8Array(encryptBuffer(data)) } });
    return key;
  }
  async get(key: string) {
    const o = await db.storedObject.findUnique({ where: { key } });
    if (!o) throw new Error("File not found");
    return decryptBuffer(Buffer.from(o.data));
  }
  async delete(key: string) {
    await db.storedObject.deleteMany({ where: { key } });
  }
}

let instance: StorageProvider | null = null;
export function getStorage(): StorageProvider {
  if (!instance) instance = process.env.STORAGE_PROVIDER === "db" ? new DbEncryptedStorage() : new LocalEncryptedStorage();
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

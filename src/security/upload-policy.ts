/**
 * 上传文件在落盘前的检查。
 *
 * 扩展名、声明的 MIME、文件头要同时说得通。
 * 用户原始文件名不能变成真实路径。SVG 和 HTML 默认不能当同域脚本。
 */

import { randomBytes } from "node:crypto";
import { extname } from "node:path";

const BLOCKED_EXTENSIONS = new Set([
  "svg",
  "html",
  "htm",
  "xhtml",
  "js",
  "mjs",
  "cjs",
  "php",
  "exe",
  "dll",
  "sh",
  "bat",
]);

const IMAGE_SIGNATURES: Array<{ mime: string; bytes: number[] }> = [
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

export type UploadDecision = { ok: true; extension: string; storedName: string } | { ok: false; error: string };

export function extensionOf(fileName: string): string {
  return extname(fileName).replace(/^\./, "").toLowerCase();
}

export function containsPathTraversal(fileName: string): boolean {
  return fileName.includes("..") || fileName.includes("/") || fileName.includes("\\") || fileName.includes("\0");
}

export function matchesImageSignature(bytes: Uint8Array, mime: string): boolean {
  const normalized = mime === "image/jpg" ? "image/jpeg" : mime;
  const signature = IMAGE_SIGNATURES.find((item) => item.mime === normalized);
  if (!signature) return false;
  if (bytes.length < signature.bytes.length) return false;
  return signature.bytes.every((value, index) => bytes[index] === value);
}

export function inspectImageUpload(input: {
  fileName: string;
  mime: string;
  size: number;
  bytes: Uint8Array;
  maxBytes: number;
}): UploadDecision {
  if (containsPathTraversal(input.fileName)) return { ok: false, error: "文件名不合法" };
  if (input.size <= 0 || input.size > input.maxBytes) return { ok: false, error: "文件大小不符合要求" };
  const extension = extensionOf(input.fileName);
  if (!extension || BLOCKED_EXTENSIONS.has(extension)) return { ok: false, error: "不支持该文件类型" };
  const mime = input.mime === "image/jpg" ? "image/jpeg" : input.mime;
  const allowed = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
  if (!allowed.has(mime)) return { ok: false, error: "不支持该文件类型" };
  if (!matchesImageSignature(input.bytes, mime)) return { ok: false, error: "文件内容与类型不符" };
  return { ok: true, extension, storedName: `${randomBytes(16).toString("hex")}.${extension}` };
}

export function uploadContentDisposition(mime: string, downloadName: string): string {
  const safeName = downloadName.replace(/["\r\n]/g, "").slice(0, 120) || "download";
  if (mime.startsWith("image/") && mime !== "image/svg+xml") return "inline";
  return `attachment; filename="${safeName}"`;
}

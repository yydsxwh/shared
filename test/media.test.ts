import { test } from "node:test";
import assert from "node:assert/strict";

import {
  classifyMediaKind,
  fileExtension,
  formatBytes,
  inferMimeType,
  isAllowedUpload,
  isMediaKind,
  truncateLabel,
} from "../src/types/media";

test("按 MIME 判定媒体类型，认不出再看扩展名", () => {
  assert.equal(classifyMediaKind("video/mp4"), "VIDEO");
  assert.equal(classifyMediaKind("image/png"), "IMAGE");
  assert.equal(classifyMediaKind("audio/mpeg"), "AUDIO");
  assert.equal(classifyMediaKind("application/pdf"), "DOCUMENT");
  assert.equal(classifyMediaKind("", "note.docx"), "DOCUMENT");
  assert.equal(classifyMediaKind("application/x-msdownload", "setup.exe"), "OTHER");
});

test("浏览器给空或 octet-stream 时用扩展名补 MIME", () => {
  assert.equal(inferMimeType("", "a.png"), "image/png");
  assert.equal(inferMimeType("application/octet-stream", "a.mp4"), "video/mp4");
  assert.equal(inferMimeType("image/webp", "a.png"), "image/webp");
  assert.equal(inferMimeType("", "no-ext"), "application/octet-stream");
});

test("上传白名单：MIME 不准时扩展名已知也放行", () => {
  assert.equal(isAllowedUpload("image/png", "a.png"), true);
  assert.equal(isAllowedUpload("application/octet-stream", "a.docx"), true);
  assert.equal(isAllowedUpload("application/x-msdownload", "virus.exe"), false);
});

test("扩展名解析要忽略 query 与 hash", () => {
  assert.equal(fileExtension("a.PNG"), "png");
  assert.equal(fileExtension("a.png?v=2"), "png");
  assert.equal(fileExtension("noext"), "");
});

test("展示辅助", () => {
  assert.equal(isMediaKind("VIDEO"), true);
  assert.equal(isMediaKind("MOVIE"), false);
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(2048), "2.0 KB");
  assert.equal(formatBytes(3 * 1024 * 1024), "3.0 MB");
  assert.equal(truncateLabel("abcdef", 4), "abc…");
});

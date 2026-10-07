#!/usr/bin/env node
/**
 * 不依赖 GitHub Advanced Security 的本地安全门禁。
 * gitleaks 或 npm audit 没安装时只记录，不把缺少工具当成代码失败。
 */

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skip = new Set(["node_modules", ".git", "dist", ".next"]);
let failed = 0;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (skip.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function fail(message) {
  failed += 1;
  console.error(`FAIL ${message}`);
}

const files = walk(root).filter((file) => /\.(ts|tsx|js|mjs)$/.test(file));
const dangerous = [
  [/\$queryRawUnsafe|\$executeRawUnsafe/, "unsafe raw SQL"],
  [/\beval\s*\(/, "eval"],
  [/new Function\s*\(/, "Function constructor"],
];
for (const file of files) {
  if (file.endsWith("security-check.mjs")) continue;
  const text = readFileSync(file, "utf8");
  for (const [pattern, label] of dangerous) {
    if (pattern.test(text)) fail(`${label} in ${path.relative(root, file)}`);
  }
}

const trackedEnv = spawnSync("git", ["ls-files", "--", ".env", ".env.local", ".env.production"], {
  cwd: root,
  encoding: "utf8",
});
if ((trackedEnv.stdout || "").trim()) fail(`tracked env file: ${trackedEnv.stdout.trim()}`);

console.log("security tests");
const tests = spawnSync("npm", ["test"], { cwd: root, stdio: "inherit" });
if (tests.status !== 0) fail("npm test");

const gitleaks = spawnSync("gitleaks", ["detect", "--no-git", "--redact", "--source", root, "--config", path.join(root, ".gitleaks.toml")], {
  encoding: "utf8",
});
if (gitleaks.error) {
  console.log("NEEDS_OWNER_ACTION: install gitleaks to scan git history; built-in pattern scan still ran");
} else if (gitleaks.status !== 0) {
  fail("gitleaks reported a finding; values were redacted");
  process.stderr.write(gitleaks.stdout || "");
}

const audit = spawnSync("npm", ["audit", "--omit=dev", "--audit-level=high"], { cwd: root, encoding: "utf8" });
if (audit.status !== 0) {
  console.log("dependency high/critical findings (report only, not an automatic upgrade):");
  process.stdout.write((audit.stdout || "").slice(0, 2000));
}

if (failed > 0) {
  console.error(`security:check failed (${failed})`);
  process.exit(1);
}
console.log("security:check passed");

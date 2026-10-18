// Checks the site as Pages will serve it: every internal link and fragment resolves, every
// page has a title and the viewport meta, no page is over 1 MB, and tags balance.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { SITE_ROOT } from "./lib/sources.mjs";

export const OUTPUT_DIRS = ["docs", "plugins", "specs", "configure", "api"];
const MAX_BYTES = 1024 * 1024;
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : e.name.endsWith(".html") ? [p] : [];
  });
}

/** The site's HTML files, as site-root-relative paths, sorted. */
export function siteFiles(root = SITE_ROOT) {
  const files = ["index.html", "404.html"].filter((f) => existsSync(path.join(root, f)));
  for (const d of OUTPUT_DIRS) files.push(...walk(path.join(root, d)).map((p) => path.relative(root, p).split(path.sep).join("/")));
  return files.sort();
}

/** Unclosed or stray tags, as messages. */
export function tagBalance(html) {
  const problems = [];
  const stack = [];
  const text = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "<$1></$1>");
  for (const m of text.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g)) {
    const [, close, rawName, selfClose] = m;
    const name = rawName.toLowerCase();
    if (VOID.has(name) || selfClose) continue;
    if (!close) {
      stack.push(name);
      continue;
    }
    if (stack.at(-1) === name) {
      stack.pop();
      continue;
    }
    const line = text.slice(0, m.index).split("\n").length;
    problems.push(`line ${line}: </${name}> closes <${stack.at(-1) ?? "nothing"}>`);
    const at = stack.lastIndexOf(name);
    if (at >= 0) stack.length = at;
  }
  if (stack.length) problems.push(`unclosed at the end: ${stack.join(" > ")}`);
  return problems;
}

/** Runs every check over the site; returns errors, warnings, the page count and total size. */
export function check(root = SITE_ROOT) {
  const files = siteFiles(root);
  const errors = [];
  const warnings = [];
  const html = new Map(files.map((f) => [f, readFileSync(path.join(root, f), "utf8")]));
  const ids = new Map();
  const idsOf = (f) => {
    if (!ids.has(f)) ids.set(f, new Set([...html.get(f).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
    return ids.get(f);
  };
  let bytes = 0;
  for (const f of files) {
    const page = html.get(f);
    const size = statSync(path.join(root, f)).size;
    bytes += size;
    if (size > MAX_BYTES) errors.push(`${f}: ${size} bytes, over 1 MB`);
    if (!/<title>[^<]+<\/title>/.test(page)) errors.push(`${f}: no <title>`);
    if (!/<meta name="viewport" content="width=device-width, initial-scale=1">/.test(page)) errors.push(`${f}: no viewport meta`);
    for (const p of tagBalance(page)) errors.push(`${f}: ${p}`);
    const seen = new Map();
    for (const m of page.matchAll(/\sid="([^"]+)"/g)) seen.set(m[1], (seen.get(m[1]) ?? 0) + 1);
    for (const [id, n] of seen) if (n > 1) errors.push(`${f}: id "${id}" used ${n} times`);
    for (const m of page.matchAll(/\s(?:href|src|srcset)="([^"]*)"/g)) {
      const url = m[1].replace(/&amp;/g, "&");
      if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//")) continue;
      const [pathPart, frag] = url.split("#");
      let target;
      if (pathPart === "") target = f;
      else if (pathPart.startsWith("/")) target = pathPart.slice(1);
      else target = path.posix.normalize(path.posix.join(path.posix.dirname(f), pathPart));
      if (target === "" || target.endsWith("/")) target += "index.html";
      if (target.startsWith("../")) {
        errors.push(`${f}: link leaves the site: ${url}`);
        continue;
      }
      if (!existsSync(path.join(root, target))) {
        errors.push(`${f}: broken link ${url}`);
        continue;
      }
      if (frag && target.endsWith(".html") && html.has(target)) {
        let id = frag;
        try {
          id = decodeURIComponent(frag);
        } catch {}
        if (!idsOf(target).has(id)) errors.push(`${f}: no #${frag} in ${target}`);
      }
    }
  }
  return { files, errors, warnings, bytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = check();
  for (const w of r.warnings) console.warn(`warning: ${w}`);
  for (const e of r.errors) console.error(`error: ${e}`);
  console.log(`${r.files.length} pages, ${(r.bytes / 1024).toFixed(0)} KiB, ${r.errors.length} errors`);
  process.exit(r.errors.length ? 1 : 0);
}

// HTML helpers shared by every renderer: escaping, heading ids, relative links.

import path from "node:path";

export function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function stripTags(html) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** GitHub's heading anchor rule, so links written against GitHub keep working. */
export function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, "")
    .replace(/ /g, "-");
}

/** Hands out unique slugs within one page: `a`, `a-1`, `a-2`. */
export class Slugger {
  constructor() {
    this.used = new Set();
    this.counts = new Map();
  }
  slug(text) {
    const base = slugify(text) || "section";
    let slug = base;
    let n = this.counts.get(base) ?? 0;
    while (this.used.has(slug)) {
      n += 1;
      slug = `${base}-${n}`;
    }
    this.counts.set(base, n);
    this.used.add(slug);
    return slug;
  }
}

/** The relative URL from the page at `from` to `to` (both site-root-relative paths). */
export function rel(from, to) {
  const [file, frag = ""] = to.split("#");
  let r = path.posix.relative(path.posix.dirname(from), file);
  if (r === "") r = path.posix.basename(file);
  return frag ? `${r}#${frag}` : r;
}

/** The first sentence-sized chunk of rendered HTML, as plain text, for index summaries. */
export function summarize(html, max = 220) {
  const m = html.match(/<p>([\s\S]*?)<\/p>/);
  if (!m) return "";
  const text = stripTags(m[1]).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))} …`;
}

// The shared header, documentation navigation and footer used throughout the site.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { rel } from "./html.mjs";
import { SITE_ROOT } from "./sources.mjs";

const PRIMARY_NAV = [
  ["What it's for", "index.html#uses"],
  ["Privacy", "index.html#privacy"],
  ["How it works", "how-it-works/index.html"],
  ["Download", "index.html#download"],
  ["Community", "index.html#community"],
  ["Get started", "docs/client/getting-started.html"],
  ["Docs", "docs/index.html"],
];

/**
 * The handwritten pages whose shared header and footer the build writes, each with the main
 * navigation entry it is the page of.
 */
export const HANDWRITTEN = [
  { file: "index.html", current: null },
  { file: "how-it-works/index.html", current: "How it works" },
];

const DOCS_NAV = [
  ["Overview", "docs/index.html"],
  ["Self-host", "docs/self-hosting.html"],
  ["Configure", "configure/index.html"],
  ["Plugins", "plugins/index.html"],
  ["API", "api/index.html"],
  ["Specs", "specs/index.html"],
];

/** The site header; `current` names the main navigation entry the page belongs to. */
export function renderHeader(link, current = null) {
  const links = PRIMARY_NAV.map(([text, href]) => {
    const mark = text === current ? ' aria-current="location"' : "";
    return `      <a href="${link(href)}"${mark}>${text}</a>`;
  }).join("\n");
  return `<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="${link("index.html")}" aria-label="RIM home"><img src="${link("assets/rim-lockup-inverse.svg")}" alt="" width="67" height="25"></a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-navigation">Menu</button>
    <nav class="site-nav" id="site-navigation" data-open="false" aria-label="Main navigation">
${links}
    </nav>
  </div>
</header>`;
}

export function renderDocsNav(link, currentPage) {
  const links = DOCS_NAV.map(([text, href]) => {
    const current = currentPage === href ? ' aria-current="page"' : "";
    return `<a href="${link(href)}"${current}>${text}</a>`;
  }).join("\n");
  return `<div class="docs-navigation"><nav class="container docs-links" aria-label="Documentation"><span>Documentation</span>${links}</nav></div>`;
}

export function renderFooter(link, source = "") {
  return `<footer class="site-footer container"><span class="footer-brand"><img src="${link("assets/rim-lockup-inverse.svg")}" alt="RIM" width="43" height="16"> · Apache-2.0</span><span>Open source. Decentralized. Yours to shape.</span><a href="https://github.com/rim-platform">Explore the source ↗</a></footer>${source ? `\n<p class="source-provenance container">${source}</p>` : ""}`;
}

/** Writes only the marked shared header and footer blocks of each handwritten page. */
export function writeHandwrittenChrome() {
  for (const page of HANDWRITTEN) {
    const file = path.join(SITE_ROOT, page.file);
    let html = readFileSync(file, "utf8");
    const link = (href) => {
      if (page.file === "index.html" && href.startsWith("index.html#")) return href.slice("index.html".length);
      return rel(page.file, href);
    };
    for (const [name, content] of [["header", renderHeader(link, page.current)], ["footer", renderFooter(link)]]) {
      const start = `<!-- site-${name}:start -->`;
      const end = `<!-- site-${name}:end -->`;
      const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
      if (!pattern.test(html)) throw new Error(`${page.file}: missing shared ${name} markers`);
      html = html.replace(pattern, () => `${start}\n${content}\n${end}`);
    }
    if (html !== readFileSync(file, "utf8")) writeFileSync(file, html);
  }
}

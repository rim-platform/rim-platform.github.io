// The shared header, documentation navigation and footer used throughout the site.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { SITE_ROOT } from "./sources.mjs";

const PRIMARY_NAV = [
  ["Privacy", "index.html#privacy"],
  ["How it works", "index.html#how"],
  ["Capabilities", "index.html#capabilities"],
  ["Community", "index.html#community"],
  ["Download", "index.html#download"],
  ["Get started", "docs/client/getting-started.html"],
  ["Docs", "docs/index.html"],
];

const DOCS_NAV = [
  ["Overview", "docs/index.html"],
  ["Self-host", "docs/self-hosting.html"],
  ["Configure", "configure/index.html"],
  ["Plugins", "plugins/index.html"],
  ["API", "api/index.html"],
  ["Specs", "specs/index.html"],
];

export function renderHeader(link, documentation = false) {
  const links = PRIMARY_NAV.map(([text, href]) => {
    const current = documentation && text === "Docs" ? ' aria-current="location"' : "";
    return `      <a href="${link(href)}"${current}>${text}</a>`;
  }).join("\n");
  return `<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="${link("index.html")}" aria-label="RIM home"><img src="${link("assets/rim-mark-inverse.svg")}" alt="" width="32" height="32">RIM</a>
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
  return `<footer class="site-footer container"><span class="footer-brand"><img src="${link("assets/rim-mark-inverse.svg")}" alt="" width="21" height="21"> RIM · Apache-2.0</span><span>Open source. Decentralized. Yours to shape.</span><a href="https://github.com/rim-platform">Explore the source ↗</a></footer>${source ? `\n<p class="source-provenance container">${source}</p>` : ""}`;
}

/** Writes only the marked shared header and footer blocks of the handwritten homepage. */
export function writeHomepageChrome() {
  const file = path.join(SITE_ROOT, "index.html");
  let html = readFileSync(file, "utf8");
  const homeLink = (href) => href.startsWith("index.html#") ? href.slice("index.html".length) : href;
  for (const [name, content] of [["header", renderHeader(homeLink)], ["footer", renderFooter(homeLink)]]) {
    const start = `<!-- site-${name}:start -->`;
    const end = `<!-- site-${name}:end -->`;
    const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
    if (!pattern.test(html)) throw new Error(`index.html: missing shared ${name} markers`);
    html = html.replace(pattern, () => `${start}\n${content}\n${end}`);
  }
  if (html !== readFileSync(file, "utf8")) writeFileSync(file, html);
}

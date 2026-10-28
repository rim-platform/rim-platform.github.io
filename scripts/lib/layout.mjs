// The shared page shell: nav, breadcrumbs, table of contents, footer.

import { readFileSync } from "node:fs";
import path from "node:path";

import { esc, rel } from "./html.mjs";
import { SITE_ROOT } from "./sources.mjs";

const TEMPLATE = readFileSync(path.join(SITE_ROOT, "templates", "layout.html"), "utf8");

/** The site nav, the landing page's sections plus the rendered sections. */
const NAV = [
  { key: "what", text: "What RIM is", href: "index.html#what" },
  { key: "how", text: "How it works", href: "index.html#how" },
  { key: "download", text: "Download", href: "index.html#download" },
  { key: "selfhost", text: "Self-host", href: "docs/self-hosting.html" },
  { key: "configure", text: "Configure", href: "configure/index.html" },
  { key: "plugins", text: "Plugins", href: "plugins/index.html" },
  { key: "docs", text: "Docs", href: "docs/index.html" },
  { key: "api", text: "API", href: "api/index.html" },
  { key: "specs", text: "Specs", href: "specs/index.html" },
  { key: "contribute", text: "Contribute", href: "docs/contributing.html" },
];

/** Headings needed before a page gets a table of contents. */
const TOC_MIN = 4;

function tocHtml(headings) {
  const items = [];
  for (const h of headings) {
    if (h.level === 2 || items.length === 0) items.push({ h, children: [] });
    else items.at(-1).children.push(h);
  }
  const a = (h) => `<a href="#${esc(h.id)}">${esc(h.text)}</a>`;
  const li = ({ h, children }) =>
    `<li>${a(h)}${children.length ? `<ol>${children.map((c) => `<li>${a(c)}</li>`).join("")}</ol>` : ""}</li>`;
  return `<ol>\n${items.map(li).join("\n")}\n</ol>`;
}

/**
 * Renders one page. `page.out` is its site path; `root` overrides the relative prefix to the
 * site root (the 404 page is served at any path, so it uses `/`).
 */
export function renderPage(page) {
  const root = page.root ?? prefixToRoot(page.out);
  const link = (href) => (page.root ? page.root + href : rel(page.out, href));
  const nav = NAV.map((n) => {
    const current = n.key === page.section ? ' aria-current="page"' : "";
    return `      <a href="${link(n.href)}"${current}>${n.text}</a>`;
  })
    .concat('      <a href="https://github.com/rim-platform" rel="noopener">GitHub</a>')
    .join("\n");
  const crumbs = page.crumbs?.length
    ? `  <div class="crumbs">${page.crumbs
        .map((c) => (c.href ? `<a href="${link(c.href)}">${esc(c.text)}</a>` : `<span>${esc(c.text)}</span>`))
        .join('<span aria-hidden="true">/</span>')}</div>`
    : "";
  const headings = page.headings ?? [];
  const withToc = page.toc !== false && (page.toc === true || headings.length >= TOC_MIN) && headings.length > 0;
  const toc = withToc
    ? `    <aside class="toc" aria-label="On this page"><details open><summary>On this page</summary>\n${tocHtml(headings)}\n</details></aside>`
    : "";
  const scripts = [
    withToc
      ? "<script>if(matchMedia('(max-width: 900px)').matches){for(const d of document.querySelectorAll('.toc details'))d.open=false}</script>"
      : "",
    page.scripts ?? "",
  ]
    .filter(Boolean)
    .join("\n");
  const title = page.title === "RIM" ? "RIM" : `${page.title} · RIM`;
  const fill = {
    title: esc(title),
    description: esc(page.description ?? page.title),
    root,
    nav,
    crumbs,
    layoutClass: withToc ? " with-toc" : "",
    toc,
    content: page.content,
    footer: page.footer ?? "",
    scripts,
  };
  return TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in fill)) throw new Error(`layout: no value for {{${k}}}`);
    return fill[k];
  });
}

function prefixToRoot(out) {
  const depth = out.split("/").length - 1;
  return "../".repeat(depth);
}

/** Footer text for a page rendered from one source file. */
export function sourceFooter(source, file) {
  return `Rendered from <a href="${source.github(file)}">${esc(source.name.split("/")[1])}/${esc(file)}</a> at <code>${source.short}</code>`;
}

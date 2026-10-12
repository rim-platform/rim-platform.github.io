// Markdown to HTML with heading ids, links rewritten to rendered pages or GitHub, and code
// spans that name a repository path turned into links.

import path from "node:path";

import { Marked } from "marked";

import { Slugger, esc, rel, stripTags } from "./html.mjs";

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** HTML tags passed through from Markdown; any other `<word>` is a placeholder and shown as text. */
const HTML_TAGS = new Set(
  ("a abbr b blockquote br caption code col colgroup dd del details div dl dt em figcaption figure " +
    "h1 h2 h3 h4 h5 h6 hr i img ins kbd li mark ol p picture pre q s samp small source span strong " +
    "sub summary sup table tbody td tfoot th thead tr u ul var video").split(" "),
);

/** Escapes the tags of raw HTML that are not HTML elements, such as `<name>` in prose. */
function placeholdersAsText(text) {
  return text.replace(/<(\/?)([a-zA-Z][\w-]*)([^<>]*)>/g, (m, _slash, name) =>
    HTML_TAGS.has(name.toLowerCase()) ? m : esc(m),
  );
}
const GITHUB = /^https:\/\/github\.com\/rim-platform\/(rim-server|rim-ui)\/(?:blob|tree)\/[^/]+\/([^#?]*)(#.*)?$/;

/** Resolves links found in a source file to rendered pages or GitHub URLs at the commit. */
export class Linker {
  constructor(sources) {
    this.sources = sources;
    this.byRepo = { "rim-server": sources.server, "rim-ui": sources.ui };
    this.rendered = new Map();
    this.warnings = [];
  }

  /** Records that `file` of `source` is rendered at the site path `out`. */
  add(source, file, out) {
    this.rendered.set(`${source.key}:${file}`, out);
  }

  page(source, file) {
    return this.rendered.get(`${source.key}:${file}`);
  }

  /** The URL a Markdown link to `href` from `ctx` (source, srcPath, out) points at. */
  href(href, ctx) {
    if (!href) return href;
    if (href.startsWith("#")) return href;
    if (SCHEME.test(href) || href.startsWith("//")) {
      const gh = href.match(GITHUB);
      if (gh) {
        const out = this.page(this.byRepo[gh[1]], decodeURIComponent(gh[2]).replace(/\/$/, ""));
        if (out) return rel(ctx.out, out) + (gh[3] ?? "");
      }
      return href;
    }
    const hashAt = href.indexOf("#");
    const fragment = hashAt >= 0 ? href.slice(hashAt) : "";
    const bare = (hashAt >= 0 ? href.slice(0, hashAt) : href).split("?")[0];
    let source = ctx.source;
    let target = bare.startsWith("/")
      ? bare.slice(1)
      : path.posix.join(path.posix.dirname(ctx.srcPath), bare);
    target = path.posix.normalize(safeDecode(target)).replace(/\/$/, "");
    if (target.startsWith("../")) {
      const other = target.match(/^\.\.\/(rim-server|rim-ui)\/(.*)$/);
      if (!other) {
        this.warnings.push(`${ctx.source.key}:${ctx.srcPath}: link outside the repository: ${href}`);
        return href;
      }
      source = this.byRepo[other[1]];
      target = other[2];
    }
    const out = this.page(source, target);
    if (out) return rel(ctx.out, out) + fragment;
    const gh = source.github(target, fragment);
    if (gh) return gh;
    this.warnings.push(`${ctx.source.key}:${ctx.srcPath}: link to a path not in the repository: ${href}`);
    return `https://github.com/${source.name}/blob/${source.commit}/${target}${fragment}`;
  }

  /** A URL for a code span that names a file or directory of the repository, else null. */
  codePath(text, ctx) {
    if (!/^[\w.\-/]+$/.test(text) || text.startsWith("/") || text.startsWith(".")) return null;
    if (!text.includes("/") && !/\.[a-z]{1,5}$/i.test(text)) return null;
    const clean = text.replace(/\/$/, "");
    const candidates = [clean, path.posix.normalize(path.posix.join(path.posix.dirname(ctx.srcPath), clean))];
    for (const candidate of candidates) {
      const out = this.page(ctx.source, candidate);
      if (out) return rel(ctx.out, out);
    }
    for (const candidate of candidates) {
      const gh = ctx.source.github(candidate);
      if (gh) return gh;
    }
    return null;
  }
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Renders `md` for the page at `ctx.out`. Returns the HTML, the first h1 as the title, and
 * the h2/h3 headings for a table of contents.
 */
export function renderMarkdown(md, ctx, linker, { codeLinks = true, codeTypes = null } = {}) {
  const slugger = new Slugger();
  const headings = [];
  let title = null;
  let inLink = 0;
  const marked = new Marked({ gfm: true });
  marked.use({
    walkTokens(token) {
      if ((token.type === "link" || token.type === "image") && linker) {
        token.href = linker.href(token.href, ctx);
      }
    },
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const text = stripTags(inner).trim();
        const id = slugger.slug(text);
        if (depth === 1 && title === null) title = text;
        if (depth === 2 || depth === 3) headings.push({ id, text, level: depth });
        const anchor =
          depth > 1 ? ` <a class="anchor" href="#${id}" aria-label="Link to this section">#</a>` : "";
        return `<h${depth} id="${id}">${inner}${anchor}</h${depth}>\n`;
      },
      link({ href, title: linkTitle, tokens }) {
        inLink += 1;
        const inner = this.parser.parseInline(tokens);
        inLink -= 1;
        const t = linkTitle ? ` title="${esc(linkTitle)}"` : "";
        return `<a href="${esc(href ?? "")}"${t}>${inner}</a>`;
      },
      codespan({ text }) {
        const code = `<code>${esc(text)}</code>`;
        if (inLink) return code;
        const url = codeTypes?.(text) ?? (codeLinks && linker ? linker.codePath(text, ctx) : null);
        return url ? `<a href="${esc(url)}">${code}</a>` : code;
      },
      html({ text, block }) {
        const out = placeholdersAsText(text);
        if (!block || /^\s*<[a-zA-Z!/]/.test(out)) return out;
        return `<p>${out.trim()}</p>\n`;
      },
      code({ text, lang }) {
        const cls = lang ? ` class="language-${esc(lang.split(/\s/)[0])}"` : "";
        return `<pre><code${cls}>${esc(text)}</code></pre>\n`;
      },
    },
  });
  let html = marked.parse(md);
  html = html.replace(/<table>/g, '<div class="tablewrap"><table>').replace(/<\/table>/g, "</table></div>");
  return { html, title, headings };
}

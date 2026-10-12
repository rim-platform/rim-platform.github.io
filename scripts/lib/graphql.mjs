// The GraphQL reference, generated from rim-ui's committed copy of the server's SDL.

import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLString,
  Kind,
  buildASTSchema,
  parse,
  print,
} from "graphql";

import { esc, rel } from "./html.mjs";
import { renderMarkdown } from "./markdown.mjs";

const SDL = "schema.graphql";

/** Domains root fields are grouped by, matched against the words of the field name. */
const DOMAINS = [
  "workspace", "channel", "message", "conversation", "user", "device", "key", "plugin", "command",
  "keybind", "macro", "pipeline", "relay", "audit", "invite", "notification", "search", "presence",
  "emoji", "attachment", "report", "moderation", "server",
];

const BUILTIN_SCALARS = [GraphQLString, GraphQLInt, GraphQLFloat, GraphQLBoolean, GraphQLID];

/** The type pages, in the order the reference lists them. */
const KINDS = [
  { kind: Kind.OBJECT_TYPE_DEFINITION, page: "objects", title: "Objects", label: "object" },
  { kind: Kind.INTERFACE_TYPE_DEFINITION, page: "interfaces", title: "Interfaces", label: "interface" },
  { kind: Kind.UNION_TYPE_DEFINITION, page: "unions", title: "Unions", label: "union" },
  { kind: Kind.INPUT_OBJECT_TYPE_DEFINITION, page: "inputs", title: "Inputs", label: "input" },
  { kind: Kind.ENUM_TYPE_DEFINITION, page: "enums", title: "Enums", label: "enum" },
  { kind: Kind.SCALAR_TYPE_DEFINITION, page: "scalars", title: "Scalars", label: "scalar" },
  { kind: Kind.DIRECTIVE_DEFINITION, page: "directives", title: "Directives", label: "directive" },
];

function words(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .split(" ");
}

function domainOf(word) {
  return DOMAINS.find((d) => word === d || word === `${d}s` || word === `${d}es`) ?? null;
}

/**
 * The domain of a root field: its first word when that names a domain, else the first later
 * word that does (`createWorkspace` is a workspace field), else "other".
 */
export function fieldDomain(name) {
  const ws = words(name);
  return { strict: domainOf(ws[0]) ?? "other", domain: ws.map(domainOf).find(Boolean) ?? "other" };
}

const SEARCH_SCRIPT = `<script>
(() => {
  const q = document.getElementById("filter");
  if (!q) return;
  const items = [...document.querySelectorAll("[data-name]")];
  const groups = [...document.querySelectorAll("[data-group]")];
  const none = document.getElementById("filter-none");
  const run = () => {
    const v = q.value.trim().toLowerCase();
    let shown = 0;
    for (const el of items) {
      const hit = v ? el.dataset.name.toLowerCase().includes(v) : !el.closest("[data-search-only]");
      el.hidden = !hit;
      if (hit) shown += 1;
    }
    for (const g of groups) g.hidden = !g.querySelector("[data-name]:not([hidden])");
    if (none) none.hidden = shown > 0 || !v;
  };
  q.addEventListener("input", run);
  run();
})();
</script>`;

const searchBox = (what) =>
  `<input id="filter" class="search" type="search" placeholder="Filter ${what} by name" aria-label="Filter ${what} by name" autocomplete="off">\n<p id="filter-none" class="muted" hidden>Nothing matches.</p>\n`;

/** Builds every API page from the SDL. */
export function renderApi(ui, linker) {
  const sdl = ui.read(SDL);
  const doc = parse(sdl);
  buildASTSchema(doc);
  const schemaDef = doc.definitions.find((d) => d.kind === Kind.SCHEMA_DEFINITION);
  const roots = new Map(
    (schemaDef?.operationTypes ?? []).map((o) => [o.type.name.value, o.operation]),
  );
  if (!schemaDef) for (const n of ["Query", "Mutation", "Subscription"]) roots.set(n, n.toLowerCase());

  const href = new Map();
  for (const [name, op] of roots) href.set(name, `api/${op}.html`);
  const byKind = new Map(KINDS.map((k) => [k.kind, []]));
  for (const d of doc.definitions) {
    if (!byKind.has(d.kind)) continue;
    if (roots.has(d.name.value)) continue;
    byKind.get(d.kind).push(d);
  }
  const definedScalars = new Set(byKind.get(Kind.SCALAR_TYPE_DEFINITION).map((d) => d.name.value));
  for (const s of BUILTIN_SCALARS) {
    if (definedScalars.has(s.name)) continue;
    byKind.get(Kind.SCALAR_TYPE_DEFINITION).push({
      kind: Kind.SCALAR_TYPE_DEFINITION,
      name: { value: s.name },
      description: { value: s.description },
      builtin: true,
    });
  }
  for (const k of KINDS) {
    for (const d of byKind.get(k.kind)) {
      const id = k.kind === Kind.DIRECTIVE_DEFINITION ? `@${d.name.value}` : d.name.value;
      href.set(id, `api/${k.page}.html#${d.name.value}`);
    }
  }
  const rootFieldHref = new Map();
  const rootFieldCount = new Map();
  for (const d of doc.definitions) {
    if (d.kind !== Kind.OBJECT_TYPE_DEFINITION || !roots.has(d.name.value)) continue;
    for (const f of d.fields ?? []) {
      rootFieldCount.set(f.name.value, (rootFieldCount.get(f.name.value) ?? 0) + 1);
      rootFieldHref.set(f.name.value, `api/${roots.get(d.name.value)}.html#${f.name.value}`);
    }
  }

  /** Every place a type is referenced, for the "Used by" lines. */
  const usedBy = new Map();
  const use = (typeName, where) => {
    if (!usedBy.has(typeName)) usedBy.set(typeName, []);
    const list = usedBy.get(typeName);
    if (!list.some((w) => w.href === where.href)) list.push(where);
  };
  const named = (t) => (t.kind === Kind.NAMED_TYPE ? t.name.value : named(t.type));
  for (const d of doc.definitions) {
    if (!d.fields && !d.types) continue;
    const owner = d.name.value;
    const isRoot = roots.has(owner);
    for (const f of d.fields ?? []) {
      const where = isRoot
        ? { text: `${owner}.${f.name.value}`, href: `api/${roots.get(owner)}.html#${f.name.value}` }
        : { text: owner, href: href.get(owner) };
      use(named(f.type), where);
      for (const a of f.arguments ?? []) use(named(a.type), where);
    }
    for (const t of d.types ?? []) use(t.name.value, { text: owner, href: href.get(owner) });
  }

  const ctxFor = (out) => ({ source: ui, srcPath: SDL, out });
  const typeLink = (out) => (t) => {
    if (t.kind === Kind.NON_NULL_TYPE) return `${typeLink(out)(t.type)}!`;
    if (t.kind === Kind.LIST_TYPE) return `[${typeLink(out)(t.type)}]`;
    const name = t.name.value;
    const target = href.get(name);
    return target ? `<a href="${rel(out, target)}">${esc(name)}</a>` : esc(name);
  };
  const md = (text, out) => {
    if (!text) return "";
    const codeTypes = (code) => {
      const target = href.get(code) ?? (rootFieldCount.get(code) === 1 ? rootFieldHref.get(code) : null);
      return target ? rel(out, target) : null;
    };
    return renderMarkdown(text, ctxFor(out), linker, { codeLinks: false, codeTypes }).html;
  };
  const deprecation = (node) => {
    const dir = node.directives?.find((x) => x.name.value === "deprecated");
    if (!dir) return "";
    const reason = dir.arguments?.find((a) => a.name.value === "reason");
    return ` <span class="pill warm" title="${esc(reason ? print(reason.value) : "deprecated")}">deprecated</span>`;
  };
  const argsTable = (args, out) => {
    if (!args?.some((a) => a.description || a.defaultValue || a.directives?.length)) return "";
    const rows = args
      .map((a) => {
        const def = a.defaultValue ? ` <span class="faint">= ${esc(print(a.defaultValue))}</span>` : "";
        return `<tr><td><code>${esc(a.name.value)}</code></td><td><code>${typeLink(out)(a.type)}</code>${def}</td><td>${md(a.description?.value, out)}${deprecation(a)}</td></tr>`;
      })
      .join("\n");
    return `<div class="tablewrap"><table class="fields"><thead><tr><th>Argument</th><th>Type</th><th>Description</th></tr></thead><tbody>\n${rows}\n</tbody></table></div>`;
  };
  const signature = (f, out) => {
    const tl = typeLink(out);
    const args = f.arguments ?? [];
    const one = (a) => `${esc(a.name.value)}: ${tl(a.type)}${a.defaultValue ? ` = ${esc(print(a.defaultValue))}` : ""}`;
    const list = args.length > 2 ? `(\n  ${args.map(one).join("\n  ")}\n)` : args.length ? `(${args.map(one).join(", ")})` : "";
    return `<div class="sig">${esc(f.name.value)}${list}: ${tl(f.type)}</div>`;
  };

  const pages = [];
  const footer = `Generated from <a href="${ui.github(SDL)}">rim-ui/${SDL}</a>, the committed copy of the server's <code>/api/sdl</code>, at <code>${ui.short}</code>`;
  const report = { roots: {}, strictOther: 0, other: 0, otherFields: [], groups: {} };
  const searchIndex = [];

  for (const d of doc.definitions) {
    if (d.kind !== Kind.OBJECT_TYPE_DEFINITION || !roots.has(d.name.value)) continue;
    const op = roots.get(d.name.value);
    const out = `api/${op}.html`;
    const order = [];
    const buckets = new Map();
    for (const f of d.fields ?? []) {
      const { strict, domain } = fieldDomain(f.name.value);
      if (strict === "other") report.strictOther += 1;
      if (domain === "other") {
        report.other += 1;
        report.otherFields.push(`${d.name.value}.${f.name.value}`);
      }
      if (!buckets.has(domain)) {
        buckets.set(domain, []);
        if (domain !== "other") order.push(domain);
      }
      buckets.get(domain).push(f);
    }
    if (buckets.has("other")) order.push("other");
    report.roots[d.name.value] = d.fields?.length ?? 0;
    report.groups[d.name.value] = Object.fromEntries(order.map((g) => [g, buckets.get(g).length]));
    const headings = [];
    let body = `<h1>${esc(d.name.value)}</h1>\n<p class="lede">${d.fields.length} ${op === "query" ? "queries" : op === "mutation" ? "mutations" : "subscriptions"}, grouped by the domain their name starts with or names, in the order the schema lists them.${op === "subscription" ? " Subscriptions arrive over the WebSocket at <code>/api/ws</code>." : ""}</p>\n${searchBox("fields")}`;
    for (const g of order) {
      const fields = buckets.get(g);
      const title = g === "other" ? "Other" : g[0].toUpperCase() + g.slice(1);
      const id = `group-${g}`;
      headings.push({ id, text: `${title} (${fields.length})`, level: 2 });
      body += `<section data-group>\n<h2 id="${id}">${esc(title)} <span class="faint">${fields.length}</span></h2>\n`;
      for (const f of fields) {
        searchIndex.push({ name: f.name.value, kind: op, href: `${out}#${f.name.value}` });
        body += `<section class="entry" id="${esc(f.name.value)}" data-name="${esc(f.name.value)}">
<h3><code>${esc(f.name.value)}</code>${deprecation(f)}</h3>
${signature(f, out)}
<div class="desc">${md(f.description?.value, out) || '<p class="faint">No description in the schema.</p>'}</div>
${argsTable(f.arguments, out)}
</section>\n`;
      }
      body += "</section>\n";
    }
    pages.push({
      out,
      title: `${d.name.value} · API`,
      description: `Every field of the RIM GraphQL ${d.name.value} type.`,
      content: body,
      headings,
      toc: true,
      crumbs: [{ href: "api/index.html", text: "API" }, { text: d.name.value }],
      section: "api",
      footer,
      scripts: SEARCH_SCRIPT,
    });
  }

  const typeCounts = {};
  for (const k of KINDS) {
    const defs = byKind.get(k.kind);
    if (!defs.length) continue;
    typeCounts[k.page] = defs.length;
    const out = `api/${k.page}.html`;
    const headings = [];
    let body = `<h1>${k.title}</h1>\n<p class="lede">${defs.length} ${k.title.toLowerCase()}, in the order the schema defines them.</p>\n${searchBox(k.title.toLowerCase())}`;
    for (const d of defs) {
      const name = d.name.value;
      const shown = k.kind === Kind.DIRECTIVE_DEFINITION ? `@${name}` : name;
      headings.push({ id: name, text: shown, level: 3 });
      searchIndex.push({ name: shown, kind: k.label, href: `${out}#${name}` });
      let inner = "";
      if (k.kind === Kind.OBJECT_TYPE_DEFINITION || k.kind === Kind.INTERFACE_TYPE_DEFINITION || k.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION) {
        if (d.interfaces?.length) inner += `<p class="faint">Implements ${d.interfaces.map((i) => typeLink(out)(i)).join(", ")}</p>`;
        const rows = (d.fields ?? [])
          .map((f) => {
            const args = f.arguments?.length
              ? `(${f.arguments.map((a) => `${esc(a.name.value)}: ${typeLink(out)(a.type)}${a.defaultValue ? ` = ${esc(print(a.defaultValue))}` : ""}`).join(", ")})`
              : "";
            const def = f.defaultValue ? ` <span class="faint">= ${esc(print(f.defaultValue))}</span>` : "";
            return `<tr><td><code>${esc(f.name.value)}${args}</code></td><td><code>${typeLink(out)(f.type)}</code>${def}</td><td>${md(f.description?.value, out)}${deprecation(f)}</td></tr>`;
          })
          .join("\n");
        inner += `<div class="tablewrap"><table class="fields"><thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead><tbody>\n${rows}\n</tbody></table></div>`;
      } else if (k.kind === Kind.ENUM_TYPE_DEFINITION) {
        const rows = (d.values ?? [])
          .map((v) => `<tr><td><code>${esc(v.name.value)}</code></td><td>${md(v.description?.value, out)}${deprecation(v)}</td></tr>`)
          .join("\n");
        inner += `<div class="tablewrap"><table class="fields"><thead><tr><th>Value</th><th>Description</th></tr></thead><tbody>\n${rows}\n</tbody></table></div>`;
      } else if (k.kind === Kind.UNION_TYPE_DEFINITION) {
        inner += `<p>One of ${d.types.map((t) => typeLink(out)(t)).join(", ")}</p>`;
      } else if (k.kind === Kind.DIRECTIVE_DEFINITION) {
        inner += `<div class="sig">${esc(print({ ...d, description: undefined }))}</div>${argsTable(d.arguments, out)}`;
      }
      const users = usedBy.get(name) ?? [];
      const used =
        users.length && !d.builtin
          ? `<p class="faint">Used by ${users.map((w) => `<a href="${rel(out, w.href)}">${esc(w.text)}</a>`).join(", ")}</p>`
          : "";
      const builtin = d.builtin ? ' <span class="pill">built in</span>' : "";
      body += `<section class="entry" id="${esc(name)}" data-name="${esc(shown)}">
<h3><code>${esc(shown)}</code><span class="kind">${k.label}</span>${builtin}${deprecation(d)}</h3>
<div class="desc">${md(d.description?.value, out)}</div>
${inner}
${used}
</section>\n`;
    }
    pages.push({
      out,
      title: `${k.title} · API`,
      description: `The ${k.title.toLowerCase()} of the RIM GraphQL schema.`,
      content: body,
      headings,
      toc: true,
      crumbs: [{ href: "api/index.html", text: "API" }, { text: k.title }],
      section: "api",
      footer,
      scripts: SEARCH_SCRIPT,
    });
  }

  const out = "api/index.html";
  const typeTotal = KINDS.filter((k) => k.kind !== Kind.DIRECTIVE_DEFINITION).reduce((n, k) => n + byKind.get(k.kind).filter((d) => !d.builtin).length, 0);
  const cards = [
    { href: linker.page(linker.sources.server, "docs/api.md"), title: "Talking to a server", text: "The endpoints, the session cookie and CSRF, origins, limits, error codes and pagination: the contract around the schema." },
    ...[...roots].map(([name, op]) => ({ href: `api/${op}.html`, title: name, text: `${report.roots[name]} fields, grouped by domain.` })),
    ...KINDS.filter((k) => typeCounts[k.page]).map((k) => ({ href: `api/${k.page}.html`, title: k.title, text: `${typeCounts[k.page]} ${k.title.toLowerCase()}.` })),
  ];
  const hits = searchIndex
    .map((h) => `<li data-name="${esc(h.name)}"><a href="${rel(out, h.href)}"><code>${esc(h.name)}</code></a><span class="kind">${esc(h.kind)}</span></li>`)
    .join("\n");
  const body = `<h1>API</h1>
<p class="lede">Everything a client does goes through one GraphQL endpoint, <code>POST /api</code>; subscriptions arrive over <code>/api/ws</code>. The server publishes its schema at <code>/api/sdl</code>. This reference is generated from it: ${typeTotal} types, ${report.roots.Query ?? 0} queries, ${report.roots.Mutation ?? 0} mutations and ${report.roots.Subscription ?? 0} subscriptions.</p>
${searchBox("the whole schema")}<div data-search-only><ul class="hits">
${hits}
</ul></div>
<ul class="cards">
${cards.map((c) => `<li><a href="${rel(out, c.href)}"><b>${esc(c.title)}</b><span>${esc(c.text)}</span></a></li>`).join("\n")}
</ul>
`;
  pages.unshift({
    out,
    title: "API",
    description: "The RIM GraphQL API reference and the HTTP contract around it.",
    content: body,
    headings: [],
    crumbs: [],
    section: "api",
    footer,
    scripts: SEARCH_SCRIPT,
  });
  report.types = typeCounts;
  report.typeTotal = typeTotal;
  return { pages, report };
}

// The Markdown pages: which files are rendered, where they land, how they are grouped, and
// the index pages of the docs and the specs.

import path from "node:path";

import { esc, rel, summarize } from "./html.mjs";
import { sourceFooter } from "./layout.mjs";
import { renderMarkdown } from "./markdown.mjs";

/** Where a rim-server file is rendered. */
function serverOut(file) {
  if (file.startsWith("docs/specs/")) return `specs/${path.posix.basename(file, ".md")}.html`;
  if (file.startsWith("docs/")) return file.replace(/\.md$/, ".html");
  return `docs/${path.posix.basename(file, ".md").toLowerCase().replace(/_/g, "-")}.html`;
}

/** Where a rim-ui file is rendered. */
function uiOut(file) {
  if (file === "README.md") return "docs/client/guide.html";
  if (file === "sdk/plugin-sdk/README.md") return "docs/client/plugin-sdk.html";
  if (file === "docs/plugins.md") return "plugins/index.html";
  const example = file.match(/^plugins\/([^/]+)\/README\.md$/);
  if (example) return `docs/client/plugin-${example[1]}.html`;
  if (file.startsWith("docs/specs/")) return `specs/${path.posix.basename(file, ".md")}.html`;
  return `docs/client/${path.posix.basename(file, ".md")}.html`;
}

/**
 * The docs groups. Each item is `[repo, file]`; `"glob"` items expand to every Markdown file
 * of a directory, and rim-ui docs no group names land in the last subsection of "Using RIM".
 */
const GROUPS = [
  {
    key: "operators",
    title: "Operators",
    lede: "Running a RIM server: installing it with Docker Compose, upgrading and backing it up, watching it, switching features off, and running a public relay.",
    subs: [
      { title: "Install and run", items: [["server", "docs/self-hosting.md"], ["server", "docs/email.md"]] },
      { title: "Operations", items: [["server", "glob:docs/operations"]] },
      { title: "Identity and federation", items: [["server", "docs/server-identity.md"], ["server", "docs/relay.md"]] },
    ],
    extra: [{ href: "configure/index.html", title: "Configuration reference", text: "Every RIM_ variable with its default and meaning, and the command line." }],
  },
  {
    key: "client-authors",
    title: "Client authors",
    lede: "Talking to a RIM server from your own client: the HTTP and GraphQL contract, sessions and CSRF, pagination, messaging, search and the change feed.",
    subs: [
      {
        title: "The API",
        items: [
          ["server", "docs/api.md"],
          ["server", "docs/pagination.md"],
          ["server", "docs/messaging.md"],
          ["server", "docs/search.md"],
          ["server", "docs/message-change-feed.md"],
        ],
      },
    ],
    extra: [{ href: "api/index.html", title: "GraphQL reference", text: "Every query, mutation, subscription and type, generated from the schema." }],
  },
  {
    key: "plugin-authors",
    title: "Plugin authors",
    lede: "Extending the client: what a plugin is, the capabilities it asks for, a first plugin step by step, the TypeScript SDK and how it is published, the rim-plugin.json manifest, web plugins in a sandboxed frame, the desktop host and its example plugins, and signed workspace plugins.",
    subs: [
      { title: "The model", items: [["server", "docs/plugin_model.md"], ["server", "docs/capability_security_model.md"]] },
      {
        title: "Building a plugin",
        items: [
          ["ui", "docs/plugin-tutorial.md"],
          ["ui", "sdk/plugin-sdk/README.md"],
          ["ui", "docs/plugin-manifest.md"],
          ["ui", "docs/web-plugins.md"],
          ["ui", "docs/workspace-plugins.md"],
          ["ui", "docs/plugin-chat-methods.md"],
        ],
      },
      {
        title: "The desktop host and examples",
        items: [
          ["server", "docs/local_plugin_host.md"],
          ["ui", "plugins/hello-world/README.md"],
          ["ui", "plugins/template-ts/README.md"],
        ],
      },
      { title: "Publishing the SDK", items: [["ui", "docs/release-sdk.md"]] },
    ],
    extra: [
      { href: "specs/plugin-protocol-v1.html", title: "Plugin protocol v1", text: "The specification of the plugin protocol." },
      { href: "specs/web-plugins-v1.html", title: "Web plugins v1", text: "The specification of sandboxed web plugins." },
      { href: "specs/workspace-plugins-v1.html", title: "Workspace plugins v1", text: "The specification of the signed workspace registry." },
    ],
  },
  {
    key: "using-rim",
    title: "Using RIM",
    lede: "The desktop and web client: getting started from a fresh install to a first conversation, commands, keybinds, macros and pipelines, the AI agent, installing it and signing in, building it, the keyboard, plugins, keys and recovery, linking a device, encrypted conversations, relays and the local message cache.",
    subs: [
      {
        title: "Start here",
        items: [
          ["ui", "docs/getting-started.md"],
          ["ui", "docs/commands-and-automation.md"],
          ["ui", "docs/ai-agent.md"],
        ],
      },
      { title: "Install", items: [["ui", "docs/install.md"]] },
      {
        title: "The client",
        items: [
          ["ui", "README.md"],
          ["ui", "docs/keyboard.md"],
          ["ui", "docs/search-ui.md"],
          ["ui", "docs/updater.md"],
          ["ui", "docs/version-skew.md"],
        ],
      },
      { title: "Plugins", items: [["ui", "docs/plugins.md"]] },
      {
        title: "Keys, devices and encryption",
        items: [
          ["ui", "docs/identity-key-backup.md"],
          ["ui", "docs/device-linking-desktop.md"],
          ["ui", "docs/web-linked-device.md"],
          ["ui", "docs/e2ee-desktop.md"],
          ["ui", "docs/e2ee-web.md"],
          ["ui", "docs/secret-vault.md"],
          ["ui", "docs/local-message-cache.md"],
        ],
      },
      { title: "Relays", items: [["ui", "docs/relay-client.md"]] },
      { title: "More from the client", items: [], unassigned: true },
    ],
  },
  {
    key: "project",
    title: "Project",
    lede: "Where RIM is heading and how it is built: the vision, the server architecture and the design models, how to contribute, security with its overview and threat model, and the client's internals and branding.",
    subs: [
      {
        title: "Direction and design",
        items: [
          ["server", "docs/vision.md"],
          ["server", "docs/architecture.md"],
          ["server", "docs/command_model.md"],
          ["server", "docs/keybind_model.md"],
          ["server", "docs/context_model.md"],
        ],
      },
      {
        title: "Contributing",
        items: [["server", "CONTRIBUTING.md"], ["server", "CODE_OF_CONDUCT.md"], ["server", "CHANGELOG.md"]],
      },
      {
        title: "Security",
        items: [
          ["server", "docs/security-overview.md"],
          ["server", "SECURITY.md"],
          ["server", "docs/security/crypto-review-brief-2026-10.md"],
          ["server", "docs/security/audit-access-matrix.md"],
        ],
      },
      {
        title: "Client internals",
        items: [
          ["ui", "docs/ui-shell.md"],
          ["ui", "docs/error-boundaries.md"],
          ["ui", "docs/eslint-prettier.md"],
          ["ui", "docs/rim-mls.md"],
          ["ui", "docs/branding.md"],
        ],
      },
    ],
  },
];

/** Rendered docs that belong to their own nav section rather than "docs". */
const SECTION_OF = {
  "docs/self-hosting.html": "selfhost",
  "plugins/index.html": "plugins",
  "docs/contributing.html": "contribute",
};

/** Plans the docs and specs: every rendered file with its site path, registered in `linker`. */
export function planDocs(sources, linker) {
  const outOf = { server: serverOut, ui: uiOut };
  const docs = [];
  const seenOut = new Map();
  const add = (repo, file, group, sub) => {
    const source = sources[repo];
    if (!source.has(file)) throw new Error(`docs: ${source.name} has no ${file} at ${source.short}`);
    const out = outOf[repo](file);
    if (seenOut.has(out)) throw new Error(`docs: ${file} and ${seenOut.get(out)} both render to ${out}`);
    seenOut.set(out, file);
    const entry = { source, file, out, group, sub };
    linker.add(source, file, out);
    docs.push(entry);
    return entry;
  };
  const named = new Set();
  for (const group of GROUPS) {
    for (const sub of group.subs) {
      sub.entries = [];
      for (const [repo, item] of sub.items) {
        if (item.startsWith("glob:")) {
          for (const f of sources[repo].list(item.slice(5))) sub.entries.push(add(repo, f, group, sub));
        } else {
          sub.entries.push(add(repo, item, group, sub));
        }
        named.add(`${repo}:${item}`);
      }
    }
  }
  const leftover = groupByKey("using-rim").subs.find((s) => s.unassigned);
  const unassigned = [];
  for (const f of sources.ui.list("docs")) {
    if (f === "docs/README.md" || named.has(`ui:${f}`)) continue;
    unassigned.push(f);
    leftover.entries.push(add("ui", f, groupByKey("using-rim"), leftover));
  }
  const specs = [];
  for (const repo of ["server", "ui"]) {
    for (const f of sources[repo].list("docs/specs")) specs.push(add(repo, f, null, null));
  }
  return { docs: docs.filter((d) => d.group), specs, unassigned };
}

function groupByKey(key) {
  return GROUPS.find((g) => g.key === key);
}

/** Renders every planned Markdown file into page objects. */
export function renderDocs(plan, linker) {
  const pages = [];
  for (const entry of [...plan.docs, ...plan.specs]) {
    const md = entry.source.read(entry.file);
    const ctx = { source: entry.source, srcPath: entry.file, out: entry.out };
    const r = renderMarkdown(md, ctx, linker);
    entry.title = r.title ?? path.posix.basename(entry.file, ".md");
    entry.summary = summarize(r.html);
    let content = r.html;
    let crumbs;
    let section;
    if (entry.group) {
      crumbs = [
        { href: "docs/index.html", text: "Docs" },
        { href: `docs/${entry.group.key}.html`, text: entry.group.title },
        { text: entry.title },
      ];
      section = SECTION_OF[entry.out] ?? "docs";
    } else {
      entry.version = (entry.file.match(/-v(\d+)\.md$/) ?? [])[1];
      entry.status = (md.match(/^\s*[*_]{1,2}Status:\s*([^.*_]+)/m) ?? [])[1]?.trim();
      content = content.replace(/<\/h1>\n/, `</h1>\n${specStatus(entry)}\n`);
      crumbs = [{ href: "specs/index.html", text: "Specs" }, { text: entry.title }];
      section = "specs";
    }
    pages.push({
      out: entry.out,
      title: entry.title,
      description: entry.summary || entry.title,
      content,
      headings: r.headings,
      crumbs,
      section,
      footer: sourceFooter(entry.source, entry.file),
    });
  }
  return pages;
}

function specStatus(entry) {
  const repo = entry.source.name.split("/")[1];
  const parts = [
    `<span><b>${esc(entry.title)}</b></span>`,
    entry.version ? `<span>version ${esc(entry.version)}</span>` : "",
    entry.status ? `<span>status: ${esc(entry.status)}</span>` : "",
    `<span><a href="${entry.source.github(entry.file)}">${esc(repo)}/${esc(entry.file)}</a></span>`,
    `<span>commit <a href="https://github.com/${entry.source.name}/commit/${entry.source.commit}">${entry.source.short}</a></span>`,
  ];
  return `<p class="status">${parts.filter(Boolean).join("")}</p>`;
}

function card(from, href, title, text, src) {
  return `<li><a href="${rel(from, href)}"><b>${esc(title)}</b>${text ? `<span>${esc(text)}</span>` : ""}${src ? `<span class="src">${esc(src)}</span>` : ""}</a></li>`;
}

function srcLabel(entry) {
  return `${entry.source.name.split("/")[1]}/${entry.file}`;
}

/** The docs index and one index page per group. */
export function renderDocIndexes(sources) {
  const pages = [];
  for (const group of GROUPS) {
    const out = `docs/${group.key}.html`;
    let body = `<h1>${esc(group.title)}</h1>\n<p class="lede">${esc(group.lede)}</p>\n`;
    const headings = [];
    for (const sub of group.subs) {
      if (!sub.entries.length) continue;
      const id = sub.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      headings.push({ id, text: sub.title, level: 2 });
      body += `<h2 id="${id}">${esc(sub.title)}</h2>\n<ul class="cards">\n${sub.entries
        .map((e) => card(out, e.out, e.title, e.summary, srcLabel(e)))
        .join("\n")}\n</ul>\n`;
    }
    if (group.extra) {
      headings.push({ id: "see-also", text: "See also", level: 2 });
      body += `<h2 id="see-also">See also</h2>\n<ul class="cards">\n${group.extra
        .map((x) => card(out, x.href, x.title, x.text))
        .join("\n")}\n</ul>\n`;
    }
    pages.push({
      out,
      title: group.title,
      description: group.lede,
      content: body,
      headings,
      toc: false,
      crumbs: [{ href: "docs/index.html", text: "Docs" }, { text: group.title }],
      section: "docs",
      footer: renderedFrom(sources),
    });
  }
  let body = `<h1>Docs</h1>\n<p class="lede">Guides for the people who run RIM, build clients and plugins for it, use it, and work on it. Rendered from the server and client repositories at the commits named below.</p>\n`;
  const headings = [];
  for (const group of GROUPS) {
    const out = "docs/index.html";
    headings.push({ id: group.key, text: group.title, level: 2 });
    const entries = group.subs.flatMap((s) => s.entries);
    body += `<h2 id="${group.key}"><a href="${rel(out, `docs/${group.key}.html`)}">${esc(group.title)}</a></h2>\n<p class="muted">${esc(group.lede)}</p>\n<ul>\n${entries
      .map((e) => `<li><a href="${rel(out, e.out)}">${esc(e.title)}</a></li>`)
      .join("\n")}\n</ul>\n`;
  }
  pages.push({
    out: "docs/index.html",
    title: "Docs",
    description: "RIM documentation for operators, client authors, plugin authors, people using it, and contributors.",
    content: body,
    headings,
    crumbs: [],
    section: "docs",
    footer: renderedFrom(sources),
  });
  return pages;
}

/** The specs index. */
export function renderSpecIndex(plan, sources) {
  const out = "specs/index.html";
  const rows = plan.specs
    .map(
      (s) =>
        `<tr><td><a href="${rel(out, s.out)}">${esc(s.title)}</a></td><td>${s.version ? `v${esc(s.version)}` : ""}</td><td>${esc(s.status ?? "")}</td><td><code>${esc(srcLabel(s))}</code></td></tr>`,
    )
    .join("\n");
  const content = `<h1>Specifications</h1>
<p class="lede">The contracts a client, a plugin or another server is built against. Each page names the repository, the path and the commit it was rendered from.</p>
<div class="tablewrap"><table>
<thead><tr><th>Specification</th><th>Version</th><th>Status</th><th>Source</th></tr></thead>
<tbody>
${rows}
</tbody>
</table></div>
`;
  return {
    out,
    title: "Specifications",
    description: "The RIM protocol specifications.",
    content,
    headings: [],
    section: "specs",
    footer: renderedFrom(sources),
  };
}

/** Footer for a page built from both repositories. */
export function renderedFrom(sources) {
  return `Rendered from <a href="https://github.com/${sources.server.name}/tree/${sources.server.commit}">rim-server</a> <code>${sources.server.short}</code> and <a href="https://github.com/${sources.ui.name}/tree/${sources.ui.commit}">rim-ui</a> <code>${sources.ui.short}</code>`;
}

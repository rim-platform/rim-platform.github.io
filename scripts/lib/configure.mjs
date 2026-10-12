// The configuration reference, read from rim_server/src/config.rs and cross-checked with the
// Dockerfile's variable block. Variables read elsewhere in the server are found by a scan of
// string literals and described from README.md's configuration table.

import { esc, Slugger } from "./html.mjs";
import { renderMarkdown } from "./markdown.mjs";

const CONFIG = "rim_server/src/config.rs";
const DOCKERFILE = "Dockerfile";
const README = "README.md";

/** The groups of the landing page's Configure table, plus the limits. */
const GROUPS = [
  {
    title: "Listening",
    intro: "Where the server listens, the origin clients reach it at, and how it treats the proxy in front of it.",
    names: ["RIM_SERVER_HOST", "RIM_SERVER_PORT", "RIM_PUBLIC_BASE_URL", "RIM_CORS_ALLOWED_ORIGIN", "RIM_TRUST_FORWARDED_HEADERS", "RIM_FORCE_SECURE_COOKIES", "RIM_KEY_LOGIN_AUDIENCES"],
  },
  {
    title: "Database and data",
    intro: "PostgreSQL, the data directory, uploaded files and the key files. The data directory holds the server's identity: back it up.",
    names: ["DATABASE_URL", "RIM_DATABASE_MAX_CONNECTIONS", "RIM_DATA_DIR", "RIM_STORAGE_LOCAL_PATH", "RIM_MAX_WORKSPACE_STORAGE_BYTES", "RIM_SERVER_KEY_FILE", "RIM_FRANKING_KEY_FILE"],
  },
  {
    title: "Signups and sessions",
    intro: "Who may sign up and how long a session lasts. The default is invite-only; invites come from the command line.",
    names: ["RIM_OPEN_REGISTRATION", "RIM_REGISTRATION_POW_BITS", "RIM_SESSION_TTL_DAYS", "RIM_TERMS_URL"],
  },
  {
    title: "Roles and federation",
    intro: "Whether the server is a relay, a host or both, which servers it talks to, and the per-user quotas of a relay.",
    names: ["RIM_ROLE", "RIM_HOST_ALLOWED_RELAYS"],
    prefixes: ["RIM_S2S_", "RIM_RELAY_"],
  },
  {
    title: "Mail",
    intro: "Transactional email. Without RIM_SMTP_HOST and RIM_SMTP_FROM mail is only logged and the email feature reports itself unavailable.",
    names: ["RIM_NOTIFICATION_DIGEST_INTERVAL_SECS"],
    prefixes: ["RIM_SMTP_"],
  },
  {
    title: "Operations",
    intro: "Metrics, the audit log, features switched off on this instance, logging and the notice shown to people.",
    names: ["RIM_METRICS_ADDR", "RIM_AUDIT_LOG_PATH", "RIM_AUDIT_RETENTION_DAYS", "RIM_FEATURES_DISABLED", "RUST_LOG", "RIM_ENABLE_GRAPHIQL", "RIM_INSTANCE_NOTICE"],
  },
  {
    title: "Limits and rate limits",
    intro: "Request, mutation, message and connection limits of the API. Each is off until set.",
    names: ["RIM_API_MAX_BATCH"],
    prefixes: ["RIM_RATE_"],
  },
];

/** Text between the opening brace after `start` and its matching closing brace. */
function block(src, start) {
  const at = src.indexOf(start);
  if (at < 0) throw new Error(`configure: ${start} not found in ${CONFIG}`);
  let i = src.indexOf("{", at);
  const open = i;
  let depth = 0;
  for (; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  throw new Error(`configure: unbalanced ${start}`);
}

/** `RIMConfig` fields with their doc comments, in source order. */
function parseFields(src) {
  const fields = [];
  let doc = [];
  for (const raw of block(src, "pub struct RIMConfig").split("\n")) {
    const line = raw.trim();
    if (line.startsWith("///")) doc.push(line.replace(/^\/\/\/ ?/, ""));
    else if (line.startsWith("//")) continue;
    else {
      const m = line.match(/^pub (\w+):\s*(.+),$/);
      if (m) fields.push({ field: m[1], type: m[2], doc: doc.join("\n") });
      doc = [];
    }
  }
  return fields;
}

/** Doc comments of the functions of config.rs outside the tests, keyed by function name. */
function parseFunctionDocs(src) {
  const docs = new Map();
  const body = src.split("#[cfg(test)]")[0];
  let doc = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("///")) {
      doc.push(line.replace(/^\/\/\/ ?/, ""));
      continue;
    }
    if (line.startsWith("#[")) continue;
    const m = line.match(/^(?:pub(?:\([^)]*\))? )?(?:async )?fn (\w+)/);
    if (m && doc.length) docs.set(m[1], doc.join("\n"));
    doc = [];
  }
  return docs;
}

/** Bodies of `pub fn name(&self)` accessors, for the `unwrap_or` defaults. */
function accessorDefault(src, name) {
  const at = src.search(new RegExp(`fn ${name}\\(&self\\)`));
  if (at < 0) return null;
  const body = block(src.slice(at), `fn ${name}`);
  const m = body.match(/\.unwrap_or\(([^()]+)\)/);
  return m ? m[1].trim() : null;
}

/** Integer and string constants of config.rs, evaluated where they are simple products. */
function parseConsts(src) {
  const consts = new Map();
  for (const m of src.matchAll(/const (\w+): [^=]+= ([^;]+);/g)) consts.set(m[1], m[2].trim());
  return consts;
}

/** A Rust literal or simple expression as display text. */
function rustValue(expr, consts) {
  let e = expr.trim().replace(/,$/, "").trim();
  const wrapped = e.match(/^(?:i64|u64|u32|usize)::from\((\w+)\)$/) ?? e.match(/^(\w+) as \w+$/);
  if (wrapped) e = wrapped[1];
  if (consts.has(e)) e = consts.get(e);
  const str = e.match(/^"(.*)"(?:\.to_string\(\))?$/);
  if (str) return str[1];
  const ints = e.replace(/_?(?:i64|u64|u32|usize)\b/g, "").replace(/_/g, "");
  if (/^\d+(\s*\*\s*\d+)*$/.test(ints)) return String(ints.split("*").reduce((a, b) => a * Number(b.trim()), 1));
  return e;
}

/** `set_default` pairs of `load_from`, as display values. */
function parseSetDefaults(src, consts) {
  const out = new Map();
  for (const m of src.matchAll(/\.set_default\(\s*"(\w+)",\s*/g)) {
    let i = m.index + m[0].length;
    let depth = 1;
    const start = i;
    for (; i < src.length && depth > 0; i += 1) {
      if (src[i] === "(") depth += 1;
      else if (src[i] === ")") depth -= 1;
    }
    out.set(m[1], rustValue(src.slice(start, i - 1), consts));
  }
  return out;
}

/** A default stated in prose: "Default 600.", "Defaults to 587 …", "`both` (default)". */
function docDefault(doc) {
  const text = doc.replace(/\n/g, " ");
  let m = text.match(/\bDefaults?(?: to| and most|:)?\s+(`[^`]+`|[^.;(]+?)(?=\s*[.;(]|\s+when\b|$)/);
  if (m) return m[1].replace(/`/g, "").replace(/^"|"$/g, "").trim();
  m = text.match(/`"?([^`"]+)"?`\s*\(default\)/);
  if (m) return m[1];
  m = text.match(/driver's default of (\w+)/);
  if (m) return m[1];
  return null;
}

/** What leaving the variable unset does, when the prose says. */
function unsetMeaning(doc) {
  const m = doc.replace(/\n/g, " ").match(/\b[Uu]nset(?: or (?:0|empty|blank))? ((?:keeps|turns|sets|uses|allows)[^.;]*)/);
  return m ? m[1].trim() : null;
}

/** Drops the "Controlled by" sentence and intra-doc link brackets. */
function cleanDoc(doc, consts) {
  return doc
    .replace(/\s*Controlled by\s+`[^`]+`(?:;\s*see\s+\[`[^`]+`\](?:\s+for the defaults)?)?\s*\.?/g, "")
    .replace(/\s*\(`RIM_[A-Z0-9_]+`\)/g, "")
    .replace(/\[`(?:RIMConfig::)?(\w+)`\]/g, (_, name) => (consts.has(name) ? rustValue(name, consts) : `\`${name}\``))
    .trim();
}

/** Splits a function doc into its summary and its `# Errors` paragraph. */
function splitFnDoc(doc) {
  const parts = doc.split(/\n# /);
  const summary = parts[0].trim();
  const errors = parts.find((p) => p.startsWith("Errors"))?.replace(/^Errors\n/, "").trim() ?? null;
  return { summary, errors };
}

/** The Dockerfile's variable comment block and its ENV values. */
function parseDockerfile(src) {
  const vars = new Map();
  const lines = src.split("\n");
  let i = lines.findIndex((l) => /^# Runtime configuration via environment variables/.test(l));
  if (i < 0) throw new Error("configure: the Dockerfile has no variable block");
  let current = null;
  for (i += 1; i < lines.length; i += 1) {
    const line = lines[i];
    const entry = line.match(/^#\s{2,3}([A-Z][A-Z0-9_]*\*?)\s+—\s+(.*)$/);
    if (entry) {
      current = { name: entry[1], text: entry[2].trim() };
      vars.set(current.name, current);
      continue;
    }
    const more = line.match(/^#\s{4,}(\S.*)$/);
    if (more && current) {
      current.text += ` ${more[1].trim()}`;
      continue;
    }
    break;
  }
  for (const v of vars.values()) {
    const d = v.text.match(/\(default:\s*([^)]+)\)/);
    v.default = d ? d[1].trim() : null;
  }
  const env = new Map();
  const envBlock = src.match(/^ENV ((?:.*\\\n)*.*)$/m);
  if (envBlock) {
    for (const m of envBlock[1].matchAll(/([A-Z][A-Z0-9_]*)=(\S+)/g)) env.set(m[1], m[2]);
  }
  return { vars, env };
}

/** `| `NAME` | effect |` rows of README.md's configuration table. */
function parseReadmeTable(src) {
  const rows = new Map();
  for (const m of src.matchAll(/^\|\s*`([A-Z][A-Z0-9_]+)`\s*\|\s*(.+?)\s*\|\s*$/gm)) rows.set(m[1], m[2]);
  return rows;
}

/** A Dockerfile description as a sentence, without its default. */
function dockerText(dk) {
  const t = dk.text.replace(/\s*\((?:default:[^)]*|required)\)/g, "").trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

const numeric = (v) => (v == null ? null : /^[\d,]+$/.test(v.trim()) ? v.replace(/,/g, "") : null);

/** Collects every variable, its default, meaning and cross-check notes. */
export function readConfig(server) {
  const src = server.read(CONFIG);
  const consts = parseConsts(src);
  const fields = parseFields(src);
  const fnDocs = parseFunctionDocs(src);
  const setDefaults = parseSetDefaults(src, consts);
  const unprefixed = new Set([...(src.match(/UNPREFIXED_VARIABLES: &\[&str\] = &\[([^\]]*)\]/)?.[1] ?? "").matchAll(/"(\w+)"/g)].map((m) => m[1]));
  const docker = parseDockerfile(server.read(DOCKERFILE));
  const readme = parseReadmeTable(server.read(README));
  const report = { fromConfig: 0, noDoc: [], dockerOnlyMeaning: [], notInDocker: [], wildcardOnly: [], dockerNotInConfig: [], extras: [], mismatches: [] };

  const vars = [];
  for (const f of fields) {
    const name = unprefixed.has(f.field.toUpperCase()) ? f.field.toUpperCase() : `RIM_${f.field.toUpperCase()}`;
    const v = { name, field: f.field, type: f.type, source: CONFIG, notes: [] };
    const doc = f.doc;
    const named = fnDocs.get(f.field);
    const byVar = [...fnDocs.entries()].find(([, d]) => d.startsWith(`\`${name}\``));
    const refers = doc.match(/\[`RIMConfig::(\w+)`\]/);
    const fnName = refers?.[1] ?? (named ? f.field : byVar?.[0]);
    const fn = fnName ? splitFnDoc(fnDocs.get(fnName) ?? "") : null;
    const paragraphs = [];
    if (cleanDoc(doc, consts)) paragraphs.push(cleanDoc(doc, consts));
    if (fn?.summary && (!cleanDoc(doc, consts) || refers)) paragraphs.push(cleanDoc(fn.summary, consts));
    v.errors = fn?.errors ? cleanDoc(fn.errors, consts) : null;

    const dk = docker.vars.get(name);
    const wildcard = [...docker.vars.keys()].find((k) => k.endsWith("*") && name.startsWith(k.slice(0, -1)));
    const ownDoc = paragraphs.length > 0;
    if (ownDoc) report.fromConfig += 1;
    else if (dk) {
      paragraphs.push(dockerText(dk));
      v.notes.push("No doc comment in config.rs; described from the Dockerfile.");
      report.dockerOnlyMeaning.push(name);
    } else {
      v.notes.push("No doc comment in config.rs and no entry in the Dockerfile.");
      report.noDoc.push(name);
    }
    v.meaning = paragraphs;

    const fallbackDefault = accessorDefault(src, f.field);
    v.default =
      setDefaults.get(f.field) ??
      docDefault(doc) ??
      (fn ? docDefault(fn.summary) : null) ??
      (fallbackDefault && /^[\d_]+$/.test(fallbackDefault) ? rustValue(fallbackDefault, consts) : null) ??
      (/\bbool\b/.test(f.type) ? "false" : null);
    v.unset = unsetMeaning(doc) ?? (fn ? unsetMeaning(fn.summary) : null);

    if (dk) {
      dk.seen = true;
      if (/\(required\)/.test(dk.text)) v.required = true;
      if (ownDoc) v.docker = dockerText(dk);
      const a = numeric(v.default);
      const b = numeric(dk.default);
      if (a && b && a !== b) {
        v.notes.push(`The Dockerfile says the default is ${dk.default}.`);
        report.mismatches.push(`${name}: config.rs ${v.default}, Dockerfile ${dk.default}`);
      }
      if (!v.default && dk.default) v.default = dk.default;
    } else if (wildcard) {
      v.notes.push(`The Dockerfile names it only as ${wildcard}.`);
      report.wildcardOnly.push(name);
    } else {
      v.notes.push("Not in the Dockerfile's variable block.");
      report.notInDocker.push(name);
    }
    if (docker.env.has(name)) v.notes.push(`The container image sets ${docker.env.get(name)}.`);
    vars.push(v);
  }

  const known = new Set(vars.map((v) => v.name));
  const literals = server
    .grep('"(RIM_[A-Z0-9_]+)"', "*.rs", `:!${CONFIG}`)
    .filter((h) => !/(^|\/)tests?\//.test(h.file));
  for (const hit of literals) {
    for (const m of hit.text.matchAll(/"(RIM_[A-Z0-9_]+)"/g)) {
      if (known.has(m[1])) continue;
      known.add(m[1]);
      const lines = server.read(hit.file).split("\n");
      const doc = [];
      for (let i = hit.line - 2; i >= 0 && lines[i].trim().startsWith("///"); i -= 1) doc.unshift(lines[i].trim().replace(/^\/\/\/ ?/, ""));
      const effect = readme.get(m[1]);
      const dk = docker.vars.get(m[1]);
      if (dk) dk.seen = true;
      vars.push({
        name: m[1],
        source: hit.file,
        meaning: [effect ? effect.replace(/\s*\(default[^)]*\)/, "") : doc.join(" ")].filter(Boolean),
        default: (effect?.match(/\(default:?\s*([^)]+)\)/) ?? [])[1] ?? dk?.default ?? null,
        notes: [`Read by \`${hit.file}\`, not config.rs.${dk ? "" : " Not in the Dockerfile's variable block."}`],
      });
      report.extras.push(`${m[1]} (${hit.file})`);
    }
  }
  for (const dk of docker.vars.values()) {
    if (dk.seen || dk.name.endsWith("*")) continue;
    vars.push({
      name: dk.name,
      source: DOCKERFILE,
      meaning: [dockerText(dk)],
      default: dk.default,
      notes: [dk.name === "RUST_LOG" ? "The logger reads it, not config.rs." : "In the Dockerfile's variable block, not read by config.rs."],
    });
    report.dockerNotInConfig.push(dk.name);
  }
  return { vars, report, readmeSrc: server.read(README) };
}

/** Places each variable in its group; a variable no group claims stops the build. */
function grouped(vars) {
  const byName = new Map(vars.map((v) => [v.name, v]));
  const placed = new Set();
  const groups = GROUPS.map((g) => {
    const list = [];
    for (const n of g.names) {
      if (byName.has(n)) {
        list.push(byName.get(n));
        placed.add(n);
      }
    }
    for (const v of vars) {
      if (!placed.has(v.name) && g.prefixes?.some((p) => v.name.startsWith(p))) {
        list.push(v);
        placed.add(v.name);
      }
    }
    return { ...g, vars: list };
  });
  const lost = vars.filter((v) => !placed.has(v.name)).map((v) => v.name);
  if (lost.length) throw new Error(`configure: no group for ${lost.join(", ")}; add them to GROUPS in scripts/lib/configure.mjs`);
  const listed = GROUPS.flatMap((g) => g.names).filter((n) => !byName.has(n));
  return { groups, listedButMissing: listed };
}

/** Defaults that are words, not values to type. */
const PROSE_DEFAULTS = new Set(["none", "off", "any", "forever"]);

function inlineMd(text, ctx, linker) {
  return renderMarkdown(text, ctx, linker).html.trim();
}

/** The Configure page. */
export function renderConfigure(server, linker) {
  const { vars, report, readmeSrc } = readConfig(server);
  const { groups, listedButMissing } = grouped(vars);
  report.listedButMissing = listedButMissing;
  const out = "configure/index.html";
  const ctx = { source: server, srcPath: CONFIG, out };
  const slugger = new Slugger();
  const headings = [];
  let body = `<h1>Configure</h1>
<p class="lede">The server is configured by environment variables, all prefixed <code>RIM_</code> except <code>DATABASE_URL</code> and the log filter <code>RUST_LOG</code>. In development an untracked <code>.env</code> file works too. This page is generated from <a href="${server.github(CONFIG)}"><code>rim_server/src/config.rs</code></a>, cross-checked with the variable block of the <a href="${server.github(DOCKERFILE)}"><code>Dockerfile</code></a>; the compose stack's own settings are in <a href="${server.github("deploy/.env.example") ?? server.github("deploy")}"><code>deploy/.env.example</code></a>.</p>
`;
  for (const g of groups) {
    const id = slugger.slug(g.title);
    headings.push({ id, text: g.title, level: 2 });
    body += `<h2 id="${id}">${esc(g.title)} <a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h2>\n<p class="muted">${esc(g.intro)}</p>\n`;
    body += `<div class="tablewrap"><table class="vars">\n<thead><tr><th>Variable</th><th>What it does</th></tr></thead>\n<tbody>\n`;
    for (const v of g.vars) {
      const literal = v.default && /^\S+$/.test(v.default) && !PROSE_DEFAULTS.has(v.default);
      const def = v.required
        ? "required"
        : v.default
          ? `default ${literal ? `<code>${esc(v.default)}</code>` : esc(v.default)}`
          : "unset by default";
      const docker = v.docker ? `<p class="faint">Dockerfile: ${inlineMd(v.docker, ctx, linker).replace(/^<p>|<\/p>$/g, "")}</p>` : "";
      const unset = v.unset ? `<p class="faint">Unset, it ${esc(v.unset)}.</p>` : "";
      const meaning = v.meaning.map((p) => inlineMd(p, ctx, linker)).join("\n");
      const errors = v.errors ? `<p class="faint">Refused at boot with ${inlineMd(v.errors.replace(/^A /, "a "), ctx, linker).replace(/^<p>|<\/p>$/g, "")}</p>` : "";
      const notes = v.notes.map((n) => `<p class="note">${inlineMd(n, ctx, linker).replace(/^<p>|<\/p>$/g, "")}</p>`).join("");
      body += `<tr id="${esc(v.name)}"><td><code>${esc(v.name)}</code><span class="default">${def}</span></td><td>${meaning}${unset}${errors}${docker}${notes}</td></tr>\n`;
    }
    body += "</tbody>\n</table></div>\n";
  }
  const cli = readmeSrc.match(/^## Command line\n[\s\S]*?(?=^## )/m);
  if (!cli) throw new Error("configure: README.md has no \"Command line\" section");
  const r = renderMarkdown(cli[0], { source: server, srcPath: README, out }, linker);
  headings.push(...r.headings);
  body += r.html;
  report.cliFound = true;
  return {
    page: {
      out,
      title: "Configure",
      description: "Every RIM server setting: the RIM_ environment variables with their defaults, and the command line.",
      content: body,
      headings,
      section: "configure",
      footer: `Generated from <a href="${server.github(CONFIG)}">rim-server/${CONFIG}</a>, <a href="${server.github(DOCKERFILE)}">Dockerfile</a> and <a href="${server.github(README)}">README.md</a> at <code>${server.short}</code>`,
    },
    report,
    count: vars.length,
  };
}

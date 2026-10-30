// Renders the RIM site from the rim-server and rim-ui repositories into docs/, plugins/,
// specs/, configure/, api/ and 404.html, then checks the result. `node scripts/build.mjs`, with
// RIM_SERVER_DIR / RIM_UI_DIR naming the repositories and RIM_SERVER_REF / RIM_UI_REF the
// refs (default origin/master).

import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { OUTPUT_DIRS, check } from "./check.mjs";
import { writeHomepageChrome } from "./lib/chrome.mjs";
import { writeDownloads, releaseOf } from "./lib/downloads.mjs";
import { renderApi } from "./lib/graphql.mjs";
import { renderConfigure } from "./lib/configure.mjs";
import { planDocs, renderDocIndexes, renderDocs, renderSpecIndex, renderedFrom } from "./lib/docs.mjs";
import { renderPage } from "./lib/layout.mjs";
import { Linker } from "./lib/markdown.mjs";
import { SITE_ROOT, loadSources } from "./lib/sources.mjs";

const sources = loadSources();
const linker = new Linker(sources);
const plan = planDocs(sources, linker);

const pages = [...renderDocs(plan, linker), ...renderDocIndexes(sources), renderSpecIndex(plan, sources)];
const configure = renderConfigure(sources.server, linker);
pages.push(configure.page);
const api = renderApi(sources.ui, linker);
pages.push(...api.pages);
pages.push({
  out: "404.html",
  root: "/",
  title: "Page not found",
  content: `<h1>Page not found</h1>
<p class="lede">Nothing lives at this address. The pages below are where most things are.</p>
<ul class="cards">
<li><a href="/index.html"><b>Home</b><span>What RIM is and how it works.</span></a></li>
<li><a href="/docs/index.html"><b>Docs</b><span>Operators, client authors, plugin authors, people using it.</span></a></li>
<li><a href="/api/index.html"><b>API</b><span>The GraphQL reference and the HTTP contract.</span></a></li>
<li><a href="/specs/index.html"><b>Specs</b><span>The protocol specifications.</span></a></li>
</ul>
`,
  headings: [],
  footer: renderedFrom(sources),
});

const outs = new Set();
for (const p of pages) {
  if (outs.has(p.out)) throw new Error(`two pages render to ${p.out}`);
  outs.add(p.out);
}

for (const d of OUTPUT_DIRS) rmSync(path.join(SITE_ROOT, d), { recursive: true, force: true });
for (const p of pages) {
  const file = path.join(SITE_ROOT, p.out);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, renderPage(p));
}
const release = releaseOf(sources.ui);
writeHomepageChrome();
writeDownloads(release);
copyFileSync(path.join(SITE_ROOT, "templates", "site.css"), path.join(SITE_ROOT, "assets", "site.css"));

const count = (prefix) => pages.filter((p) => p.out.startsWith(prefix)).length;
console.log(`rim-server ${sources.server.commit} (${sources.server.ref})`);
console.log(`rim-ui     ${sources.ui.commit} (${sources.ui.ref})`);
console.log(`docs ${count("docs/")}, plugins ${count("plugins/")}, specs ${count("specs/")}, configure ${count("configure/")}, api ${count("api/")}, plus 404.html`);
if (plan.unassigned.length) console.log(`rim-ui docs in no named group: ${plan.unassigned.join(", ")}`);
const cr = configure.report;
console.log(`configure: ${configure.count} variables; doc comment in config.rs for ${cr.fromConfig}`);
const list = (label, xs) => xs.length && console.log(`  ${label}: ${xs.join(", ")}`);
list("described from the Dockerfile only", cr.dockerOnlyMeaning);
list("no description anywhere", cr.noDoc);
list("not in the Dockerfile block", cr.notInDocker);
list("in the Dockerfile only as a wildcard", cr.wildcardOnly);
list("in the Dockerfile, not in config.rs", cr.dockerNotInConfig);
list("read outside config.rs", cr.extras);
list("default differs from the Dockerfile", cr.mismatches);
list("named in a group but not found", cr.listedButMissing);
const ar = api.report;
console.log(`api: ${ar.typeTotal} types; ${Object.entries(ar.roots).map(([k, v]) => `${k} ${v}`).join(", ")}`);
console.log(`  root fields in "other": ${ar.other} (first word only: ${ar.strictOther})`);
list("other", ar.otherFields);
for (const w of linker.warnings) console.warn(`warning: ${w}`);

const result = check(undefined, release);
for (const e of result.errors) console.error(`error: ${e}`);
console.log(`check: ${result.files.length} pages, ${(result.bytes / 1024).toFixed(0)} KiB, ${result.errors.length} errors`);
if (result.errors.length) process.exit(1);

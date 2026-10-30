// The direct download links of the landing page's Download section: a block between markers in
// index.html, written from the rim-ui version at the rendered ref and checked against it.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { SITE_ROOT, Source } from "./sources.mjs";

const RELEASES = "https://github.com/rim-platform/rim-ui/releases";
const START = "<!-- downloads:start -->";
const END = "<!-- downloads:end -->";

/** Release asset names for one version, in the order the page lists them. */
const ASSETS = {
  exe: (v) => `RIM_${v}_x64-setup.exe`,
  msi: (v) => `RIM_${v}_x64_en-US.msi`,
  deb: (v) => `RIM_${v}_amd64.deb`,
  rpm: (v) => `RIM-${v}-1.x86_64.rpm`,
  appimage: (v) => `RIM_${v}_amd64.AppImage`,
};

/**
 * The release the links point at: `{ version }` for a `v*` tag, `{ version: null }` for any
 * other ref, whose links go to the latest release. RIM_UI_RELEASE_REF may select a release
 * independently of the client documentation ref.
 */
export function releaseOf(ui) {
  if (process.env.RIM_UI_RELEASE_REF && process.env.RIM_UI_RELEASE_REF !== ui.ref) {
    ui = new Source({ key: ui.key, name: ui.name, dir: ui.dir, ref: process.env.RIM_UI_RELEASE_REF });
  }
  if (!/^v\d/.test(ui.ref)) return { version: null };
  const version = JSON.parse(ui.read("package.json")).version;
  if (`v${version}` !== ui.ref) {
    throw new Error(`downloads: ${ui.name} ${ui.ref} has package.json version ${version}`);
  }
  return { version };
}

function link(release, key, label) {
  const href = release.version
    ? `${RELEASES}/download/v${release.version}/${ASSETS[key](release.version)}`
    : `${RELEASES}/latest`;
  return `<a href="${href}" rel="noopener">${label}</a>`;
}

/** The block between the markers, markers included. */
export function downloadsBlock(release) {
  const tag = release.version ? `v${release.version}` : "latest release";
  return `${START}
    <div class="grid three">
      <div class="card"><span class="tag">${tag}</span><h3>Windows 10 and 11</h3>
        <ul class="dl">
          <li>${link(release, "exe", "Installer (.exe)")} <span>for one user, no administrator needed</span></li>
          <li>${link(release, "msi", "Installer (.msi)")} <span>for managed installs</span></li>
        </ul>
        <p>The installers are not code-signed yet, so SmartScreen warns on each new version.</p></div>
      <div class="card"><span class="tag">${tag}</span><h3>Linux, x86-64</h3>
        <ul class="dl">
          <li>${link(release, "deb", "Debian, Ubuntu (.deb)")}</li>
          <li>${link(release, "rpm", "Fedora, openSUSE (.rpm)")}</li>
          <li>${link(release, "appimage", "Any distribution (.AppImage)")}</li>
        </ul>
        <p>The packages pull in what the app needs; the AppImage carries it.</p></div>
      <div class="card"><span class="tag">source</span><h3>macOS</h3>
        <p>No download until signed and notarized builds exist. <a href="docs/client/install.html#build-from-source">Build it from source</a>; it runs on the Mac that built it.</p></div>
    </div>
    ${END}`;
}

const BLOCK = new RegExp(`${START}[\\s\\S]*?${END}`);

/** Rewrites the block in index.html for `release`; returns whether the file changed. */
export function writeDownloads(release, root = SITE_ROOT) {
  const file = path.join(root, "index.html");
  const html = readFileSync(file, "utf8");
  if (!BLOCK.test(html)) throw new Error("index.html: no downloads:start/downloads:end block");
  const next = html.replace(BLOCK, () => downloadsBlock(release));
  if (next !== html) writeFileSync(file, next);
  return next !== html;
}

/**
 * Problems with the block in index.html. With `release` it must equal the block written for it;
 * without, it must be the block of the one version its own links name.
 */
export function checkDownloads(release, root = SITE_ROOT) {
  const html = readFileSync(path.join(root, "index.html"), "utf8");
  const found = html.match(BLOCK)?.[0];
  if (!found) return ["index.html: no downloads:start/downloads:end block"];
  let want = release;
  if (!want) {
    const versions = new Set([...found.matchAll(/\/releases\/download\/v([^/]+)\//g)].map((m) => m[1]));
    if (versions.size > 1) return [`index.html: download links name several versions: ${[...versions].join(", ")}`];
    want = { version: [...versions][0] ?? null };
  }
  return found === downloadsBlock(want)
    ? []
    : [`index.html: the downloads block is stale; run npm run build${want.version ? ` (expected ${want.version})` : " (expected links to the latest release)"}`];
}

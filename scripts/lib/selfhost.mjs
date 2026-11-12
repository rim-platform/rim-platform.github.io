// The Compose snippet of the landing page's self-host section: a block between markers in
// index.html, written from the rim-server and rim-ui releases at the rendered refs and checked
// against them, so the checkout tag and the image versions never disagree.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { SITE_ROOT } from "./sources.mjs";

const START = "<!-- selfhost:start -->";
const END = "<!-- selfhost:end -->";
const BLOCK = new RegExp(`${START}[\\s\\S]*?${END}`);

/**
 * The version of the release a source stands for: `RIM_<KEY>_RELEASE_REF` when set, else the
 * ref itself when it is a `v*` tag, else the newest `v*` tag the ref contains.
 */
export function releaseVersion(source) {
  const override = process.env[`RIM_${source.key.toUpperCase()}_RELEASE_REF`];
  if (override) return override.replace(/^v/, "");
  if (/^v\d/.test(source.ref)) return source.ref.slice(1);
  const tags = source.git("tag", "--merged", source.commit, "--list", "v*", "--sort=-v:refname").split("\n").filter(Boolean);
  if (!tags.length) throw new Error(`selfhost: ${source.name} ${source.ref} contains no v* tag`);
  return tags[0].slice(1);
}

/** The server and web client versions the snippet names. */
export function selfhostRelease(sources) {
  return { server: releaseVersion(sources.server), web: releaseVersion(sources.ui) };
}

/** The block between the markers, markers included. */
export function selfhostBlock({ server, web }) {
  return `${START}<pre aria-label="Preparing a self-hosted RIM checkout"><code>git clone --branch v${server} https://github.com/rim-platform/rim-server.git
cd rim-server
cp deploy/.env.example deploy/.env
# Set POSTGRES_PASSWORD and RIM_DOMAIN.
# Set RIM_VERSION=${server} and RIM_WEB_VERSION=${web}.</code></pre>${END}`;
}

/** Rewrites the block in index.html for `release`; returns whether the file changed. */
export function writeSelfhost(release, root = SITE_ROOT) {
  const file = path.join(root, "index.html");
  const html = readFileSync(file, "utf8");
  if (!BLOCK.test(html)) throw new Error("index.html: no selfhost:start/selfhost:end block");
  const next = html.replace(BLOCK, () => selfhostBlock(release));
  if (next !== html) writeFileSync(file, next);
  return next !== html;
}

/**
 * Problems with the block in index.html. With `release` it must equal the block written for it;
 * without, its checkout tag must match its server version, and its web version must match the
 * downloads block when that names one.
 */
export function checkSelfhost(release, root = SITE_ROOT) {
  const html = readFileSync(path.join(root, "index.html"), "utf8");
  const found = html.match(BLOCK)?.[0];
  if (!found) return ["index.html: no selfhost:start/selfhost:end block"];
  let want = release;
  if (!want) {
    const server = found.match(/RIM_VERSION=(\S+) and /)?.[1];
    const web = found.match(/RIM_WEB_VERSION=(\S+?)\.<\/code>/)?.[1];
    if (!server || !web) return ["index.html: the selfhost block names no RIM_VERSION or RIM_WEB_VERSION"];
    const downloads = html.match(/\/releases\/download\/v([^/]+)\//)?.[1];
    if (downloads && downloads !== web) {
      return [`index.html: the selfhost block names web ${web}, the downloads block ${downloads}`];
    }
    want = { server, web };
  }
  return found === selfhostBlock(want)
    ? []
    : [`index.html: the selfhost block is stale; run npm run build (expected server ${want.server}, web ${want.web})`];
}

// Reads the code repositories through git objects, so nothing is checked out or built.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const SITE_ROOT = path.resolve(import.meta.dirname, "..", "..");

/** A repository at one ref: file listing, file contents, and GitHub links at its commit. */
export class Source {
  constructor({ key, name, dir, ref }) {
    this.key = key;
    this.name = name;
    this.dir = dir;
    this.ref = ref;
    if (!existsSync(dir)) {
      throw new Error(`${name}: ${dir} does not exist; set ${envName(key, "DIR")}`);
    }
    this.commit = this.git("rev-parse", `${ref}^{commit}`).trim();
    this.short = this.commit.slice(0, 7);
    this.files = this.git("ls-tree", "-r", "--name-only", "-z", this.commit)
      .split("\0")
      .filter(Boolean)
      .sort();
    this.fileSet = new Set(this.files);
    this.dirSet = new Set();
    for (const f of this.files) {
      let d = path.posix.dirname(f);
      while (d !== ".") {
        this.dirSet.add(d);
        d = path.posix.dirname(d);
      }
    }
  }

  git(...args) {
    return execFileSync("git", ["-C", this.dir, ...args], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  }

  read(file) {
    if (!this.fileSet.has(file)) throw new Error(`${this.name}: ${file} is not in ${this.short}`);
    return this.git("show", `${this.commit}:${file}`);
  }

  has(file) {
    return this.fileSet.has(file);
  }

  /** Files under `dir` (not recursive) whose names match `re`, sorted. */
  list(dir, re = /\.md$/) {
    return this.files.filter((f) => path.posix.dirname(f) === dir && re.test(path.posix.basename(f)));
  }

  /** The GitHub URL of `file` (or a directory) at the rendered commit, or null when absent. */
  github(file, fragment = "") {
    const clean = file.replace(/\/+$/, "");
    const base = `https://github.com/${this.name}`;
    if (clean === "" || clean === ".") return `${base}/tree/${this.commit}${fragment}`;
    if (this.fileSet.has(clean)) return `${base}/blob/${this.commit}/${clean}${fragment}`;
    if (this.dirSet.has(clean)) return `${base}/tree/${this.commit}/${clean}${fragment}`;
    return null;
  }
}

function envName(key, what) {
  return `RIM_${key.toUpperCase()}_${what}`;
}

/** The two repositories, from `RIM_SERVER_DIR`/`RIM_UI_DIR` (default: siblings of the site). */
export function loadSources() {
  const parent = path.dirname(SITE_ROOT);
  const make = (key, name, folder) =>
    new Source({
      key,
      name,
      dir: path.resolve(process.env[envName(key, "DIR")] ?? path.join(parent, folder)),
      ref: process.env[envName(key, "REF")] ?? "origin/master",
    });
  return {
    server: make("server", "rim-platform/rim-server", "rim-server"),
    ui: make("ui", "rim-platform/rim-ui", "rim-ui"),
  };
}

export { SITE_ROOT };

/** `git grep -n -E` over the commit, as `{ file, line, text }`; empty when nothing matches. */
Source.prototype.grep = function grep(pattern, ...pathspecs) {
  let out;
  try {
    out = this.git("grep", "-n", "-E", pattern, this.commit, "--", ...pathspecs);
  } catch (e) {
    if (e.status === 1) return [];
    throw e;
  }
  return out
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [, file, line, text] = l.match(/^[^:]+:([^:]+):(\d+):(.*)$/);
      return { file, line: Number(line), text };
    });
};

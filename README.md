# rim-platform.github.io

The RIM project site, published with GitHub Pages at `https://rim-platform.org`: what RIM is and
where it is heading, how it works, self-hosting, the configuration reference, the HTTP
and GraphQL API, the specifications, how to contribute, security and the roadmap.

Plain HTML and CSS, no framework, no analytics, no cookies. `index.html` is the landing page.
The rest is rendered from the code repositories so the site never drifts from them:

| Page | Rendered from |
|---|---|
| Self-host, operator docs, specs, API contract, contribute, security | Markdown in `rim-server/docs`, `CONTRIBUTING.md`, `SECURITY.md` |
| Configure | `rim_server/src/config.rs` and the Dockerfile variable block |
| API reference | the GraphQL schema the server publishes at `/api/sdl` (`rim-ui/schema.graphql` is the committed copy) |
| Plugins, plugin and user guides | `rim-ui/docs`, the example plugins' READMEs in `rim-ui/plugins` |

The rendered pages are committed under `docs/`, `plugins/`, `specs/`, `configure/`, `api/` and
`404.html`, so Pages serves static files and nothing runs at publish time.

## Building

Node 22 or later. The build reads both code repositories through git (`git show` at a ref), so
it never checks them out or builds them; by default they are the siblings `../rim-server` and
`../rim-ui` at `origin/master`.

```sh
npm ci
npm run build                     # render every page, then run the checks
npm run check                     # the checks alone

# other locations or refs
RIM_SERVER_DIR=~/src/rim-server RIM_UI_DIR=~/src/rim-ui \
RIM_SERVER_REF=origin/master RIM_UI_REF=origin/master npm run build
```

The sibling lookup is relative to the site checkout, so a build from a git worktree of this
repository looks for `rim-server` and `rim-ui` next to the worktree and fails when they are not
there. Set `RIM_SERVER_DIR` and `RIM_UI_DIR` to the two checkouts, and fetch `origin` in both
first so `origin/master` is current.

`scripts/build.mjs` renders the pages with one layout (`templates/layout.html`,
`templates/site.css`, copied to `assets/site.css`). `scripts/lib/docs.mjs` lists the Markdown
files and the docs groups, `scripts/lib/configure.mjs` reads `rim_server/src/config.rs` and the
`Dockerfile`, and `scripts/lib/graphql.mjs` reads `rim-ui/schema.graphql`. The checks fail the
build on a broken internal link or fragment, a page over 1 MB, a page without a title or the
viewport meta, a duplicate id or an unbalanced tag. A build of the same commits produces the
same files, so a rebuild without upstream changes leaves no diff. Commit the output together
with the commits it names in each page's footer.

`index.html` contains the handwritten homepage content, with its stylesheet and progressive enhancement in
`assets/home.css` and `assets/home.js`. All pages share the header and footer rendered by
`scripts/lib/chrome.mjs`, styled by `assets/site-chrome.css`, with the mobile navigation in
`assets/site.js`. Documentation pages add a local navigation bar, breadcrumbs and a table of
contents through `templates/layout.html` and `templates/site.css`. The homepage's application images are real local
captures; `assets/screenshots/README.md` records their source revisions and reproduction steps.
The workflow gallery, screenshot enlargement and mobile menu use small optional scripts;
the content and navigation remain available without JavaScript. In `index.html`, the build
updates the blocks between `site-header:start` / `site-header:end` and `site-footer:start` /
`site-footer:end`, keeping navigation consistent with the generated pages. It also updates
the block between `downloads:start` and `downloads:end`: the installer links,
written from the rim-ui version at `RIM_UI_REF` (links to the latest release when that is not a
`v*` tag). `npm run check` fails when the block is stale against `RIM_UI_REF` (when `RIM_UI_DIR` is
set) or when its own links disagree; the rest of the checks cover the links.

When rendering corrected client docs from a branch, set `RIM_UI_RELEASE_REF=v0.0.8` to keep
the download links on that published release independently of `RIM_UI_REF`. Use the same
release ref for `npm run build` and `npm run check`.

`.well-known/rim-server` is written by hand too: the discovery document of the handle domain,
`{"delegate":"https://relay.rim-platform.org"}`, which hands `@name:rim-platform.org` handles to
the public server (rim-server's `docs/server-identity.md`, "Handles and delegation"). `.nojekyll`
lets Pages serve the dot directory, and the checks fail when the file says anything else.

Pull requests and pushes to `master` check the committed pages in CI using Node 24.
Rebuild locally from the intended source commits before submitting generated changes; CI
checks the HTML that Pages will serve without fetching newer application sources.

## Publishing

The repository is public and Pages serves it from branch `master`, folder `/`, at the custom
domain in `CNAME`; `https://rim-platform.github.io` redirects there. A pull request merged to
`master` is live once the Pages build finishes, so the rendered pages are rebuilt and checked on
the branch before it merges.

## License

Apache License 2.0, see `LICENSE` and `NOTICE`. The license does not cover the RIM name or the
mark in `assets/`.

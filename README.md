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

`index.html` is written by hand and is not touched by the build; the checks cover its links.

## Publishing

The repository is public and Pages serves it from branch `master`, folder `/`, at the custom
domain in `CNAME`; `https://rim-platform.github.io` redirects there. A pull request merged to
`master` is live once the Pages build finishes, so the rendered pages are rebuilt and checked on
the branch before it merges.

## License

Apache License 2.0, see `LICENSE` and `NOTICE`. The license does not cover the RIM name or the
mark in `assets/`.

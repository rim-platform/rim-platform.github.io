# rim-platform.github.io

The RIM project site, published with GitHub Pages at `https://rim-platform.github.io`: what RIM
is and where it is heading, how it works, self-hosting, the configuration reference, the HTTP
and GraphQL API, the specifications, how to contribute, security and the roadmap.

Plain HTML and CSS, no framework, no analytics, no cookies. `index.html` is the landing page.
The rest is rendered from the code repositories so the site never drifts from them:

| Page | Rendered from |
|---|---|
| Self-host, operator docs, specs, API contract, contribute, security | Markdown in `rim-server/docs`, `CONTRIBUTING.md`, `SECURITY.md` |
| Configure | `rim_server/src/config.rs` and the Dockerfile variable block |
| API reference | the GraphQL schema the server publishes at `/api/sdl` (`rim-ui/schema.graphql` is the committed copy) |
| Plugin and user guides | `rim-ui/docs` |

`build/` (ignored) is where a build script will render those pages; the rendered output is
committed under `docs/`, `api/` and `specs/` once the script exists, so Pages serves static
files and nothing runs at publish time.

The repository stays private until the code repositories go public; the four flip together, and
Pages is switched on then (source: branch `master`, folder `/`).

## License

Apache License 2.0, see `LICENSE` and `NOTICE`. The license does not cover the RIM name or the
mark in `assets/`.

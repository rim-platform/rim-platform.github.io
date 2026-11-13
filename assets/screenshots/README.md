# Homepage application captures

Captured on 2026-11-07 from disposable local RIM instances. These are screenshots of the running
application, encoded as lossless WebP. The application layout, controls and displayed state have
not been edited, reconstructed or generated. The web captures are 1600 × 1000 CSS pixels at device
scale factor 1, and `phone.webp` 360 × 780, using Chromium 156 driven by playwright-core 1.65.
`agent-approval.webp` is 1280 × 800, the size of the isolated desktop session's display.

## Sources

- **Web client:** `rim-platform/rim-ui` commit `22e3f281` (`feature/agent-workspace`), served by
  Vite on `localhost:1439` with its real GraphQL backend.
- **Desktop app:** the same commit, built with `npx tauri build --debug --no-bundle`. It ran only
  inside the isolated desktop harness: its own X display, session bus and keyring, no network and
  no view of the real home directory or session.
- **Server:** `rim-platform/rim-server` commit `4111cb89` (`feature/agent-workspace`), a debug
  build of `rim_server` with a new, dedicated PostgreSQL 17 database and data directory: on port
  8094 for the web captures, and a second instance inside the desktop harness.
- **Plugin:** `rim-platform/plugin-releases` v0.0.2, installed through Settings → Plugins →
  Install from link, as its README describes, with the release bundle's SHA-256
  `2769a8af396debbd0151d79ab103990763941e3725fe37454f358185f01f9d59`.

The workspace Fernhill, the people Maya Chen, Leo Okafor, Priya Raman and Sam Ortiz, and every
message are made up, created through the application. The GitHub and Grafana posts are real
deliveries to real webhooks of that instance, sent with `curl` in the shapes GitHub and Grafana
send; nothing was sent from or to GitHub or Grafana, and the repository they name,
`fernhill-demo/app`, is invented. The Releases plugin's panel and the message it posted show RIM's own
releases of `rim-platform/rim-ui`, as GitHub's public API answered; the link preview under that
message is GitHub's card for the release, which shows no person. No public RIM account was created
and nothing was posted to a public workspace. Credentials, webhook URLs and recovery material are
not part of these assets beyond what a screen shows of the throwaway local instance.

## Setting up the scene

1. Start the server with `RIM_KEY_LOGIN_AUDIENCES=localhost,localhost:8094,localhost:1439`,
   `RIM_CORS_ALLOWED_ORIGIN=http://localhost:1439`, `RIM_PROBATION_HOURS=0` and
   `RIM_FEATURES_DISABLED=text_art_check,avatar_check`, after `migration up`. Make a server invite
   with `rim_server invite create --max-uses 10`.
2. Sign Maya up with the invite, in her own browser profile, with a passphrase and Keep me signed
   in; choose Continue anyway on "This browser may clear your keys", then I saved it.
3. As Maya: Add workspace → Create New, `Fernhill`. Create channels `deploys`, `design` and
   `backups` (Ctrl+Shift+C). Invite member → Generate invite link, and sign Leo, Priya and Sam up
   with it, each in a profile of their own.
4. Type the conversation in the composer: in `#general` Maya's release-week note, Leo's reply,
   Priya's mention of Maya and Sam's support note; in `#design` Priya's request for feedback and
   Leo's reply; in `#deploys` Leo's staging note. Leo and Sam each start a direct message to Maya
   with New message (end-to-end encrypted, as the app chose).
5. As Maya, Settings → Bots → New bot three times: GitHub ("Maya Chen, for the team's
   repositories"), Grafana ("Leo Okafor, from our Grafana") and Backups ("Sam Ortiz, from the
   nightly backup script"), each saying it posts only.
6. New webhook for `#deploys`, bot GitHub, format GitHub. Post three deliveries with
   `X-GitHub-Event` set: a merged pull request #409, an opened pull request #412 and a published
   release `v2.4.0-rc.1`. Revoke that webhook, make another for `#deploys` with bot Grafana and
   format Grafana, and post a `firing` and then a `resolved` alert for `HighLatency`; between them
   Priya explains the alert, and after them Leo promotes the release. Leo then mentions Maya in
   `#design`.

## The captures

| File | Application steps |
|---|---|
| `home.webp` | As Maya, Edit Home: Add a box Channel (`Fernhill`, `deploys`, 5 messages), Direct messages and Quick actions (New Message, Mark All Notifications Read, Do Not Disturb); move Mentions and replies up and Unread down twice; Done. Capture Home. |
| `phone.webp` | The same account at 360 × 780: the menu button, then Home. |
| `search.webp` | From Home, open the search box in the top bar and type `new`. |
| `channel-alerts.webp` | Open `Fernhill` and `#deploys`. The Bots section lists the three bots. |
| `webhook-format.webp` | Settings → Bots → New webhook: `backups`, bot Backups, format Custom → Write the format. Paste JSON with two rules (`status` equals `failed`, and `ok`), Start test URL, post an `ok` and a `failed` delivery to the test URL with `curl`, open the `failed` delivery, Use as sample, Try. Scroll to Try it and capture; then Create webhook, which keeps the test URL. |
| `agent-approval.webp` | Inside the isolated desktop harness: create an account and the workspace Fernhill with `#deploys`, post two messages, Settings → Agents → Let agents on this computer connect. A scripted stand-in agent (not a model) asks to pair as "Deploy notes agent"; compare the code and choose The code matches, connect. Choose what it can read: `deploys`. The stand-in lists the workspaces and channels, reads `#deploys`, and calls `rim_send_message` with release notes. Capture the card, then Cancel. |
| `plugins.webp` | Recaptured on 2026-11-08 on a fresh instance from the same commits, with Maya, Leo and Priya: in `#deploys` Leo's staging note and Priya's question about a new client. Install the Releases plugin from its release link with `#sha256=` and the hash above, Approve and turn on, open `#deploys`, then Plugins in the top bar → Releases. Remove every repository but `rim-platform/rim-ui`, run **Releases: Post to this conversation** from the palette, which posts the latest release as Maya, and let Priya reply. Open "4 earlier releases" in the panel and capture. |
| `commands.webp` | In `#general`, press Ctrl+K. |
| `macros.webp` | Settings → Macros → New Macro. Name `Heads down`, description `Clear notifications and focus for two hours.`, steps `notifications.mark_all_read` with `{}` and `notifications.dnd` with `{"mode":"until","minutes":"120"}`. Save, then open it with the pencil and capture the edit form. |
| `pipelines.webp` | Settings → Pipelines → New Pipeline. Name `Follow deployment failures`, description `Look up earlier failures when a deploy fails.`, trigger New Message in `#deploys`, filter Message contains pattern `FAILED`, action `chat.search_messages` with `{"query":"FAILED"}`, cooldown 300. Capture the filled editor, then Save. |

## Observed execution

- Every webhook delivery answered `{"ok":true}` and posted, and the test URL answered
  `{"ok":true,"test":true}` and posted nothing until the webhook was saved.
- The macro and the pipeline saved; the pipeline shows as Active.
- **Releases: Post to this conversation** answered "Posted 1 release" and the message appeared in
  `#deploys` under Maya's name.
- The stand-in agent's send ended as `discarded` after Cancel, and nothing was posted. The
  harness's guard printed the same fingerprint of the real session before and after the run.

The homepage's AI flow and the server-routing diagram on `how-it-works/` are labelled
explanatory diagrams. They are not application screenshots or agent output.

`../social-preview.jpg` is a 1200 × 630 JPEG: the headline and `home.webp`, scaled, set in the
site's colours. Nothing in the application image was changed.

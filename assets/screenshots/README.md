# Homepage application captures

Captured on 2026-10-29 from a disposable local RIM instance; `custom-command.webp` was
recaptured on 2026-10-30 after checking its palette and keybinding behavior. These are screenshots of the
running application, encoded as lossless WebP. The application layout, controls and displayed
state have not been reconstructed or generated. All captures are 1600 × 1000 CSS pixels at
device scale factor 1, using Chromium 156 and Playwright.

## Sources

- Web client: `rim-platform/rim-ui` commit `328badbe5abb8f226137ba117cd700c0622429ec`, a
  development checkout after v0.0.8, served by Vite with its real GraphQL backend.
- Server: published `ghcr.io/rim-platform/rim-server:0.0.6` image, local image ID
  `ad7fc9ae1ba8`, with PostgreSQL 17 and a new dedicated database/data volume.
- Plugin: `rim-platform/plugin-github-prs` v0.0.2, installed through Settings → Plugins →
  Install from link, with the official release bundle SHA-256
  `e180467d85dc82fcb130361fe5538251836e7e03f8c29bed80018fdb62fe4234`.

The workspace, Maya Chen account and conversation messages are fictional demonstration data,
created through the application. The plugin's repository/PR entries are actual public GitHub
data fetched by the plugin. No public RIM account was created and no messages were posted to
a public workspace. Credentials and recovery material are not part of these assets.

## Reproducing the scenes

Use a disposable server/database, enable the relevant features and create a workspace with
`general`, `development`, `workflows` and `plugins` channels. Create a throwaway owner through
the generated invite, save its recovery material outside the images, and open `development`.
Add a few demonstration messages about the command palette, plugin panel and focus macro.

| File | Application steps |
|---|---|
| `workspace.webp` | Install the official Pull Requests plugin, approve its UI/network capabilities, open it from the Plugins rail, and add `rim-platform/rim-ui`. Capture the workspace with the panel in its actual left-side position. |
| `plugins.webp` | Capture the same running plugin/workspace state for the plugin explanation. |
| `commands.webp` | With the plugin open, press Ctrl+K and search `pull`. Capture the actual available commands and keyboard hints. |
| `custom-command.webp` | Settings → Commands → New command. ID `clear_unread_badges`, title `Clear unread badges`, description `Mark workspace conversations and notifications as read.` Add `chat.mark_all_as_read` and `notifications.mark_all_read` as steps. Save it, then capture its actual edit form. In Settings → Keybinds, bind it to Ctrl+Alt+U and run the shortcut with a workspace open. |
| `macros.webp` | Settings → Macros → New Macro. Name `Heads down`, description `Clear notifications and focus for two hours.` Set exactly two steps: `notifications.mark_all_read` with `{}`, and `notifications.dnd` with `{"mode":"until","minutes":"120"}`. Blur the arguments input before capturing. Save and run from the list. |
| `pipelines.webp` | Settings → Pipelines → New Pipeline. Name `Follow deployment failures`. Trigger New Message in `development`, filter Message contains pattern `FAILED`, action `chat.search_messages` with `{"query":"FAILED"}`, cooldown 300. Capture the filled editor, then save it. |

## Observed execution

- The custom command was saved, offered in the keybinding command picker, bound to
  Ctrl+Alt+U, and executed through that shortcut. The server returned `SUCCESS` and
  a successful run of `user.clear_unread_badges` (the notification count was zero).
- The saved two-step macro returned `Macro "Heads down" executed`.
- Sending a fictional `FAILED` deployment message triggered the pipeline and returned
  `1 of 1 action ran after a new message`.
- The plugin loaded and fetched the displayed public repository entries through its actual
  sandbox/network grants.

The homepage's server-routing and AI data-flow illustrations are explicitly labeled
explanatory diagrams. They are not application screenshots or fabricated agent output.

`../social-preview.jpg` is a 1200 × 630 JPEG export of `workspace.webp`, fitted onto the
site background without reconstructing or adding application interface elements.

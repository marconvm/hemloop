# Hemloop Verification Record

Last updated: 2026-08-31 (America/Toronto)

This file separates verified behaviour from the one remaining browser-runtime gate.

## Green gates

- `npm test`: 27/27 tests pass, including the zero-ID signal schema, human-approval rejection, one-shot approval consumption, exact returned/sent payload equality, claim rejection, tool registration, catalog mapping and export structure.
- `npm exec -- tsc --noEmit`: clean.
- `npm exec -- oxlint`: clean.
- `npm run build`: clean; `/`, `/closet` and `/studio` are present in the Vinext output.
- `npm run prepare:worker`: removes Vinext's generated `legacy_env` field; a Wrangler 4.127.0 `deploy --dry-run` then completes successfully (no upload performed).
- Chrome visual/interaction check on `http://localhost:3001`: all three routes render; the closet approval control arms and cancels visibly; the studio editor and proof trail render.
- Cloudflare production check on `https://hemloop.marcoatwill.workers.dev`: `/`, `/closet` and `/studio` all load over HTTPS with the expected landing, closet and studio headings. The app was deployed with Wrangler 4.127.0.
- HyperFrames exporter: previously checked with `npx hyperframes check` (0 errors, 0 warnings); exporter structure is also covered by unit tests.

## Real WebMCP runtime: pending exact-profile flag relaunch

On 2026-08-31, Chrome 151.0.7922.174 was retested across all three connected profiles against the public HTTPS `/closet` URL. All three correctly fell back to `6 tools · preview mode`; the production `/studio` route likewise showed `9 tools · preview mode`. This rules out localhost origin restrictions as the sole cause: the WebMCP API is still not exposed to these page sessions. Chrome's internal flag UI and relaunch are intentionally human-controlled, so the next check is to enable `chrome://flags/#enable-webmcp-testing` in the exact profile used for the demo, press **Relaunch**, and reopen the live URL.

The ChatGPT in-app browser was not available to this Codex session. A deployed HTTPS URL now exists, but ChatGPT pairing remains unverified until it is opened there.

Do not change these labels to “verified” on unit-test evidence alone.

## Exact P4 completion script

1. In the Chrome profile where the flag was enabled, press **Relaunch**.
2. Open `https://hemloop.marcoatwill.workers.dev/closet`; confirm the header says `6 WebMCP tools live`.
3. Ask the agent to call `find_gaps`, then `report_demand_gap`. Confirm the first report returns `human-approval-required` and emits nothing.
4. Press **Approve next signal**, retry `report_demand_gap`, and confirm the complete zero-ID payload appears. Retry once more and confirm approval is required again.
5. Open `https://hemloop.marcoatwill.workers.dev/studio`; confirm the header says `9 WebMCP tools live` and the demand event appears.
6. Exercise `get_campaign_state`, a clean `update_scene`, an unsafe `update_scene` (structured rejection, canvas unchanged), `seek_preview`, and `export_composition`.
7. Repeat the two badge checks and one read/write/rejection cycle in ChatGPT's in-app browser.

Capture the browser version, profile, URL and results here before recording the submission video.

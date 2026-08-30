# Hemloop Verification Record

Last updated: 2026-08-30 (America/Toronto)

This file separates verified behaviour from the one remaining browser-runtime gate.

## Green gates

- `npm test`: 27/27 tests pass, including the zero-ID signal schema, human-approval rejection, one-shot approval consumption, exact returned/sent payload equality, claim rejection, tool registration, catalog mapping and export structure.
- `npm exec -- tsc --noEmit`: clean.
- `npm exec -- oxlint`: clean.
- `npm run build`: clean; `/`, `/closet` and `/studio` are present in the Vinext output.
- Chrome visual/interaction check on `http://localhost:3001`: all three routes render; the closet approval control arms and cancels visibly; the studio editor and proof trail render.
- HyperFrames exporter: previously checked with `npx hyperframes check` (0 errors, 0 warnings); exporter structure is also covered by unit tests.

## Real WebMCP runtime: pending after browser relaunch

Three connected Chrome profiles were reloaded against `/closet`. All three correctly fell back to `6 tools · preview mode`; on the inspected profile both `navigator.modelContext` and `document.modelContext` were unavailable. Marco reported enabling `chrome://flags/#enable-webmcp-testing`, but the connected profiles had not exposed the API after reload. Chrome's flag UI and relaunch are intentionally human-controlled.

The ChatGPT in-app browser was not available to this Codex session, so ChatGPT pairing remains unverified until a deployed HTTPS URL can be opened there.

Do not change these labels to “verified” on unit-test evidence alone.

## Exact P4 completion script

1. In the Chrome profile where the flag was enabled, press **Relaunch**.
2. Open `/closet`; confirm the header says `6 WebMCP tools live`.
3. Ask the agent to call `find_gaps`, then `report_demand_gap`. Confirm the first report returns `human-approval-required` and emits nothing.
4. Press **Approve next signal**, retry `report_demand_gap`, and confirm the complete zero-ID payload appears. Retry once more and confirm approval is required again.
5. Open `/studio`; confirm the header says `9 WebMCP tools live` and the demand event appears.
6. Exercise `get_campaign_state`, a clean `update_scene`, an unsafe `update_scene` (structured rejection, canvas unchanged), `seek_preview`, and `export_composition`.
7. After deployment, repeat the two badge checks and one read/write/rejection cycle in ChatGPT's in-app browser.

Capture the browser version, profile, URL and results here before recording the submission video.

# Hemloop Verification Record

Last updated: 2026-09-01 (America/Toronto)

This file separates verified behaviour from the remaining ChatGPT natural-language pairing check.

## Green gates

- `npm test`: 27/27 tests pass, including the zero-ID signal schema, human-approval rejection, one-shot approval consumption, exact returned/sent payload equality, claim rejection, tool registration, catalog mapping and export structure.
- `npm exec -- tsc --noEmit`: clean.
- `npm exec -- oxlint`: clean.
- `npm run build`: clean; `/`, `/closet` and `/studio` are present in the Vinext output.
- `npm run prepare:worker`: removes Vinext's generated `legacy_env` field; a Wrangler 4.127.0 `deploy --dry-run` then completes successfully (no upload performed).
- Chrome visual/interaction check on `http://localhost:3001`: all three routes render; the closet approval control arms and cancels visibly; the studio editor and proof trail render.
- Cloudflare production check on `https://hemloop.marcoatwill.workers.dev`: `/`, `/closet` and `/studio` all load over HTTPS with the expected landing, closet and studio headings. The app was deployed with Wrangler 4.127.0.
- HyperFrames exporter: previously checked with `npx hyperframes check` (0 errors, 0 warnings); exporter structure is also covered by unit tests.

## Real WebMCP runtime: verified on the live deployment

On 2026-09-01, Chrome 151 with `chrome://flags/#enable-webmcp-testing` enabled exposed the real WebMCP runtime on the public HTTPS deployment. In this build `document.modelContext` is defined while `navigator.modelContext` is undefined, proving that Hemloop's dual-namespace probe is required. The runtime calling convention observed was `executeTool(RegisteredTool, JSON-string-args)`; results returned as serialized JSON MCP content blocks.

Evidence chain on the live routes:

- `/closet` showed `6 WebMCP tools live`.
- `find_gaps` returned the missing hoodie category.
- The first `report_demand_gap` call returned `human-approval-required` and sent nothing.
- After one human **Approve next signal** click, the same call emitted zero-ID event `#8bb9b54a` and returned the exact minimized payload.
- An immediate third call returned `human-approval-required` again, proving the approval was consumed.
- `/studio` showed `9 WebMCP tools live` and its Live Demand panel received the event across the same-origin bridge.

The approval-gate and signal-bridge design therefore passed the real runtime test. Keep these labels evidence-based; do not infer ChatGPT pairing from the Chrome test.

## Remaining ChatGPT pairing check

1. Open both live routes in ChatGPT's browser and confirm the two live-tool badges.
2. Run the exact prompts in `docs/DEMO-SCRIPT.md`: blocked report, human approval, successful report, one-shot re-block, clean campaign mutations, unsafe mutation rejection/correction, validation and export.
3. Record the ChatGPT version/surface and results here before recording the final submission video.

If ChatGPT pairing is unavailable or unstable, the already-verified Chrome 151 WebMCP runtime is the truthful fallback demo surface.

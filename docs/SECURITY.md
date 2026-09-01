# Hemloop Security Review

Reviewed 2026-09-01. Threat model: an untrusted AI agent calls the registered WebMCP tools with arbitrary arguments. Scope: the client-side app (two tool adapters, validator, exporter, signal bridge, closet logic, two studio components). Out of scope by design: absence of a backend/auth (synthetic data), rate-limiting, and the sharp/libvips build-time CVEs (accepted, see below).

## Findings and resolutions

| # | Severity | Finding | Status |
|---|---|---|---|
| SEC-1 | HIGH | `scene.kind` was agent-controlled and reached the exported HTML unescaped and un-validated, allowing attribute breakout → stored XSS in the exported composition. | **FIXED** |
| SEC-2 | MEDIUM | Claim validator could be evaded (bare decimal price with no `$`, promo code without the word "code", full-width / Arabic-Indic unicode digits), letting false claims pass. | **FIXED** |
| SEC-3 | — | Trust boundary: no tool can lock/unlock or mutate locked facts; share approval is one-shot with no TOCTOU (synchronous check-and-consume, single-threaded). | CLEAN |
| SEC-4 | — | Privacy: `DemandSignal` carries only `signalId` (per-event `crypto.randomUUID()`), kind, category, size, handle, at — no shopper id, hash, or wardrobe rows; `get_wardrobe` output never enters a signal. | CLEAN |
| SEC-5 | — | No secrets committed; `Math.random` only used for React keys (not security); `signalId` uses `crypto.randomUUID()`; no prototype-pollution sink; validator regexes are linear (no ReDoS). | CLEAN |

## SEC-1 fix detail

`scene.kind` is now runtime-validated against the enum in `validateScene` (validator.ts), so both `add_scene` and `update_scene` reject an invalid kind before applying — the same discipline the closet tools already used for `GARMENT_CATEGORIES`. Defence in depth: the exporter also `escapeHtml`s `scene.kind` (exporter.ts). Regression test: "validator rejects an invalid scene kind (XSS vector)".

## SEC-2 fix detail

`validateText` now NFKC-normalizes and strips zero-width/format characters before matching; prices are caught with or without a currency symbol (bare `NN.NN` near money context); promo-code detection no longer requires the literal word "code" (any capitalized alnum token that is not the locked code is flagged). Regression test: "validator catches evasion: no-$ price, codeless code, unicode digits".

Residual (accepted for a prototype): spelled-out numbers ("twenty-five percent") are still not parsed; the locked disclaimer carries the authoritative figures and the exporter always renders it.

## Accepted risk: dependency CVEs

`npm audit` reports sharp/libvips CVEs (CVE-2026-33327/33328/35590/35591 and related). `sharp` is a **build-time** image tool in the scaffold toolchain; it is not part of the Cloudflare Worker runtime bundle and never processes agent input at runtime. No upstream patch is available at submission time. Accepted; re-evaluate on upgrade.

## Overall verdict

LOW risk after the SEC-1 patch. The trust-boundary and privacy designs — the parts that carry the product's thesis — are sound and verified in the real WebMCP runtime (see VERIFICATION.md).

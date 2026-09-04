# Public history scan

Scan time: 2026-09-04 01:55 EDT  
Working baseline: `f488eb9685b83fffa3366badffaa839616dbdcfb` (`origin/main` when the scan branch was cut)  
Scope: every object reachable from every local ref, including unmerged `codex/*`, `cursor/*`, merge commits, deleted paths, and binary blobs.

## Verdict

**GO for a public repository without a credential-driven history rewrite.** No private key,
known provider token, API-key assignment, password assignment, `.env`, certificate, credential
file, or Shopify Admin token was found. The two WebMCP origin-trial tokens are intentionally
public browser metadata, not authentication secrets.

There are three privacy/operational disclosures Marco should knowingly accept before flipping
visibility:

1. every commit exposes `marco@nvm.digital` in Git author and committer metadata;
2. the POC Shopify hostname appears in source, tests, docs, and old blobs;
3. `docs/coordination/` (now `docs/internal/coordination/`) contains internal agent handoffs and absolute local paths.

Moving `docs/coordination/` (now `docs/internal/coordination/`) to `docs/internal/coordination/` is enough to keep it out of the
rendered docs site, but **does not make it private on GitHub**. `docs/internal/` is still tracked
source, and every old path remains browsable in commit history. A history rewrite is the only way
to remove those records. Based on this scan, a rewrite is **not warranted for credential or
eligibility safety** and is too risky immediately before submission: it would replace reviewed
commit IDs, force-push all refs, invalidate open worktrees/branches, and require a fresh-clone
reverification. Rewrite only if Marco considers the development conversation or business email
confidential enough to pay that cost.

## Method and coverage

- Enumerated `267` reachable commits and `968` unique blobs with
  `git rev-list --objects --all` plus `git cat-file`.
- Scanned text and `strings` extracted from binary blobs for private-key headers and high-confidence
  AWS, OpenAI, GitHub, GitLab, Shopify, Slack, Cloudflare, and generic assigned-secret patterns.
- Enumerated all historical paths resembling `.env`, credentials, secrets, access logs,
  certificates, private keys, and token files.
- Separately scanned every commit tree for email addresses, North-American phone numbers,
  street-address shapes, `/Users/marco`, Shopify store domains, and named retail references.
- Separately scanned Git author and committer metadata, which is not a blob and would otherwise be
  missed by a content-only audit.

Limits: this is deterministic pattern and provenance review, not OCR or face recognition over
images. Image paths and credits were reviewed; binary strings were credential-scanned.

## Findings and recommendations

| ID | Severity | First exact commit and path | Finding | Recommendation |
|---|---:|---|---|---|
| PS-1 | Clear | all 267 reachable commit objects, roots `43bd7e488829100331c584c5c44ca81ac5a4cc13` and `793ad87467224afa2ecf8d5894149ee334b7d1cc` (Git metadata, no path) | Author and committer are consistently `marconvm <marco@nvm.digital>` (534 metadata fields). | **Leave** if this is Marco's intended public business identity. Otherwise only a mailmap hides display; removal requires rewriting every commit. |
| PS-2 | Low | `b68d934d4b3fea3aed1f49befa948aeb2b43187a` — `lib/proofframe/catalog.json`, `tests/shopify.test.ts`; `85017cb103944857ef63d70b22fee4b24e5e61ce` — `docs/TECH-GUIDE.md`; `0e48db3c6cb16215608dae38d162e64a74b1e828` — `public/docs/TECH-GUIDE.md` | `playground-6mz3jwlf.myshopify.com` identifies Marco's password-gated POC store. No token or customer data accompanies it. | **Redact in a new commit** to `demo-store.myshopify.com` if the hostname is not part of the desired provenance. **Do not rewrite history** for this alone; password gate plus no credential makes it an identifier, not access. |
| PS-3 | Low | `40fabc0b44c632d65d4616012184f0d296373768` — `lib/proofframe/brand.ts` | Two WebMCP origin-trial token values are committed and emitted in HTML for `hemloop.app` and the Workers host. | **Leave.** Origin-trial tokens are origin-bound, expiry-bound, and designed to be public in `<meta http-equiv="origin-trial">`; they are not bearer credentials. |
| PS-4 | Low | `7c57da1c276ee933648ca229dcea50ab73e4d675` — `lib/proofframe/receipts.ts:164` | `orders@harborview.example` is the only email address found in blob content. | **Leave.** `.example` is reserved and this is clearly synthetic fixture data. |
| PS-5 | Low | `9c3ccdb0a2cc33ccad5429afaf9e841ef5e36f5c` — `lib/proofframe/receipts.ts:151` | The synthetic Northlight receipt uses `482 King St W, Toronto ON`, a plausible commercial address. No phone number was found anywhere. | **Leave** for submission, or replace with an unmistakably fictional address in a new commit. It is not a person's home address and does not justify history rewriting. |
| PS-6 | Informational | `adeb85056f0acd3dad8d0d984f5383608f48b876` — first real-brand product references; current paths include `lib/proofframe/closet.ts`, `lib/proofframe/merchants.ts`, `docs/PHOTO-CREDITS.md`, `README.md`, and tests | Bluenotes and Aeropostale names/photos appear as intentionally disclosed shopper-side catalog history; Northlight and merchant claims remain synthetic. No West49, Amnesia, Thriftys, or production Shopify store hostname was found. | **Leave.** The truth boundary and image permission/credits are documented. Recheck licence/permission only if that underlying approval changes. |
| PS-7 | Medium privacy, not security | `ec47ad7f5057162f9f1dcbc0854d1e94de2d1f79` — `docs/coordination/CODEX-COORDINATION.md` began the directory; 26 paths now exist under `docs/coordination/` (now `docs/internal/coordination/`) | Internal handoffs preserve review arguments, security-fix chronology, Cloudflare version IDs, branch/worktree instructions, deadlines, and local machine topology. | **Move/delete from the tip** if the public default tree should be tidy. Moving under `docs/internal/coordination/` hides it only from the rendered site, not GitHub. **Do not rewrite now** absent a confidentiality requirement; if private means truly private, strip the entire historical path before visibility and fresh-clone verify. |

### Exact absolute-path hits inside coordination history

These are the only blob paths found containing `/Users/marco`. The commit shown is the first
reachable commit that introduced the path-bearing content:

| Commit | Path |
|---|---|
| `56f198b6184a00808ed728f5dbe0afdf9770012d` | `docs/coordination/CLAUDE-ROUND3.md` |
| `78c4e0e6b3d10f1f52afbd66a694a3f77977fafe` | `docs/coordination/CODEX-DEMO-HANDOFF.md` |
| `db51a9076739bed862d14e24ea0d16a668b49bfd` | `docs/coordination/CODEX-WAVE5.md` |
| `64f507d6227c82a245cd0c21034fe53fad3ffef9` | `docs/coordination/CODEX-WAVE6.md` |
| `b47c584740588ef4cc4b980b53ce04b7f61b09c2` | `docs/coordination/CURSOR-HANDOFF.md` |
| `db51a9076739bed862d14e24ea0d16a668b49bfd` | `docs/coordination/CURSOR-WAVE5.md` |
| `128c215d343ca1f8cab905706ebee83107df6a10` | `docs/coordination/DUAL-REVIEW-WAVE4-BRIEF.md` |
| `2d6c069427cd5364925c9f7ae928289a0f4e4355` | `docs/coordination/GEMINI-WAVE5.md` |
| `6ef38c0142d9b3876a0957b9c60329e7063b41d6` | `docs/coordination/commerce-agents-gap-2026-09-02.md` |

Recommendation if retained: mechanically replace absolute paths with `~/projects/...` in the tip
before going public. This improves the default view but, honestly, is not a historical erasure.

## Negative results

- High-confidence credential/private-key patterns: **0 hits across all 968 blobs**.
- Generic quoted assignments to `api_key`, `access_token`, `auth_token`, `client_secret`,
  `password`, or `secret`: **0 hits**.
- Historical `.env`, credential, access-log, certificate, or private-key filenames: **0 hits**.
- Phone-number shapes: **0 hits**.
- Personal/home address evidence: **0 hits**; one synthetic commercial receipt address is PS-5.
- Production store domains `shop-bluenotes.myshopify.com` and
  `west49amnesia.myshopify.com`: **0 hits**.
- West49, Amnesia, and Thriftys names: **0 hits**.

## If Marco nevertheless chooses a history rewrite

Do it once, before visibility: freeze every writer; make an offline mirror backup; run a targeted
`git filter-repo` removing `docs/coordination/` (now `docs/internal/coordination/`) and replacing the POC hostname/author email only if
desired; force-push the intended public refs; delete stale remote branches; then clone into a new
directory and repeat this scan plus tests, build, route smoke, WebMCP runtime registration, and the
video's exact loop. Do not attempt that operation inside the current submission worktrees.

## Applied on the tip (2026-09-04 02:05 EDT, commit 7cfbce6 and this one)

- PS-7: `docs/coordination/` moved to `docs/internal/coordination/`; absolute paths rewritten to `~/`.
- PS-2: TECH-GUIDE deploy example uses a placeholder store; catalog.json and tests keep the POC hostname (identifier only, password-gated).
- PS-1, PS-3, PS-4, PS-5, PS-6: left as recommended. No history rewrite.

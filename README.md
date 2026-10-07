# DataDonate · visual demo

A self-contained, single-page product tour of the DataDonate platform for
researchers and collaborators. Updated to reflect the October 7, 2026
**Social Media Data Donation** participant experience. This is a visual
simulation, not a mirror of the live database or a consent document for collection.

**Open it:** double-click `index.html`. No server, build step, network access
or fonts are required. It works from `file://` in Chrome, Edge and Firefox.

**What it is not:** a working donation platform. Nothing is uploaded anywhere.
Projects, participants, donations, receipts and activity records are fictional
fixtures. Generated activity is seeded, so identical selections have the same
fingerprint on every visit. No real invitation tokens, participant records,
export files, or administrator credentials are included.

## What matches the updated study

- Four steps: **Review and consent → Choose a source → Add your file → Review
  and donate**, followed by a simulated receipt.
- TikTok and YouTube are required in the round; Instagram and Facebook are
  optional. Other supported platform capabilities remain outside this study.
- All study-approved records and available fields start included, across all
  dates. There are no participant field switches, date filters, or bulk removals.
- **Review or remove individual items** is collapsed initially. Search and
  pagination affect browsing only; individual records can be excluded/restored.
- Exact outgoing-data preview and explicit confirmation remain available.
- **Change file** demonstrates cancellation, an invalid-file attempt, and a
  successful replacement without losing the original choices on failure.
- Earlier-round receipts do not prevent a fresh donation in Round 2. A duplicate
  in the same round remains blocked.

The simulated source policy includes TikTok watch dates/links; YouTube viewing
dates, available video links/titles/channel names and post links/labels;
Instagram watched-video dates/links; and Facebook feed-shown posts/videos plus
main search-history dates/query words. Feed-shown is not proof of watching.
Facebook group links and search words can contain sensitive information. Likes,
messages, Marketplace activity and unrelated archive contents stay outside scope.
Missing source values remain missing.

Meta guides use standard **Available information**, **JSON**, **All time** and
**Low** media quality where offered—not the separate Data Logs request.

## Demo-only boundaries

Use the built-in samples; this page does not read or process your own ZIP files.
External-post links demonstrate the interaction in a local dialog rather than
opening real social-media posts. Donation acceptance, storage, administrator
actions, consent records and deletion are simulations held in memory. There is
no AWS connection, production login, email sending, real payment, or server upload.
Refreshing or choosing **Reset demo** clears the simulated session.

## Views

| # | Hash | What it shows |
|---|------|---------------|
| 1 | `#overview` | Plain-language promises, the "three layers" widget (what the software can read → what the study allows → what you choose), which services are ready |
| 2 | `#participant` | Four-step current-study flow in a browser frame, with seeded samples and a live fingerprint (SHA-256) |
| 3 | `#server` | "After you donate": animated diagram of the server's checks with what-if scenarios; technical log collapsed |
| 4 | `#admin` | "Research team": overview, donations, review & publish, pause switch for a service, withdrawals, audit |
| 5 | `#architecture` | "Where data goes": your device, the research server, secure storage; the three rules; one participant's timeline |

The page is written for readers who are not engineers. Technical details (file paths, hashes, request names) sit behind "For technical readers" toggles.

The default tour is intentionally brief: a short introduction, visible actions,
and expandable detail. Download guides, study explanations, server logs and
administrative reference material stay collapsed until requested. Consent text,
the included-data summary, privacy cautions, and explicit donation confirmation
remain available; **Change file** and **Back to sources** stay visible.

The views share one in-memory state: a donation made in view 2 appears in
views 3 and 4; suspending an adapter in view 4 changes view 2; publishing a
material release in view 4 forces re-consent in view 2. "Reset demo" in the
top bar returns everything to the starting state.

## Files

- `index.html` — page shell, inline icon sprite, static Overview/Architecture content
- `styles.css` — tokens mirrored from the product's stylesheet, all components
- `engine.js` — project policy, selection engine (v2 semantics), canonical JSON, SHA-256, manifest v2
- `data.js` — synthetic registry, projects, releases, rounds, participants, donations, consent, activity generator
- `app.js` — state, hash router, dialogs, toast, animation sequencer
- `views-tour.js`, `views-participant.js`, `views-admin.js` — the five views

Add `?nosubtle` to the URL to force the pure-JS SHA-256 fallback (same
results as WebCrypto).

## Verification

No build is needed to view the demo. Developers can run:

```powershell
node --test tests/data-engine.test.cjs
node tests/browser-smoke.mjs
node tests/reading-load.mjs
```

The browser checks reuse Playwright from the neighboring `project/node_modules`
installation and an installed Chrome browser. They run isolated, headless
contexts against local files, block external requests, and write screenshots
under `tests/output/`. They never operate the live study.
The reading-load check measures text visible by default against the previous
published demo (`2577c53`), excluding closed disclosures. It also saves screenshots
for visual review; it does not judge reading difficulty or measure completion time.

## Licence

Copyright (c) 2026 Pooriya Jamie, OASIS Lab. All rights reserved. The demo
may be viewed but not copied, modified, hosted or reused without written
permission; see LICENSE. Interested in using the platform? Contact OASIS Lab
at https://oasislab.science/.

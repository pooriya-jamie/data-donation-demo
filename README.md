# DataDonate · visual demo

A self-contained, single-page product tour of the DataDonate platform for
introducing the project to researchers, IRB reviewers and collaborators.

**Open it:** double-click `index.html`. No server, build step, network access
or fonts are required. It works from `file://` in Chrome, Edge and Firefox.

**What it is not:** a working donation platform. Nothing is uploaded anywhere.
Every project, participant, donation, receipt and activity record is
fictitious and generated on the page from a seeded random generator, so the
same numbers and fingerprints appear on every visit.

## Views

| # | Hash | What it shows |
|---|------|---------------|
| 1 | `#overview` | Plain-language promises, the "three layers" widget (what the software can read → what the study allows → what you choose), which services are ready |
| 2 | `#participant` | "As a participant": the five screens in a browser frame, driven by a port of the real selection engine with a live fingerprint (SHA-256) |
| 3 | `#server` | "After you donate": animated diagram of the server's checks with what-if scenarios; technical log collapsed |
| 4 | `#admin` | "Research team": overview, donations, review & publish, pause switch for a service, withdrawals, audit |
| 5 | `#architecture` | "Where data goes": your device, the research server, secure storage; the three rules; one participant's timeline |

The page is written for readers who are not engineers. Technical details (file paths, hashes, request names) sit behind "For technical readers" toggles.

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

## Licence

Copyright (c) 2026 Pooriya Jamie, OASIS Lab. All rights reserved. The demo
may be viewed but not copied, modified, hosted or reused without written
permission; see LICENSE. Interested in using the platform? Contact OASIS Lab
at https://oasislab.science/.

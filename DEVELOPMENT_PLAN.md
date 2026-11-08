# LetterCrack: development plan

Derived from `CLAUDE.md` and `specs.md` (v1.0, 16 Oct 2026). Plan date: 22 Oct 2026.
Current state: empty folder (two markdown files, no git repo, no code).

## 0. Environment facts that shape the plan

| Fact | Consequence |
|---|---|
| Dev machine is Windows 11 (Node 24, npm 11, git 2.54) | `npx expo run:ios` and `eas build --local -p ios` cannot run here. iOS native builds go through EAS cloud (`eas build -p ios`). Day-to-day work uses a dev build on an Android emulator or physical device plus Jest for the engine. |
| No Mac in the loop (assumed) | The `modules/icloud-kv` Swift module and WidgetKit cannot be compiled or debugged locally. Write it, build on EAS, test on TestFlight. Keep it behind an interface with a no-op fallback so the rest of the app never depends on it. |
| `../../research/cryptogram_section9.md` and `keywords_full.md` are not on this disk | Not blocking: the spec restates every requirement ID and all store text. Copy the research files next to the repo when available. |
| No backend, no network except ads / IAP / Sentry | Everything is testable offline; most of the app is pure TS and unit-testable without a device. |

Recommended order of work: engine and data first (pure TS, fully testable on Windows), UI second, native integrations (ads, IAP, iCloud) last, because they need EAS builds and store configuration to verify.

## 1. Phase 0: repo and scaffold (~45 min)

Output: a running Expo app with the design system, store, and CI skeleton.

- `git init`, `.gitignore`, create the GitHub repo, first push (CLAUDE.md: push at the end of every session).
- `npx create-expo-app` with the latest stable SDK, TypeScript strict, expo-router, `app.json` with bundle id `app.lettercrack`, display name "LetterCrack".
- Dependencies: zustand, react-native-mmkv, i18next + expo-localization, expo-haptics, expo-audio, expo-store-review, expo-notifications, expo-sharing, react-native-view-shot, expo-tracking-transparency, @sentry/react-native, react-native-google-mobile-ads, react-native-iap. Pin versions; note which ones force a dev build (MMKV, ads, IAP, Sentry).
- Fonts: Libre Baskerville, IBM Plex Mono, IBM Plex Sans via `expo-font` (all SIL OFL; record licences in `assets/fonts/LICENSES.md`).
- `src/ui/`: Ink & Parchment tokens from spec §10 (light + dark, high-contrast variant), text-size scale (4 steps on top of Dynamic Type), `Text`, `Button`, `Card`, `Chip` primitives. Own code only, no shared kit (App Store 4.3).
- `src/i18n/en.json` with the first strings; a pseudo-locale (`en-XA`) generator script for the §12 check.
- `src/data/schema.ts` (root shape from §9 with `schemaVersion: 1`), `src/data/repo.ts` (MMKV), `src/data/migrations/index.ts` runner that: backs up the raw blob under a versioned key, runs migrations in order, and on any throw restores the old blob, logs to Sentry, and continues with the old data. Fixture test harness in `src/data/migrations/__fixtures__/`.
- Jest + ESLint + typecheck scripts; GitHub Actions running `npm test`, `npm run typecheck`, `npm run lint`, `npm run quotes:validate`.
- `launchDate` constant in one place (`src/engine/daily.ts`); decide it before the first TestFlight because the daily index never changes afterwards.

Done when: app boots to a placeholder home in light and dark, fonts load, CI is green on an empty test suite.

**Status (22 Oct 2026): done**, with these decisions:
- Expo SDK 58, React Native 0.88, TypeScript 6, MMKV v4 (Nitro). Routes in root `app/` per CLAUDE.md.
- Ads, IAP, Sentry, haptics, audio, notifications etc. are **not installed yet**. They move to the phase that uses them, because the ads and Sentry config plugins need real IDs at prebuild time. Errors go through `src/lib/report.ts` until Sentry is wired.
- Data layer: corrupt JSON is set aside under `root.corrupt.<ts>` and the newest backup is tried. A failed migration or a newer-schema save (rollback) leaves the blob untouched and runs the session read-only.
- Rule 3 is enforced by tests: CI fails if a schema version lacks a migration or a fixture.
- `quotes:validate` already checks trademarks in shipped files, banned store words and quote provenance.
- Not yet verified on a device or simulator: the JS bundle builds (`expo export`), but no dev build has been run.

## 2. Phase 1: engine (~60 min)

All pure, seeded TypeScript in `src/engine/`, no React imports.

| File | Responsibility | Tests |
|---|---|---|
| `rng.ts` | Small seeded PRNG (e.g. mulberry32 over a string hash) | Same seed, same sequence |
| `cipher.ts` | Derangement of A–Z from a seed; `encrypt(text, map)`; only letters change | F1: property test over 10,000 seeds: no fixed points, bijective, determinism, non-letters untouched |
| `layout.ts` | Split a quote into lines given cells-per-line; never splits a word; apostrophes, hyphens and dashes stay attached | F2: 50 sample quotes at the XXL cell width, longest word wider than a line, punctuation-only tokens |
| `puzzle.ts` | Reducer: `select`, `type`, `delete`, `revealLetter`, `check`, `toggleAutoFill`; derived state: conflicts, filled, solved, clean flag; givens by difficulty (Easy 3–4, Medium 2, Hard 1, Expert 0) | Auto-fill fills every occurrence; conflicts detected; completion only when every cell correct; givens never a repeated letter; actions keyed by key id, not time (F3 no double entry) |
| `daily.ts` | `dailyIndex(date, launchDate)` on the device-local calendar date; maps to the reserved daily pool order; clamp so a forward clock jump cannot open more than today + 0 | F5: same result across timezones for the same local date; clock-forward test; never out of range (wrap when the pool is exhausted) |
| `picker.ts` | Next level quote: unseen first, then oldest-seen first; excludes dailies pool and reported quotes; respects difficulty band | F6: 1,000 picks over 600 quotes, 0 repeats before exhaustion |
| `hints.ts` | Free allowance (2/day, local midnight reset), rewarded cap 5/day, paid balance, spend order | F7 |
| `streak.ts` | Streak on consecutive local dates, 1 free freeze per week, never resets on a missed day if a freeze is available | Freeze consumption, week boundary, best streak |

Also here: `src/ads/policy.ts` (pure): decides `shouldShowInterstitial(event)` with every rule from hard rule 2 (after Next only, not first 3 solves, not dailies, 1 per 2 solves, 1 per 4 min, never on open, never stacked, off when Remove Ads owned). Unit-tested with a fake clock.

Done when: all engine tests green, 100% branch coverage on `cipher.ts`, `daily.ts`, `picker.ts`, `policy.ts`.

**Status (22 Oct 2026): done.** 672 tests in ~16 s. Decisions where the spec was open:
- **Frozen RNG:** `rng.ts` and `makeCipherKey` are pinned by literal golden values, because changing them would change every cipher already played.
- **Cell-based puzzle state:** state is one entry per character, so auto-fill off works. The save schema stores `entries` instead of a cipher→plain map. No build had shipped, so this stayed schema v1 with no migration.
- **What hints cost:** "Reveal" and "Check" each cost one hint. Either one removes the Clean solve badge. The gentle "full but wrong" highlight is free.
- **Layout:** a word longer than a line breaks after a hyphen or dash, filling the current line first. A dash-free word that is still too long is hard-split, and the split is counted.
- **Length bands per difficulty:** easy 40–80, medium 40–120, hard 60–160, expert 100–160. Givens always leave at least 2 letters to solve.
- **Clock-change rule (F5) is interpreted, not literal.** Offline, the app can't tell a moved clock from a player who was away, so it can't cap forward jumps without breaking returning players. Instead: future dailies are never playable, and streak credit is refused when the clock is set back below the highest date already seen. **Needs product sign-off.**
- **Streak freezes:** one per ISO week, applied automatically. Two missed days in the same week break the streak. Archive solves never count.
- **Ad policy and the clock:** if the clock moves backwards, the 4-minute rule is skipped and only the 2-solve rule applies.
- **`LAUNCH_DATE` is a placeholder (2027-01-01).** It must be fixed before the first external build.
- **Timezone testing:** Node on Windows ignores the `TZ` variable, so CI on Linux reruns the device-date test under 7 timezones.

## 3. Phase 2: content pipeline (parallel track, ~4 h incl. editorial review)

`tools/quotes/`, Node scripts, never bundled.

1. `fetch.ts`: download Gutenberg #27889 / #16732 (Bartlett 10th ed.) and Hoyt 1922 plain texts into `tools/quotes/raw/` (git-ignored); strip Gutenberg headers and licence blocks.
2. `extract.ts`: parse entries into `{ text, author, work, year, page }` candidates.
3. `filter.ts`: 40–160 chars, ≥ 4 words, letters ≥ 70%, author death year < 1956 from a hand-maintained `authors.json` (name, born, died, one-line bio), source published < 1929, dedupe on normalised text, banned-word list.
4. `review.csv`: editor marks keep / drop / fix wording. Keep this file in the repo; it is the editorial record.
5. `build.ts`: assigns permanent IDs (append-only; new quotes get new IDs; removed quotes keep their ID with `retired: true`), computes difficulty band and topics, writes `assets/quotes.v1.json` plus `assets/daily-order.v1.json` (365 IDs in fixed order).
6. `validate.ts` (`npm run quotes:validate`, runs in CI): every record has all provenance fields; death < 1956; year < 1929; no duplicate IDs or texts; no banned words; no trademark strings anywhere in `assets/`, `src/`, `store/`; daily pool has ≥ 365 entries; IDs never removed compared with the previous `quotes.vN.json`.

**Status (5 Nov 2026): pipeline built and run; editorial review not started.**
- `npm run quotes:fetch / quotes:extract / quotes:filter / quotes:build`, plus `quotes:test` (27 Node tests, in CI).
- On the real text: 8,069 candidates, **4,158 survive** into `tools/quotes/review.csv` (186 authors; 716 still need a work year). Bands: 2,300 easy, 1,086 medium, 496 hard, 276 expert.
- **Source correction:** Gutenberg #27889 is Bartlett's **9th** edition (1891, 1905 printing), not the 10th; specs.md §4.1 and the About page now say so. Hoyt 1922 is not ingested yet; classical authors with BC dates are left out.
- `build.mjs`: IDs append-only via `ids.json`, retired quotes keep their ID, refuses < 600 quotes unless `--allow-small`. The app skips retired quotes (`liveDailyOrder`, level pool).
- **To ship real content:** an editor marks `keep` / `drop` / `fix` in `review.csv` (many verse lines need `fix`), then `npm run quotes:build`, then point `src/content/quotes.ts` at `assets/quotes.v1.json`. Finish `fix` edits before the first release: editing a shipped quote's text retires its ID.

Targets: ≥ 600 reviewed quotes for v1.0 (365 dailies + 235 levels), two packs of 120 (Founders, Shakespeare) if ready.

Until real content lands, the app uses a 30-quote hand-written seed file so UI work is not blocked.

## 4. Phase 3: puzzle and solved screens (~75 min)

- `app/puzzle/[id].tsx` driven by a zustand store wrapping the reducer; autosave to MMKV after every action (F4).
- `src/ui/puzzle/Cell`, `Word`, `Grid`: monospace, cipher letter 12 pt above, guess 24 pt scaled by the text slider; selected cipher letter gets a brass underline on every occurrence; conflicts get a 15% fill plus a dotted underline (colour never the only signal).
- `src/ui/puzzle/Keyboard`: custom 3-row QWERTY + Delete, 52 pt keys, ≥ 44 pt targets, used letters dimmed not disabled, typewriter tick + haptic.
- Hint bar: Reveal, Check, remaining count; difficulty chip; menu (report quote, settings).
- Solved flow: reveal animation (letters flip left to right, 600 ms; fade under Reduce Motion), full quote in serif, author card (name, dates, one-line bio, work + year), Clean solve badge, Share, Next.
- VoiceOver: each cell "cipher K, guess E", each word a group; iPad hardware keyboard types into the selection.
- Performance: measure key → cell update; target < 50 ms on an iPhone 11-class device (F3). Avoid re-rendering the whole grid per key (memoised cells keyed by cipher letter).

Done when: a quote can be solved end to end from the seed file, kill-and-relaunch restores the exact state, XXL text and dark mode look right on phone and iPad simulator / tablet emulator.

**Status (22 Oct 2026): built and unit/component-tested.** Decisions and gaps:
- **Dev seed:** `assets/quotes.seed.json` holds 30 quotes, generated by `tools/quotes/seed.mjs`. Their IDs start at 90001, so they can never collide with real IDs. The seed has not been editorially reviewed and is replaced in Phase 2.
- **Transitions:** all of them run through one `apply` in `usePuzzleGame`, called from event handlers. It autosaves on every change and records the solve exactly once. No effect chains are needed, which satisfies the React Compiler lint rules.
- **Cell width is an exception to the 44 pt rule.** Cells are at least 44 pt tall but only as wide as a letter, as in every cryptogram app. A mis-tap only changes the selection. Keyboard keys are 52 pt tall and about 33 pt wide on a phone, as on the iOS keyboard.
- **Deferred to Phase 4:** share card, report-quote menu, archive and stats.
- **Deferred to Phase 6:** iPad hardware-keyboard typing, sounds and Settings.
- **Ads:** the interstitial hook is wired after Next only and returns false until AdMob lands in Phase 5.

## 5. Phase 4: home, daily, archive, stats, share (~45 min)

- Home: today's card (locked / in progress / solved), streak flame, Continue level N, archive entry, stats, settings. No ads.
- Daily: engine `daily.ts` + streak + freeze; solving a past daily from the archive does not count toward the streak.
- Archive: calendar of past dailies since launch date, gold dot when solved, all free.
- Stats: solved, clean solves, streak current / best, average time only when the timer setting is on, favourite authors.
- Share card: 1080×1350 off-screen view captured with `react-native-view-shot`, quote + author + "Solved on LetterCrack · lettercrack.app"; daily share only after solving; respects text size.
- Review prompt (F8) and daily reminder opt-in (F9) wired here.

**Status (5 Nov 2026): built and tested.**
- Home links to Archive, Stats and Settings. Archive is a month calendar back to launch; solved = filled brass dot, started = ring, and the status is in the VoiceOver label. Past dailies open from it; archive solves never touch the streak.
- Stats: solved, clean, dailies, streak, best, average time (timer on only), top 3 authors.
- Share card: 360×450 pt view captured at 1080×1350 with view-shot, then the share sheet. Uses the theme and text size; long quotes shrink to fit. Daily share only from the solved screen (no spoilers).
- Report quote: ⋯ on the puzzle header, confirm, then hidden locally; a level moves on to the next quote. The reported list goes into the Settings › Send feedback mailto.
- F8 review prompt: 3rd hint-free solve, ≥ 2 days after install, ≤ 3 a year and 30 days apart, only on a fresh solve (ads, if ever on, come after Next).
- F9 reminder: offered once after the 2nd daily solve; 9am local notifications for the next 7 days, rescheduled on every open and daily solve so a solved day gets none.

## 6. Phase 5: monetisation (~45 min + store setup)

**Decision (22 Oct 2026): the first release ships with no ads and no payments.** Both are behind switches in `config/features.json`, which is currently off. The AdMob and IAP SDKs are not installed, so the first build has no ad or billing code. Its privacy labels and Data safety form have no ad data, and there's no ATT or UMP prompt. When this phase is picked up:
- install the SDKs;
- add their config plugins only when the matching switch is on, via `app.config.ts`;
- turn the switch on, and update the guard test.

**Hints while both switches are off:** 5 free a day (`freeHintsPerDay()` in `src/config/features.ts`), since there's no other way to get hints. **When turning ads or payments on**, the allowance drops automatically to the spec's 2 a day. Decide whether that's wanted, and tell players in the release notes or in the app. The note is repeated in `config/features.json` and next to the guard test.

- `src/ads/`: AdMob init, UMP consent before any request, ATT soft prompt after the 3rd session (never mid-puzzle), interstitial gated only by `policy.ts`, rewarded ad grants +1 hint on `EARNED_REWARD` only, muted, G-rated content filters. Ad failures never block Next.
- `src/iap/`: the 5 v1.0 products, StoreKit prices only, Restore, purchase cache in MMKV, hints balance merge = max.
- `app/shop.tsx`: price, contents, "one-time", Restore, Terms / Privacy links.
- Needs outside the code: AdMob app + ad unit IDs, App Store Connect products, StoreKit test configuration file for the simulator, Play Console products.

## 7. Phase 6: settings, onboarding, accessibility, i18n (~30 min)

Settings screen per S7; onboarding "A CAT" mini puzzle then difficulty picker, no permission prompts; high-contrast theme; text-size slider applied everywhere including the share card; pseudo-locale pass; GB / AU / CA spelling check of `en.json`.

**Status (5 Nov 2026): built and tested.**
- Settings has every S7 item. Restore Purchases is hidden while payments are off. Privacy and terms link to lettercrack.app. "About our quotes" is its own screen.
- Onboarding: "A CAT" (fixed seed, no givens, no hints), Skip, then the difficulty picker. **Schema v2** adds `meta.onboardedAt` (players with history migrate as onboarded) and `meta.settingsUpdatedAt`, with migration, fixture and tests.
- Sounds: tick and paper rustle generated by `tools/sounds/make.mjs` (no third-party audio), off by default, respect the silent switch. The expo-audio plugin is left out so no microphone permission or background audio mode ships.
- Hardware keyboard: local module `modules/hardware-keys` (an invisible first-responder view on iOS, a focused view on Android; keydown on web). Letters type, Delete erases, arrows move.
- Spelling: UI and en-US store text use US spelling ("favorite").

## 8. Phase 7: native integrations, e2e, performance (~30 min + EAS time)

- `modules/icloud-kv`: local Expo module over `NSUbiquitousKeyValueStore`, TS interface with a no-op implementation on Android and in Expo Go; sync set per §9 with the stated merge rules (union sets as a compressed bitset, max counters, last-write settings, hints max).
- Android: enable Auto Backup including the MMKV directory.
- Maestro flows in `e2e/`: onboarding → daily solve → share → archive; kill and resume mid-puzzle; hint purchase with the StoreKit test config (iOS only).
- Sentry crashes only, no breadcrumbs with quote text.
- EAS profiles: `development`, `preview` (internal TestFlight / Play internal), `production`.

**Status (5 Nov 2026): code written; native parts not yet compiled.**
- `modules/icloud-kv` (Swift, NSUbiquitousKeyValueStore) plus the iCloud KV entitlement in app.json. `src/sync/` holds the pure merge (union sets, max counters, last-write settings, hints max), a base64 bitset for IDs, and a debounced runner; it is a no-op without the module. 11 tests.
- Android: `allowBackup` on (MMKV lives in files/, which Auto Backup includes).
- Sentry: `@sentry/react-native`, initialised only when `EXPO_PUBLIC_SENTRY_DSN` is set. No breadcrumbs, PII, tracing or screenshots; source-map upload off (`SENTRY_DISABLE_AUTO_UPLOAD`).
- Maestro flows in `e2e/` and an `e2e` EAS profile (`EXPO_PUBLIC_E2E=1` adds a hidden solve button). The StoreKit purchase flow waits for payments.
- `expo-dev-client` added for the `development` profile.
- **Not verified:** the Swift and Kotlin modules have not been compiled (no Mac; the local Android build hits the Windows path limit), and the Maestro flows have not run. Both need the first EAS build.

## 9. Phase 8: store readiness

- `store/en/`: title, subtitle, keyword field, Play name and short description exactly as spec §2; the §8 banned-word check runs over this folder in `quotes:validate`.
- 5 screenshots with the §2 messages, only PD authors shown.
- Review notes explaining hints, ad rules, IAPs; "About our quotes" page in Settings listing sources.
- Privacy labels for AdMob and Sentry; privacy policy hosted at lettercrack.app.
- Play: target audience 18+, Data safety, closed test from day 1.

**Status (5 Nov 2026): text ready, assets not.** `store/en/` has the iOS and Play listings, screenshot plan, review notes and privacy labels; all pass the banned-word check. Privacy policy draft: `docs/privacy-policy.md` (to host at lettercrack.app/privacy). Still to do by hand: screenshots, hosting the policy and terms, App Store Connect / Play Console setup, closed test track.

**Decisions made (5 Nov 2026):** `LAUNCH_DATE` is frozen at 2027-01-01, so public release should be on or after that date. The cell-width exception to the 44 pt rule stands (cells ≥ 44 pt tall). Hints stay at 5 a day while ads and payments are off.

## 10. Milestones

| Milestone | Contents | Exit check |
|---|---|---|
| M1 Engine green | Phases 0–1 | All engine + policy + migration tests pass in CI |
| M2 Playable | Phase 3 with seed quotes | Solve, autosave, VoiceOver, XXL text, dark mode |
| M3 Feature complete | Phases 2, 4, 6 | Real quote DB, daily + streak + archive + share, `quotes:validate` in CI |
| M4 Monetised build | Phases 5, 7 | EAS preview build on TestFlight and Play internal; ads and IAP work in test mode |
| M5 Submission | Phase 8 | spec §7 F1–F9 and §15 checklist all pass |

## 11. Risks and open decisions

1. **Launch date** must be fixed before the first external build; it anchors every daily index forever.
2. **iOS-only features on a Windows machine** (iCloud KV, StoreKit testing, VoiceOver checks) can only be verified via EAS + TestFlight, so budget an extra iteration loop for Phase 7.
3. **Quote content is the long pole.** Editorial review of 600+ quotes dominates calendar time; start the pipeline in Phase 1 and review in batches.
4. **Hoyt 1922 vs 1927**: confirm the Gutenberg or archive.org copy used is the 1922 edition before extracting.
5. **Fonts**: Libre Baskerville and the IBM Plex family are OFL; keep the licence files in the bundle.
6. **Rewarded ads after Remove Ads**: spec says they stay available; make sure the shop copy says Remove Ads removes interstitials, not the optional rewarded hint.
7. **Quote packs** (`pack.founders`, `pack.bard`): IAP products can be registered in v1.0 but only listed in the shop once their content passes validation.

## 12. Session rhythm

Each session: pick the next phase item, write tests first for engine work, run `npm test && npm run typecheck && npm run lint`, update this plan's milestone table, commit, push to GitHub.

## 13. Engagement phases A–D (Nov 2026)

All built and tested; schema is now v4 (`awards`, `outfit`) with fixtures v1–v4.

| Phase | Contents | Where |
|---|---|---|
| A | Daily goals (+1 hint), streak milestones and saved freezes, tomorrow's teaser, varied reminders, spoiler-free share line, word hop | `src/engine/goals.ts`, `streak.ts`, `src/game/teaser.ts` |
| B | Codebreaker rank (XP = letters decoded), 36 badges kept forever, Inky's wardrobe (21 items, earned only) | `src/engine/rank.ts`, `badges.ts`, `wardrobe.ts`, `src/game/awards.ts`, `app/wardrobe.tsx`, Stats shelf |
| C | Library (7 author sets, a checked fact per author in `tools/quotes/author-extras.json`), chapters every 10 levels (visual only, tenth level is a long quote), Sunday specials (pipeline puts long quotes on Sundays), monthly stamp book with a medal | `app/library.tsx`, `src/engine/chapters.ts`, `tools/quotes/build.mjs`, Archive |
| D | Android home-screen widget: today's cipher, streak, solved state; snapshot covers 7 days | `modules/home-widget`, `src/game/widget.ts` |

Decisions taken: chapters are visual only (no storyline, spec "no story meta"); no analytics (no backend, privacy);
no evening "your streak is waiting" reminder (it leans on loss aversion); goal rewards stay at +1 hint, to revisit if
the ads switch is turned on. Still open: the iOS widget (WidgetKit) needs the iOS build; these facts need a second editorial
look before release: John Trumbull (Yale exam at seven), Suckling (cribbage), Thomas Browne ("electricity"),
Bayly and Quarles (popularity), John Logan (lectures around 1780), Disraeli (age at first novel), Izaak Walton
(number of reprints) and Hood (Comic Annual).

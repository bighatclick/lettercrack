# CLAUDE.md: LetterCrack (Cryptogram)

Cryptogram puzzle game: decode public-domain quotes. One daily quote, a level path and a free archive. Expo + React Native + TypeScript. Offline; quotes ship in the app; no backend.
The full spec is in `specs.md`. Research is in `../../research/cryptogram_section9.md`.

## Commands
```bash
npm install
npx expo start
npx expo run:ios                 # native build (MMKV, ads, IAP need it)
npm test && npm run typecheck && npm run lint
maestro test e2e/
npm run quotes:fetch && npm run quotes:extract && npm run quotes:filter   # → tools/quotes/review.csv
npm run quotes:build             # reviewed CSV → assets/quotes.v1.json (IDs append-only via ids.json)
npm run quotes:validate          # provenance, death year, duplicates, banned words, IDs never removed
npm run quotes:test              # pipeline unit tests (node --test)
eas build --profile e2e -p android && maestro test e2e/
eas build --local -p ios
```
Push to GitHub at the end of every session.

## Architecture
- `app/`: expo-router screens (home, puzzle, solved, archive, stats, shop, settings, onboarding).
- `src/engine/`: pure TS, no React. `cipher.ts` (seeded derangement), `layout.ts` (word wrapping), `puzzle.ts` (reducer), `daily.ts`, `picker.ts` (unseen-first).
- `src/data/`: MMKV repo, `schema.ts`, `migrations/` + fixtures.
- `src/ads/policy.ts`: all ad timing logic (unit-tested). `src/iap/`: products and restore.
- `config/features.json`: the **ads** and **payments** switches. **Both are off for the first release.** Every ad or payment entry point checks `src/config/features.ts` first; with a switch off, no SDK call, prompt (UMP/ATT) or shop/restore UI appears. Turning one on needs a new native build, and the guard test in `src/config/__tests__/features.test.ts` must be updated at the same time. **Note:** while both are off, players get 5 free hints a day. Turning either switch on drops that to the spec's 2 a day automatically, so decide whether that's wanted and tell players.
- `src/ui/`: the **Ink & Parchment** design system. Only this app uses it.
- `modules/icloud-kv/`: local Expo module (NSUbiquitousKeyValueStore); merge rules in `src/sync/merge.ts`.
- `modules/hardware-keys/`: local Expo module for hardware keyboard input on the puzzle screen.
- `tools/quotes/`: offline content pipeline (extract → filter → human review CSV → build). Never runs in the app.
- `assets/quotes.vN.json`: the shipped quote DB. **Quote IDs are permanent; never renumber or reuse an ID.**

## Hard rules
1. **No lives, no fail state, no countdown timers.** The timer is an opt-in stat only.
2. **No ads mid-puzzle.** Interstitial only after tapping Next on the solved screen; none in the first 3 puzzles or on dailies; max 1 per 2 solves and 1 per 4 min; never on app open; muted. Rewarded is opt-in for +1 hint.
3. **Never lose progress or a streak.** Every schema change needs a migration plus a fixture test. Back up before migrating; never wipe on failure. Hints balance merge = max(local, cloud).
4. **Public-domain quotes only:** author died before 1956 and source published before 1929. Every record has author, dates, work, year, source collection and edition. Never import from quote APIs, Kaggle, Goodreads or lyrics; never bulk-copy Wikiquote (CC BY-SA).
5. **Content filter:** nothing a 4+ audience shouldn't see; no political or religious preaching; editorially reviewed.
6. **No repeats** until the pool is exhausted (seenQuoteIds tracked and synced).
7. **Trademarks:** never use "Cryptoquip" or "Cryptoquote" anywhere we ship.
8. **Store words:** no "free", "no ads", "#1", "best" or emoji in `store/en/` or screenshots.
9. No coins, energy, subscriptions, fail offers, piggy banks or weekly ad rental.
10. All UI text in `src/i18n/en.json`; prices from StoreKit. Ad and IAP failures never block play.

## Conventions
TypeScript strict; engine functions are pure and seeded. Monospace font for cipher cells (alignment matters). Every cell accessible to VoiceOver. Touch targets ≥ 44 pt. Respect Reduce Motion and the text-size setting everywhere, including the share card.

## Testing
Cipher property tests (10K seeds) · word wrapping with long words and punctuation · picker no-repeat test · daily determinism across timezones · migrations with fixtures · quote DB validation in CI (`npm run quotes:validate` must pass).

## Definition of done
specs.md §7 acceptance criteria pass · tests green · typecheck clean · checked at the largest text size, in dark mode and on iPad · strings in en.json · no hard rule broken.

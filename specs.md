# LetterCrack: Cryptogram Decode (product spec v1.0)

Status: ready to build · Research date: 16 Oct 2026 · Owner: @Utkarsh
Research sources:
- `../../research/cryptogram_section9.md`: competitors, review mining, paywall, requirements CG-R01…R21, quote sourcing
- `../../research/keywords_full.md`: keywords, store metadata, naming

---

## 1. Product summary

| Item | Decision |
|---|---|
| One-line positioning | A calm, classic cryptogram with timeless quotes: one fresh daily, no lives, no timers, and ads that never interrupt a puzzle. |
| Platforms | iOS first (iPhone + iPad), then Google Play |
| Target market | US first, then UK / CA / AU. Word-puzzle fans 35+ |
| Game | Substitution-cipher puzzles of public-domain quotes; daily quote + level path + free archive |
| Growth | Organic: ASO ("cryptogram", "cryptograms", "decode", "quote of the day"), daily streak, author card share, review prompt after solves |
| Monetisation | Between-puzzle interstitials (capped), opt-in rewarded hints, Remove Ads $4.99, hint packs, quote packs. No coins, lives, timers or subscriptions |
| Running cost | $0 per user: quotes ship inside the app; no backend |
| Build budget | v1.0 core in ~4–6 h of Claude Code time; the quote database (§4) is a separate content task (~half a day incl. editorial review) |
| Success metrics (M3) | Rating ≥ 4.7, crash-free ≥ 99.8%, D7 ≥ 20%, D30 ≥ 8%, daily completion ≥ 35% of DAU |

**Trademark rule:** never use "Cryptoquip" or "Cryptoquote" (King Features) in the name, keywords, IAP names, screenshots or UI. Use "cryptogram".

---

## 2. Store listing

| Field | Value |
|---|---|
| iOS title | LetterCrack: Cryptogram Decode |
| iOS subtitle | Cryptograms & quote of the day |
| iOS keyword field | cipher,caesar,puzzle,puzzles,word,brain,daily,codeword,letters,logic,riddle,famous,author,wisdom |
| Play name | LetterCrack: Cryptogram Quotes |
| Play short description | Decode a famous quote every day. Calm cryptogram puzzles, no timers or lives. |
| Display name | LetterCrack |
| Bundle ID / package | `app.lettercrack` (domain lettercrack.app; .com is taken) |
| Category | Games › Word (secondary: Puzzle) |
| Age rating | 4+ (after the content filter, §4.3); Play target audience 18+ |
| Screenshot messages | 1) "Decode a timeless quote every day" 2) "No timers. No lives. Solve at your own pace." 3) "Meet the author behind every quote" 4) "Big, clear letters, easy on the eyes" 5) "Your streak and progress, safely backed up" |
| Banned | "free", "no ads", "#1", "best", emoji, competitor names, Cryptoquip/Cryptoquote, quotes from living or modern authors in screenshots |

---

## 3. Scope

### v1.0 (must ship)
CG-R01 backup · R02 migrations · R03 ad rules · R04 no timer by default · R05 no repeats · R06 provenance + author card · R07 no lives / no fail · R08 Remove Ads · R09 reliable daily + archive · R10 input quality + auto-fill · R11 hints · R12 difficulty · R13 content filter · R14 accessibility · R15 streak + freeze · R16 stats · R18 iPad · share card (R19 pulled forward: cheap and drives organic growth).

### v1.1
R17 quote packs (IAP products can ship in v1.0 with 2 packs if the content is ready) · R20 home-screen widget (daily status + streak; needs a native WidgetKit target) · localisation check.

### Later / never
R21 events or story meta (likely never) · never: lives, energy, timers by default, coins, subscriptions, fail offers, piggy banks, weekly ad rental.

---

## 4. Content: the quote database

### 4.1 Sources (public domain only)
| Source | Use |
|---|---|
| Bartlett's *Familiar Quotations*, 9th ed. (1891; Project Gutenberg #27889 is its 1905 printing. Corrected 5 Nov 2026: #27889 is not the 10th ed., and #16732 is a small early edition) | Primary candidate pool (strip the Gutenberg header/licence from anything we keep) |
| Hoyt's *New Cyclopedia of Practical Quotations*, **1922 edition** (not the 1927 revision) | Primary pool + topic tags |
| Original public-domain texts (Gutenberg / Wikisource transcriptions) | Check every quote's wording |
| Wikiquote (CC BY-SA) | Reference for checking attributions only. **Never bulk-copy** |
| Quote APIs, Kaggle/Goodreads scrapes, lyrics, film lines, living authors | **Never** |

Filters: author died before 1956 **and** the source text was published before 1929; translations only if the translation was published before 1929.

### 4.2 Pipeline (`tools/quotes/`, run on a dev machine, not in the app)
1. `extract.ts`: parse the Bartlett/Hoyt plain texts into candidate records.
2. `filter.ts`: length 40–160 characters for v1 difficulty bands, ≥ 4 words, letters ≥ 70% of the characters, author death year < 1956, deduplicate (normalised text).
3. `review.csv`: a human editor marks keep/drop. Drop slurs, violence, religious or political preaching, archaic gendered generalisations, anything a 4+ audience shouldn't see (CG-R13).
4. `build.ts`: writes `assets/quotes.v{N}.json` with `{ id, text, author, authorDates, work, workYear, sourceCollection, sourceEdition, topics[], difficulty }`.
- v1.0 target: **≥ 600 reviewed quotes** (365 reserved for dailies + 235+ for levels); grow to 1,500 in updates.
- Quote IDs are stable forever (never renumber), because seen-tracking and streaks reference them.

### 4.3 Content rules
Author card after every solve: name, life dates, one-line who-they-were (written by us), source work + year. No living people. A "Report quote" button sends nothing online; it hides the quote locally and adds it to a list included in the next feedback email (mailto).

---

## 5. Puzzle mechanics

| Rule | Decision |
|---|---|
| Cipher | Random letter substitution per puzzle; a derangement (no letter maps to itself); only A–Z are encrypted; punctuation, digits and spaces are shown as-is |
| Seed | Level puzzles: seeded by `quoteId + "lvl"`, so every player sees the same cipher and support is easier. Daily: seeded by the date |
| Givens (difficulty) | Easy: 3–4 letters pre-filled, quote ≤ 80 chars · Medium: 2 · Hard: 1 · Expert: 0 and 100–160 chars. Player picks per puzzle; default Medium |
| Input | Tap a cell (selects that cipher letter everywhere), type on a **custom large-key A–Z keyboard**; the letter fills every occurrence (auto-fill ON by default, setting to turn off). Duplicate guess: the same plain letter used for two cipher letters is highlighted (setting "Highlight conflicts", default on) |
| Mistakes | **No lives, no fail.** Wrong letters are not judged until "Check" or completion. An optional "Clean solve" badge if no hints and no check were used |
| Completion | When every cell is filled correctly: reveal animation, author card, share button, next. If filled but wrong, the wrong letters are highlighted gently; no penalty |
| Timer | Hidden by default; Settings › "Show solve time" turns on a stat (never a countdown) |
| Hints | "Reveal a letter" (fills one cipher letter everywhere) and "Check" (marks wrong letters). 2 free hints per day + rewarded ad (+1 per ad, cap 5/day) + hint packs |
| Daily | Date-seeded from the reserved daily pool (deterministic order from day 1 = launch date); works offline; never "missing"; past dailies playable in a free archive; the streak counts dailies solved on their own date; 1 free streak freeze per week; never charge to restore a streak |
| No repeats | Track `seenQuoteIds` (synced). Level play picks unseen quotes first; only after the pool is exhausted does it repeat, oldest-seen first |

---

## 6. Screens

| # | Screen | Contents |
|---|---|---|
| S1 | Home | Today's quote card (locked or solved state, streak flame), "Continue level N", archive calendar, stats, settings. No ads. |
| S2 | Puzzle | Quote cells (cipher letter small above, guess big below), word wrapping that never splits words, custom keyboard, hint buttons (Reveal / Check), difficulty chip, menu. Autosaved after every key. |
| S3 | Solved | Full quote in serif, author card, share card button, "Next", streak update. The interstitial (if due) only after tapping Next. |
| S4 | Archive | Calendar of past dailies (solved = gold dot); all free. |
| S5 | Stats | Puzzles solved, clean solves, streak (current/best), average time (only if the timer is on), favourite authors. |
| S6 | Shop | Remove Ads, hint packs, quote packs, Restore. |
| S7 | Settings | Auto-fill, highlight conflicts, show timer, text size slider, dark mode, high contrast, sound/haptics, daily reminder, Restore Purchases, privacy and terms, "About our quotes" (sources and public-domain policy). |
| S8 | Onboarding | One tiny interactive puzzle ("A CAT"), then the difficulty picker. No permission prompts. |
| S9 | Share card | 1080×1350: quote + author + "Solved on LetterCrack · lettercrack.app". Daily share only after solving (no spoilers). |

---

## 7. Functional requirements (acceptance criteria)

| ID | Requirement | Acceptance |
|---|---|---|
| F1 | Cipher generator | Pure TS; property test: derangement holds for 10K seeds; the same seed gives the same cipher; non-letters are untouched |
| F2 | Layout | Words never break across lines; handles apostrophes, hyphens and dashes; tested with 50 sample quotes at XXL text |
| F3 | Input latency | Key → cell update < 50 ms on iPhone 11; no double entry (debounced by key id, not by time) (CG-R10) |
| F4 | Autosave | State saved after every key; kill and relaunch restores exactly |
| F5 | Daily | `dailyIndex = daysSince(launchDate)`; pool order fixed in the asset; offline; timezone = device local date; changing the clock forward can't skip ahead more than 1 day (archive covers missed days) |
| F6 | No repeats | Unit test: 1,000 level picks over a 600-quote pool give 0 repeats before exhaustion |
| F7 | Hints | Daily free allowance resets at local midnight; rewarded hint grants +1 after `EARNED_REWARD` only |
| F8 | Review prompt | After the 3rd solve with no hint, ≥ 2 days after install, max 3/year, never right after an ad |
| F9 | Reminder | Opt-in local notification after the 2nd daily solve: "Today's quote is ready" |

---

## 8. Monetisation

### Ads (AdMob via react-native-google-mobile-ads)
- Interstitial only after tapping "Next" on the solved screen; never in the first 3 puzzles or on dailies; max 1 per 2 solves and 1 per 4 minutes; never on app open; never stacked.
- No banners on the puzzle screen in v1.0.
- Rewarded: +1 hint (cap 5/day). Opt-in only; still available after Remove Ads.
- Muted; G-rated; block gambling, dating, sexual, politics. UMP consent (EEA/UK) before any ad request; ATT soft prompt after the 3rd session, never mid-puzzle.

### In-app purchases (react-native-iap)
| Product ID | Type | Price | Contents |
|---|---|---|---|
| `app.lettercrack.removeads` | Non-consumable | $4.99 | Removes all interstitials and banners, forever |
| `app.lettercrack.hints15` | Consumable | $1.99 | 15 hints |
| `app.lettercrack.hints50` | Consumable | $4.99 | 50 hints |
| `app.lettercrack.pack.founders` | Non-consumable | $2.99 | 120 quotes: Franklin, Jefferson, Lincoln, Washington … (all PD) |
| `app.lettercrack.pack.bard` | Non-consumable | $2.99 | 120 Shakespeare lines |
| `app.lettercrack.complete` (v1.1) | Non-consumable | $9.99 | Remove Ads + all packs + 50 hints |

Paywall copy: price, contents, "one-time", Restore, Terms/Privacy. No timers, fake discounts, fail offers or piggy banks. Hint balance syncs (iCloud KV) so purchased hints survive a new phone.

---

## 9. Data and backup (CG-R01, R02 MUST)
Same pattern as all our apps, implemented fresh here (no shared package):
- MMKV store, root `{ schemaVersion, settings, progress: { levelIndex, seenQuoteIds[], solved{id: {date, clean, timeMs}} }, daily: { streak, best, freezesUsedWeek, solvedDates[] }, hints: { balance, freeUsedDate }, inProgress, unlocks, purchasesCache }`.
- Migrations in `src/data/migrations/` with fixture tests; back up the raw blob before migrating; on failure keep the old data, Sentry log, never wipe. **No update may reset progress or a streak.**
- iCloud KV sync (local Expo module `modules/icloud-kv`): seenQuoteIds (compressed bitset by ID), solved count, streak, hints balance, unlocks, settings. Merge: union for sets, max for counters and streak, last-write for settings, hints = max(local, cloud) to never lose purchased hints.
- Android v1: Auto Backup incl. the MMKV dir; Play Games Saved Games in v1.1.

---

## 10. Design system: "Inky Pop" (unique to this app)

| Token | Value |
|---|---|
| Mood | Bright, playful and soft-3D: a colourful puzzle box with a friendly mascot |
| Mascot | **Inky**, a glossy blue ink drop with amber eyes and a brass monocle, drawn in SVG in a soft 3D animated-film style. Poses: idle, wave, think, cheer. Bobs, blinks, waves and jumps. Tips from Inky are general solving advice, never spoilers |
| Light | bg `#FFF8EC` (cream) · surface `#FFFFFF` · raised `#F3EEFF` · ink `#1E1B3A` · primary `#6D3FE0` (violet) · accent `#FFC93C` (sunny) · conflict `#C81D3A` at ~14% fill · given letters `#3F4C80` |
| Dark | bg `#14112B` · surface `#1F1B3D` · ink `#F4F1FF` · primary `#A98BFF` · accent `#FFC93C` |
| Hues | Six colour families cycle across words, weekdays and charts: coral `#FF6B6B`, sunny `#FFC93C`, teal `#20C3AF`, sky `#4DA3FF`, violet `#6D3FE0`, pink `#FF7EB6`. Each has a deep shade (text, 3D edges) and a pale tint; contrast is unit-tested in every palette |
| Gradients | night (violet), sunset (coral → yellow), lagoon (teal), sunshine, sky, candy; used for hero headers, tiles and the solved screen |
| Type | UI: **Nunito** 600–900; quotes: **Libre Baskerville**; cipher cells and keyboard: **IBM Plex Mono** 600 (equal-width letters keep columns aligned) |
| Cells | Each word is its own hue: empty tiles are tinted, filled tiles solid with a 3D bottom edge; the selected tile is sunny yellow with a violet outline and lifts; other tiles with the same cipher letter glow pale yellow. Guess letter 24 pt (scales with the text slider), cipher letter 12 pt above |
| Keyboard | 3 rows QWERTY + Delete, key height 52 pt; each row has its own coloured edge (sky, teal, pink); used letters dimmed (not disabled); keys squish on press |
| Motion | Screens stagger in; buttons squish and shine; floating cipher letters in headers; solve: letters flip left to right (600 ms), then confetti, turning rays and a stamped seal. Reduce Motion: every loop stops and the solve is a fade |
| Sound | Typewriter key tick (soft), paper rustle on solve; off by default except haptics |
| Icon | A brass key over a parchment letter "Q" with an oxblood cipher mark; no text |

---

## 11. Accessibility (CG-R14)
Text-size slider (4 steps) + Dynamic Type; VoiceOver: each cell reads "cipher K, guess E" and each word as a group; high-contrast mode; dark mode; colour never the only signal (conflicts also get a dotted underline); key targets ≥ 44 pt; works with an external keyboard on iPad (hardware keys type into the selected cell).

## 12. Internationalisation
i18n-ready UI (expo-localization + i18next; strings in `src/i18n/en.json`; store text in `store/en/`; pseudo-locale test). **Puzzle content is English-only**: localising the game needs native-language PD quote sets, so it is a later project; UI translation alone is not enough. Check GB/AU/CA English spelling in the UI.

## 13. Technical architecture
Expo (latest stable SDK) + TypeScript strict + expo-router; zustand + MMKV; engine in `src/engine/` (cipher.ts, layout.ts, puzzle.ts reducer, daily.ts, picker.ts); react-native-google-mobile-ads; react-native-iap; expo-haptics, expo-audio, expo-store-review, expo-notifications, expo-sharing, react-native-view-shot, expo-tracking-transparency; @sentry/react-native (crashes only). Not allowed: backend, login, attribution SDKs, network calls at runtime except ads, IAP and Sentry.

## 14. Testing and definition of done
Unit: cipher (property tests), layout (word wrapping), picker (no repeats), daily (deterministic across timezones and clock changes), hints allowance, ad policy, migrations with fixtures. Component: cell selection + auto-fill + conflicts. E2E (Maestro): onboarding → solve the daily → share → archive; kill/resume mid-puzzle; purchase hints in a StoreKit test config. Quote DB validation script: every record has the provenance fields, author death < 1956, no duplicates, no banned words. Done = all MUSTs pass, tests green, typecheck clean, XXL text and dark mode checked, `store/en/` ready.

## 15. Store compliance (12b)
- [ ] 4.3: own design and code (no shared UI kit with our other apps).
- [ ] Metadata: no free/no ads/#1/best/emoji/competitor names, no Cryptoquip/Cryptoquote.
- [ ] 2.1 review notes: explains hints, ads rules, IAPs; "About our quotes" page shows the PD sources.
- [ ] Restore Purchases.
- [ ] Privacy labels cover AdMob and Sentry; privacy policy at lettercrack.app.
- [ ] UMP + ATT after the 3rd session.
- [ ] Play: 18+ target audience, Data safety, closed test from day 1.

## 16. Build plan
| Step | Est. | Output |
|---|---|---|
| 1 | 45 min | Scaffold, Ink & Parchment tokens, fonts, MMKV + schema + migrations |
| 2 | 60 min | Engine: cipher, layout, puzzle reducer, picker, daily + tests |
| 3 | 75 min | Puzzle screen: cells, custom keyboard, auto-fill, conflicts, hints, autosave, solved screen + author card |
| 4 | 45 min | Home, archive, stats, streak + freeze, share card |
| 5 | 45 min | Ads + IAP (5 products) + shop + restore |
| 6 | 30 min | Settings, accessibility, onboarding, i18n, pseudo-locale |
| 7 | 30 min | iCloud KV module, e2e flows, performance pass |
| Content | ~4 h (parallel) | `tools/quotes` pipeline → 600 reviewed quotes + 2 packs of 120 |

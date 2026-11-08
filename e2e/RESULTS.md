# E2E run results (suite v2)

Run on 8 Nov 2026 against `c1fc66c` (latest `main`). The steps are in `TEST_CASES.md` v2. The v1 run's results are in git history.

| Item | Value |
|---|---|
| **Build** | New local debug APK from `npm run android:local` (native rebuild, 27 min). Metro run with `EXPO_PUBLIC_E2E=1`. |
| **Phone** | SalesTrackerApi35 (Pixel 7, Android 15), used for U0 and J1–J14. |
| **Tablet** | SalesTrackerTablet (2560×1600), used for 13.10. |
| **Content and clock** | Dev seed quotes. The clock was moved from 10 Jan to 26 Feb 2027 as the journeys required. |
| **Motion** | Android "Remove animations" (Reduce Motion) was **on** for most journeys. Animations were turned on separately for 2.6 and the animation checks. See "How this run was done". |

## Summary

**165 of 188 steps passed (88%).** 15 failed. 8 could not be run or fully checked.

| Journey | Steps | Pass | Fail | Not run / partial | Notes |
|---|---|---|---|---|---|
| U0 Upgrade (v2 save → v4) | 7 | 6 | 0 | 1 | Migration is clean: 11 badges and 5 outfits were awarded from old progress, and nothing was lost. U.7 doesn't apply because the old best streak was 3. |
| J1 Onboarding and Home | 12 | 12 | 0 | 0 | 1.10 has D11: the greeting goes stale until Home re-renders. |
| J2 Daily puzzle and Solved | 24 | 22 | 1 | 1 | 2.1 fails on D13: Check works with nothing typed and costs a hint. 2.6 (word hop) not verified. |
| J3 Levels, chapters, rank | 24 | 21 | 3 | 0 | 3.3 and 3.4 fail on D14. 3.22 fails on D17 (double tap on Next). |
| J4 Daily goals | 9 | 9 | 0 | 0 | |
| J5 Hints | 6 | 5 | 1 | 0 | 5.5 fails on D13. 5.4 passes only after reopening the puzzle (D18). |
| J6 Streak, freezes, reminder | 16 | 15 | 1 | 0 | 6.13 fails on D21. D19 (two reminders at once) was seen once. |
| J7 Archive and stamp book | 11 | 7 | 2 | 2 | 7.4 fails on D23. 7.11 fails on D20. 7.6 is blocked by D20. 7.7 wasn't checked separately. |
| J8 Stats and badges | 10 | 9 | 1 | 0 | 8.8 fails on D24. |
| J9 Library | 9 | 9 | 0 | 0 | |
| J10 Wardrobe | 13 | 13 | 0 | 0 | D25: "Top hat" shows as "Top". |
| J11 Android widget | 9 | 9 | 0 | 0 | 11.5: the streak line couldn't be checked, because the streak was 0 after earlier clock jumps. |
| J12 Settings | 15 | 13 | 1 | 1 | 12.6 fails at text size 4 (see J13). 12.13: Gmail opens but isn't signed in, so the mail body couldn't be read. |
| J13 Accessibility and tablet | 12 | 6 | 5 | 1 | Largest text size: D26, D27, D28, D29. Touch targets: D8 (open since v1). Tablet: D31, a regression of D7. |
| J14 Resilience and deep links | 11 | 9 | 0 | 2 | 14.6 (no Play Store) and 14.7 (one MMKV file) can't be run here, as in v1. D30 for deep links. |
| **Total** | **188** | **165** | **15** | **8** | |

## Defects found in this run

| # | Severity | What happens | How to reproduce | Likely cause |
|---|---|---|---|---|
| D13 | **Medium** | "Check" is enabled before the player types anything, and tapping it costs a hint and makes the solve not clean. "Type some letters first." never shows. | Open any Hard or Easy puzzle (it has a given letter) and tap Check: 5 → 4 hints. The same happens with only revealed letters on the board (5.5). | `src/ui/puzzle/PuzzleView.tsx:38` sets `canCheck` from any entry, including givens and reveals. It should count only letters the player typed. |
| D17 | **Medium** | A quick double tap on "Next puzzle" opens two puzzle screens. One Back still shows a second copy of the level. | On any level's Solved screen, tap Next twice within about 100 ms. | `next` in `app/solved.tsx` is not guarded against a second press before navigation. `disabled={busy}` doesn't take effect in time. |
| D26 | **Medium** | At the largest text size, Home's tiles break words and clip text: "Inky's wardro / be", and the second lines ("17 of 18 authors", "11 items unlocked") are cut off. | Android font size at maximum plus app text size 4, then open Home. | The tile has a fixed height, and the title has no `fitTitle` treatment. |
| D28 | **Medium** | At the largest text size, Library author initials spill out of their circles, overlap neighbouring tiles ("EB J", "J LC"), and are clipped at the bottom. | Same setting, then open Library. | Author tiles are a fixed size but the text scales. |
| D29 | **Medium** | At the largest text size, badge names on the Stats shelf break mid-word and are cut off ("Cent / ury", "Clea / n s…", "1,00 / 0 le…"). | Same setting, then open Stats › Badges. | Badge captions are narrow fixed columns with `numberOfLines`. |
| D31 | **Medium** (regression of D7) | On the tablet, Home cuts off text again: the Today tag reads "TODAY'S" without "QUOTE", and Inky's bubble ends "…Let's crack" without "it!". | Pixel Tablet AVD, Home, in landscape or portrait. | The v1 fix (the "simple" line breaker) is not reaching these two texts in the new Home layout. |
| D14 | Low | The difficulty sheet keeps a pick that was cancelled or dismissed. When reopened, that pick is selected and "Restart" is active, so one tap restarts the puzzle at a difficulty never confirmed, and its progress is lost. | Tap the chip, pick Medium, tap outside (or Cancel), reopen: Medium is selected and Restart is enabled. | The sheet's local selection isn't reset on close. |
| D11 | Low | Home only re-renders when saved data changes. Coming back to the app on the same day, or after a clock rewind, shows stale content: "Good morning" at 14:00, the later day's goals, or "Crack it" for a solved daily. | Open Home at 10:00, background the app, set the clock to 14:00, foreground: still "Good morning". | `app/index.tsx:80` reads the hour and `today()` at render time, and nothing re-renders on `AppState` change unless the root changes. |
| D18 | Low | A puzzle left open past midnight keeps showing "No hints left today" until it's reopened. | Use every hint, leave the puzzle open, move the clock to the next day, foreground. | Same cause as D11: the hint bar doesn't re-render on a date change. |
| D21 | Low | After a solve on a rewound clock, Home still shows "Crack it" and "Solve today's quote 0 of 1" for that day. | Move the clock back one day after a solve, solve that day's daily, go Home. | The rewound-clock guard doesn't add the date to `solvedDates`, and Home uses only that list. |
| D20 | Low (seed only) | Every date whose daily quote was solved on a later date counts as solved. 1–9 Jan showed solved without being played, which inflated the stamps, "Regular", "Time traveller" (earned 11 Jan) and "Sunday regular" (earned with 3 Sundays). | Dev seed: solve the 13 Jan daily (90008); 3 Jan, which has the same quote, shows as solved. | `src/game/archive.ts:19-20` decides by `progress.solved[quoteId].date >= date`. It only matters once dailies repeat, which with the real database is years away. |
| D23 | Low | After solving an archive day, the Solved screen offers "Play a level" instead of "Back to archive". | Archive › an open day › solve it. | The puzzle → Solved `router.replace` in `app/puzzle/[key].tsx:54` doesn't pass `from: 'archive'`. |
| D24 | Low | "New" labels on the Stats badge shelf vanish about 1.5 s after Stats opens, while the player is still looking. Badges first shown on a Solved screen never get a "New" label in Stats at all. | Upgrade an old save (U0), open Stats, wait 2 s: the labels are gone. | `app/stats.tsx:34`: `freshBadges` depends on `root`, so marking them seen re-renders the list without them. |
| D16 | Low | Replaying a quote whose author is already collected shows "New author for your Library!". | After every quote has been used, level 20 replays Austen and the tag appears. | The author check counts solved quotes by that author, and a replay still counts as 1. |
| D15 | Low | After every solve, the Solved card says "New outfits for Inky! …" and repeats every unseen item until the wardrobe is opened, though the card claims to list this solve's awards. | Earn an outfit, then solve two more puzzles without opening the wardrobe. | This is intended in `app/solved.tsx:70`, but the wording reads as new each time. Show only items earned by this solve. |
| D25 | Low | The wardrobe tile for "Top hat" shows only "Top". | Wardrobe › Hats. | The tile label is clipped to one line. |
| D27 | Low | At the largest text size, the hint counter overlaps the "Check" button and wraps to "×" over "7". | Largest text, open a puzzle. | The hint bar row doesn't wrap. |
| D30 | Low | Deep links stack screens. Repeating a link pushes a duplicate, a link to a screen already lower in the stack does nothing, and Back steps through every linked screen instead of going Home. | Open `lettercrack://stats` twice, then `lettercrack://wardrobe` after `…/library`. | Links push without deduplication. |
| D12 | Cosmetic | On scrolled screens, content shows through the transparent status bar (time and icons over text). | Scroll Home or Solved. | There's no status-bar backdrop. |
| D22 | Cosmetic | Archive puzzles show a raw ISO date in the title: "Daily quote · 2027-01-18". | Archive › any day. | The date isn't formatted. |
| D19 | Low, seen once | Two identical reminder notifications were posted at the same time after the clock jumped past 09:00. | Seen on 12 Jan; one per day after that (alarms checked, one per day). | Probably a catch-up race when several syncs schedule the same alarm. Recheck on a release build. |
| D10 | Low, reproduced (from v1) | Dev build: after Android recreates the screen (font-size change), LogBox shows "The imperative router is unavailable before the first render has finished" (3 errors) and W1 "Looks like you have configured linking in multiple places". | Change the Android font size while the app is open. | The root layout navigates before it mounts on recreation. Recheck on a release build; a real error there would be a crash risk. |
| D8 | Low, **open** (from v1) | Cells about 24 dp and keys about 38 dp are under the 44 pt rule. | Unchanged from v1. | Design decision still pending. |

A suspected widget defect was withdrawn: the widget does update after a solve, and the first check was simply too quick.

## Test-case corrections (the app is right; TEST_CASES.md needs updating)

- **2.1:** with D13 fixed, Check should be disabled until the player types. As written, "Check (disabled)" is the right expectation.
- **3.17:** with the seed, both long quotes were already solved, so level 10 picked the first unseen quote (34 letters). Add "if still unsolved; otherwise any unseen quote".
- **3.21:** once every level quote is used, the picker repeats the oldest one, as hard rule 6 intends ("no repeats until the pool is exhausted"). "You've decoded every quote" only appears when no eligible quote is left.
- **10.2 and 10.7:** Glasses have no "None" tile on purpose (`app/wardrobe.tsx:84`), because Inky always wears glasses. Use Reading glasses instead.
- **13.5 and 13.6 (TalkBack):** checked through the accessibility tree; spoken output wasn't heard. Labels are correct for cells, keys, Delete, the ring, Report, goals, rank, badges, wardrobe items, author tiles, archive days and stamps.

## How this run was done (and limits)

- **Screen reading needs Reduce Motion.** The new looping animations (Inky's idle bob, the floating hero letters, the pulsing level node) keep the device from ever going idle. That makes `uiautomator dump` fail with "could not get idle state", and Maestro's driver timed out too (`maestro hierarchy` took 2 min and died).
  - This affects the Maestro flows in `e2e/`. Either run them with animations off, or stop the loops in E2E builds.
  - Most journeys were therefore run with Android "Remove animations" on.
- **Animation steps.**
  - Checked with animations on: the Continue shimmer, confetti and rays.
  - Not checked: the word hop (2.6). With animations on, the debug build typed several seconds late, and the screen recording missed the hop.
- **Solving.** Puzzles were solved with a helper that reads the cells and the seed answer key, or with the "e2e solve" button where the step allowed it. The helper once tapped a cell scrolled under the hint bar, which pressed Check. That was a tool error, and that clean-solve step was redone on the next level.
- **Clock jumps.** These move the "highest date seen" forward. After the 23 Feb jump in 6.14, later February solves counted as a rewound clock (no streak credit). This is expected, and it explains why 11.5's streak line couldn't be checked.
- **Not runnable here:**
  - 14.6: the image has no Play Store, so no review prompt.
  - 14.7: MMKV keeps the backup in the same file, so it can't be corrupted alone.
  - 12.13 mail body: Gmail isn't signed in.

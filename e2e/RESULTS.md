# E2E run results (suite v2)

## Real-phone install (10 Nov 2026)

First install on a real Android phone (ARM release build, real date 9–10 Nov 2026, no clock change).

| Defect | Severity | What happened | Fix |
|---|---|---|---|
| D32 | High | Daily opened before midnight, solved after it: the Solved screen said "This puzzle isn't available." The solve *was* saved, but nothing showed it: before the launch date only today's daily was valid, the archive started at the launch date (so it was empty), and every day before launch used the same quote, so Home offered the just-solved quote again as "today's". | A daily the player has started or solved can always be reopened or shown (`refForPlayer` in `src/game/session.ts`). With D33 fixed, yesterday's daily is a normal archive day. Unit tests. |
| D33 | High | The app assumed release on 1 Jan 2027 (`LAUNCH_DATE`, a placeholder set in code on 22 Oct and "frozen" on 5 Nov; never decided by the owner). Releasing on any other day breaks dailies: before it, one quote every day and no archive; after it, the archive would start before the app existed. | No release date in the app. `DAILY_EPOCH` (Fri 30 Oct 2026, in the past) only fixes which quote falls on which date; each player's archive, stamp book and daily badges start on their install day (`dailyStart` in `src/game/archive.ts`). The quote file is unchanged: the epoch is 9 weeks before the old date, so Sunday specials stay on Sundays. Pre-v5 saves still map their old solves with the old date. Unit tests. |

**Why testing missed it.** Every E2E run set the emulator clock to dates in January 2027 (the journeys' "clock" column), all after the hard-coded launch date. So 14.5 (midnight during a puzzle) passed, and the period a real phone is in today, before 1 Jan 2027, was never exercised. The unit tests also took the launch date as given: they checked future dates were refused, but nothing checked that the date itself was right, or a release on another day. The launch date was a code assumption that nobody confirmed. New steps 14.12 (real date) and 14.13 (install on any day) cover it; 14.5 is red until it is retested on a device.

| D34 | Medium | Stats didn't add up after D32: streak 0, best 0 and no dot on the week strip, yet 46 letters and the First crack badge. The daily, opened before midnight and finished just after, was filed as a late archive solve, which counts for letters and badges but never for the streak. | A daily started on its own date and finished after midnight now counts for that date, streak included, as long as today's daily isn't solved yet (`recordDailySolve`, `startedOn` in `usePuzzleGame`). A rewound clock at open still gets no credit; a daily opened from the archive is still a late solve. Unit tests. Saves made before the fix keep their late solve (no streak). |
| D35 | Low | Two side effects of D33: the medal for a full month could never be earned in the install month (days before install can't be played), and a deep link to a date before install opened a daily that isn't in the archive (solving it moved the archive start). | Install month: only the days from the install day count toward the medal ("N of 22 stamps"). Dailies before the install day don't open ("This puzzle isn't available"), unless already started or solved. Unit tests. |

**Scenario review.** 30 scenarios (15 missed by earlier runs, 15 impacted by D32–D35) are in TEST_CASES.md: the scenario tracker, J15, J16, and 14 rewritten steps marked ⟳.

Unit tests: 873 pass; typecheck, lint, quote pipeline tests (29) and `quotes:validate` clean.


## Remaining-items round (9 Nov 2026)

Release build: `EXPO_PUBLIC_E2E=1 npm run android:local -- release` (x86_64, signed with the debug key), installed over the debug build on the Pixel 7 emulator and on the Pixel Tablet emulator. 14.7 and U.7 ran on the debug build first. Unit tests: 859 pass; typecheck and lint are clean.

Done in this round:
- **E2E builds keep endless animations still** (`src/ui/fx/loops.ts`), so Maestro and uiautomator can read the screen. Unit-tested.
- **14.7 fix:** the save is also kept in a separate MMKV file (`lettercrack.backup`, key `root.lastGood`) and updated on every save, so a damaged or missing main file comes back with the latest progress (before, only the copy from the last upgrade existed). 7 unit tests.
- **D8:** accepted as an exception (cells and keys ≥ 44 pt tall, width set by the line); 13.9 updated.
- **Local builds:** `android:local` turns off the Sentry upload (the release build failed on it) and takes `LC_NO_INSTALL=1`.
- **Jest in a worktree:** the `/.claude/` ignore pattern matched every path when the checkout itself is under `.claude/worktrees/`, so `npm test` found no tests. It is now `<rootDir>/.claude/`.
- **14.6:** parked by request.

| Item | Build | Result |
|---|---|---|
| 14.7 Data recovery | Debug | **Pass.** Solved Level 10 first, so the latest save differed from any older copy (18 solved, Level 11, 976 letters, goals 34/150 and 1/2). Main file overwritten with 64 KB of junk: Home showed "We restored your saved progress from a backup." and every value above. Main file deleted: same result, plus 12 of 18 authors, 6 outfit items and 5 hints. The debug build also shows a "[lettercrack] Error: Main save missing…" toast (console.error in a dev build). |
| U.7 Streak freeze credit | Debug | **Pass.** v2 save with streak 8 / best 8 (`e2e/state/u7-streak8/`) migrated on launch: Stats shows "1 saved streak freeze", "One week" earned. Current streak reads 0, which is right: that hand-edited save last solved on 16 Jan and the clock was 15 Feb. |
| Maestro flows | Release | **Pass (2/2) after a flow fix.** Both failed at first because the goals, rank, awards and wardrobe cards now push `home-level`, `home-archive` and `solved-share` below the fold, and `tapOn` doesn’t scroll. The flows now `scrollUntilVisible` first. |
| 2.6 Word hop | Release | **Pass.** Recorded at 30 fps with the emulator’s host recorder (`adb emu screenrecord`; the in-device `screenrecord` gave 0.8 fps). Erasing L and typing it again: KNOWLEDGED, UNIVERSALLY and SINGLE lift and grow, then settle; the line above doesn’t move. The first tries showed no hop because the emulator had Android animations off (all scales 0 = Reduce Motion), which correctly suppresses it. |
| D10 | Release | **Was a crash; fixed.** See below. |
| Maestro flows (after the D31 fix) | Release, phone | **Pass (2/2), twice in a row,** after a flow fix: flow 01 pressed Back while Android's share sheet was still opening, so the sheet stayed up and "Home" was never found. It now waits for the sheet ("Sharing…") and presses Back again if the sheet is still there. Home on the phone looks unchanged. |
| D31 | Release, tablet | **Reproduced, then fixed.** Before the fix: after rotating, the tag read "TODAY’S" and Inky’s bubble ended "Let’s crack". After the fix (release build, Pixel Tablet): "TODAY’S QUOTE" and "…Let’s crack it!" in full on one line after 1, 2, 4, 5, 8, 9 and 12 rotations, both orientations. |

### D10: release-build crash after a font size change (fixed)

- **What happened:** with the app open, change Android’s font size (or anything else that makes Android recreate the activity), then tap any navigation button, e.g. "Continue level". The release build crashed: `FATAL EXCEPTION … JavascriptException: The imperative router is unavailable before the first render has finished`, thrown from an `onPress`. The crash came 36 s after the recreation, so it was not a startup race: navigation stayed broken until the app restarted.
- **Cause (expo-router 58.0.25):** `ImperativeRoutingQueueBridge` binds the global `router` when a navigation root mounts and resets it to a stub that throws when a root unmounts. On recreation the new root mounts first, then the old root unmounts and unbinds the router the new root had just bound.
- **Fix:** `patches/expo-router+58.0.25.patch` (applied by `patch-package` on `postinstall`, so EAS builds get it too): a bridge only unbinds if the router is still bound to it. `src/lib/__tests__/routerRebind.test.tsx` mounts a second bridge, unmounts the first and checks `router.push` still works; it fails without the patch. **When upgrading expo-router, check whether upstream fixed this and drop or redo the patch.**
- **Retest on the release build:** four font size changes (1.3, 1.0, 1.15, 1.0) with the app open; Android recreated the screen each time (4 × `Running "main"`). After each one, Continue level and Settings opened, the process never restarted, and the log had no crash.

### Still open

- **14.6** parked; **12.13** needs a signed-in mail app.
- Local emulator files (not committed): `e2e/state/phone-feb18/` (phone save before 14.7) and `e2e/state/u7-streak8/` (v2 save, 8-day streak).

### Notes for the next run

- This laptop came back on a temporary Windows profile (`C:\Users\TEMP`). The SDK, AVDs, Gradle cache, Python and git identity are under `C:\Users\Dell`, so set `ANDROID_HOME`, `ANDROID_AVD_HOME`, `GRADLE_USER_HOME`, `LOCALAPPDATA` (for `e2e/state/lib.sh`) to the Dell paths, or sign in to the normal profile.
- After a JS-only change, `cd android && gradlew assembleRelease -PreactNativeArchitectures=x86_64` rebuilds the release APK in about 4 minutes; `android:local` regenerates `android/` and takes about 40.
- The Pixel Tablet’s natural orientation is landscape; `wm user-rotation` didn’t rotate it. `adb emu rotate` with auto-rotate on does.

## Fix round and retest (9 Nov 2026)

All defects from the v2 run were worked on, then retested on the phone emulator (and the tablet for D31) with the new code. Only JavaScript changed, so the existing dev build was reused, with Metro serving the new code. Unit tests: 849 pass; typecheck and lint are clean.

### Defect status

| # | Sev. | Status | Fix | Retest on emulator |
|---|---|---|---|---|
| D13 | Medium | **Fixed** | Check counts only letters the player typed (`hasPlayerEntries`); givens and reveals don't. | Pass: Check is disabled with only givens; tapping it costs nothing; typing enables it. |
| D17 | Medium | **Fixed** | Next is guarded by a ref, and each puzzle key can be in the stack once (`dangerouslySingular`). | Pass: a double tap opened one puzzle; one Back went Home. |
| D26 | Medium | **Fixed** | New `FitText`: text scales with the size settings but never breaks inside a word. Home tile titles share one size. | Pass at the largest text: "Inky's wardrobe" whole, no clipped lines. |
| D28 | Medium | **Fixed** | Author circles grow with the text size, and the initials are sized to the circle. | Pass at the largest text. |
| D29 | Medium | **Fixed** | Badge columns widen with the text size; names use `FitText` with one shared size. | Pass at the largest text on Stats; also used on the Solved awards card. |
| D31 | Medium | **Fixed** (remaining-items round) | `src/ui/relayout.ts`, `src/ui/primitives/Text.tsx`: text is measured again once the window size settles. See below. | Verified on the release build on the tablet, 1–12 rotations. |
| D14 | Low | **Fixed** | Closing the sheet without restarting forgets the pick. | Pass for Cancel and for tapping outside; Restart still works. |
| D11 | Low | **Fixed** | `useNow` re-renders on foreground and every hour. Home reads the date from it, because the React Compiler memoises a bare `today()`. | Pass: afternoon → evening → next morning, date and daily card updated. |
| D18 | Low | **Fixed** | Same mechanism in the puzzle hook. | Pass: "No hints left" → "5 hints left" after midnight without reopening. |
| D21 | Low | **Fixed** | A daily solved on a wound-back clock is recorded (see D20), so Home shows it solved. Goal "Solve today's quote" also counts it. | Pass: "See today's quote", goal done, no streak credit. |
| D20 | Low | **Fixed** | Schema v5: archive days solved later are recorded in `progress.lateDailies`. The old guess (by the quote's last solve date) runs once after the migration, its days are kept, then it is switched off. Migration v4 → v5 has a fixture and tests. Cloud merge = union. | Pass on a fresh install: solving 13 Feb left 3 and 23 Feb (same quote) open; 1 stamp. |
| D23 | Low | **Fixed** | Archive solves pass `from: 'archive'` to Solved. | Pass: "Back to archive" returns to the archive with the day solved. |
| D24 | Low | **Fixed** | Stats fixes its "New" set when it opens and marks them seen at once; the marks stay for that visit. | Pass with the U0 save: marks shown at open and still after 10 s; gone on the next visit. |
| D16 | Low | **Fixed** | "New author" is decided at solve time (author not collected before), so a replay never shows it. | Unit test (a replay needs the pool exhausted). |
| D15 | Low | **Fixed** | The Solved card lists only outfits unlocked by this solve; older unseen ones keep their "New" mark in the wardrobe. | Pass: no outfit note on a solve that unlocked none. |
| D25 | Low | **Fixed** | Wardrobe labels use `FitText` (no one-line clip). | Pass: "Top hat" in full at normal and largest text. |
| D27 | Low | **Fixed** | The ×N counter never shrinks; it wraps to its own line. | Pass at the largest text. |
| D30 | Low | **Fixed** | Each screen exists once in the stack (`dangerouslySingular`). | Pass: `stats` twice + one Back = Home; a link to an open screen brings it forward. Back still steps through the distinct screens opened, as any stack does. |
| D12 | Cosmetic | **Fixed** | A backdrop fills the status-bar area once a page scrolls (Screen and Solved). | Pass on Home, Stats and Solved. |
| D22 | Cosmetic | **Fixed** | Archive title shows "February 3, 2027". | Pass. |
| D19 | Low | **Fixed (likely cause)** | Reminder scheduling runs one call at a time, and each day's reminder has a fixed ID, so a repeat replaces it. | Pass: 7 alarms after 3 quick foregrounds, one per day; exactly 1 notification at 09:00. The original was seen once, so this can't prove the race is gone. |
| D10 | **High** | **Fixed (remaining-items round)** | expo-router patch, see above. | On the release build this was a crash, not a warning. Fixed and retested on the release build. |
| D8 | Low | **Open (design)** | Not changed. | Cells are 44+ tall and keys 52 tall, but their width is set by fitting about 15 cells and 10 keys across a phone, and they touch, so the hit area can't grow sideways. Needs a design decision. |

New issues found while retesting, all fixed and retested:
- The D20 fix at first still applied the old rule to solves made on the migration day. Fixed by settling the old rule once on launch (`settleLegacyDailies`).
- The goal "Solve today's quote" didn't count a solve on a wound-back clock (part of D21).
- Wardrobe lock notes broke "Cryptograph / er" at the largest text. They now use `FitText`.

### D31 (tablet text cut off): what was found

- It happens **only after rotating** the tablet. A fresh launch shows "TODAY'S QUOTE" and "…Let's crack it!" in full, in portrait and in landscape.
- React Native measures the same bounds before and after the rotation. Android then draws the glyphs about 1.5% wider, so the text wraps inside a box sized for one line, and the second line is hidden.
- Cause: React Native's text measure cache (`TextMeasureCache`, keyed on the text and its style) keeps returning the width measured before the rotation. A fresh process has an empty cache, which is why a fresh launch is fine.
- What didn't work: remounting the text (same cache key); applying the OS text size in JS with `allowFontScaling={false}`; a new `maxFontSizeMultiplier` alone (cache misses, but the label wraps onto two lines at the old width); a font-size nudge that alternates back to 0 (the original size picks up the stale width again).
- Fix: 500 ms after the window size stops changing, `Text` gets a `maxFontSizeMultiplier` it has never had (1000+, never caps a real text size) and a font size 0.006–0.06 pt larger that changes every time and never returns to the original. Both are invisible. Unit tests in `src/ui/__tests__/relayout.test.tsx`.
- Freeing disk space for the rebuilds: E: was full, so 4.2 GB of debug-variant build output under this worktree's `node_modules/*/android/build` was deleted. The next debug build regenerates it and takes longer.

### Steps that weren't run last time

| Step | Result |
|---|---|
| 7.6 Sunday regular | **Pass**: the 4th Sunday solved from the archive earned "Sunday regular". |
| 7.7 Archive count | **Pass**: "13 to play" → "11 to play" after two archive solves; streak unchanged. |
| 11.5 Widget after midnight | **Pass**: the next day's cipher, "Tap to crack today's quote", and "1-day streak" still shown (bridgeable). The launcher needed a restart to redraw, which the step allows. |
| U0 again (v2 save → v5) | **Pass**: loads, badges awarded, archive days kept. |
| 2.6 Word hop | **Not verifiable** on the debug build. Passed later on the release build (remaining-items round). |
| 12.13, 14.6, 14.7 | 12.13 and 14.6 still can't run here (no signed-in mail, no Play Store). 14.7 passed later (remaining-items round). |

Test-case corrections from the v2 run (2.1, 3.17, 3.21, 10.2, 10.7, 13.5, 13.6) are now applied in `TEST_CASES.md`.

**How the retest ran:** Metro must run **without** `CI=1`; in CI mode Expo turns off file watching, so the phone keeps getting the code from when Metro started. Clearing app data also removes the home-screen widget, and force-stopping the app greys it out on Android 15.

---

## v2 run (8 Nov 2026)

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

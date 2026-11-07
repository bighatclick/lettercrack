# E2E run results

Run on 7 Nov 2026 against the branch with `origin/main` merged in (latest code, commit 3164f27, plus the D1 fix). Local debug build via `npm run android:local`. Pixel 7 emulator (Android 15) for J1–J10, Pixel Tablet emulator for the tablet check. Dev seed quotes. The emulator clock was moved between 10 Jan and 15 Feb 2027 as the journeys require. Testing paused once at J8 step 8.3 and resumed the same day. **All ten journeys have now been run.**

## Summary

| Journey | Result | Notes |
|---|---|---|
| J1 Install, onboarding, Home | Pass | 1.1–1.8 all as expected. |
| J2 Daily puzzle | Pass | 2.1–2.18 all as expected; the share sheet shows the image card. |
| J3 Levels | Pass after fix | 3.14 failed (D1), now fixed and rechecked. All other steps pass. |
| J4 Hints | Pass | 4.1–4.5 all as expected; hints refill on the next day. |
| J5 Streak and dates | Pass | Streak 2, freeze, reset and the rewound clock are all correct. The relaunch crash (D4) did not come back in four more tries. |
| J6 Archive | Pass | Grid, started ring, archive solve with no streak change, "Back to archive". |
| J7 Stats | Pass | 7.5: "Solved in" badge and the average row appear only with the timer on. |
| J8 Settings | Pass | Every toggle works and survives a relaunch. Reminder off clears the scheduled alarms; on schedules them again. Feedback opens Gmail; Privacy and Terms open lettercrack.app in Chrome (the pages are blank because the site is not hosted yet). |
| J9 Accessibility and tablet | **Fail** | D2 (Reduce Motion hides Home tiles), D5 (word split at the largest font), D6 (portrait lock on tablets), D7 (text clipped on tablet), D8 (small touch targets). Hardware keyboard, dark mode, high contrast, text size 4 and Reduce Motion on the Solved screen pass. |
| J10 Resilience | Pass, with gaps | Background, rotation, notification shade, rapid typing, all deep links and reinstall pass. 10.4 and 10.5 could not be run on this setup (see below). |

## Defects

| # | Severity | What happens | How to reproduce | Likely cause |
|---|---|---|---|---|
| D1 | High, **fixed** | A reported quote came back as the next level. | Level 6 → ⋯ → "Report and hide", solve the next quote, tap Next: the reported quote is back. | The puzzle screen's timer tick re-saved the reported level, and "Continue level" did not skip reported quotes. Fixed in `src/game/session.ts` with two unit tests; rechecked on the emulator, including after a force-stop. |
| D2 | **High** | With Android's "Remove animations" (Reduce Motion) on, Home's Archive and Stats tiles never appear, so those players cannot reach the Archive or Stats. Once, the whole Home body (Today card, Levels and tiles) was missing after returning from Settings, with a level-path node drawn next to the gear. | Turn on Remove animations, launch the app, scroll Home: empty space below Levels. Reproduced 2 of 2 in a controlled run; not seen with animations on (0 of 2). | Home content is wrapped in `Enter` (Reanimated `entering` with a delay and spring). Under reduced motion the entering animation can leave views at their start state. |
| D3 | Medium, same as D2 | Home buttons seemed not to respond. | Happened while D2 was showing. | Most likely the invisible or misplaced views from D2. Merged into D2. |
| D4 | Low, not reproduced | Crash on relaunch: `App react context shouldn't be created before`. | Seen once; four more relaunches after clock jumps were clean. | Probably the dev-client launcher racing a restart. Recheck on a release build. |
| D5 | Medium | At Android's largest font size, Home's greeting splits a word: "Good morning, co / debreaker!". | Settings › Display › Font size at maximum, open Home. | The hero title column is narrower than the word "codebreaker" at that size. |
| D6 | Medium | On tablets the app is locked to portrait and fills only the middle third of a landscape screen, with black bars on both sides. | Run on a Pixel Tablet emulator. | `app.json` has `"orientation": "portrait"`. The spec (R18) promises iPad support. |
| D7 | Medium | On the tablet, Home cuts off the second line of two texts: the tag reads "TODAY'S" instead of "TODAY'S QUOTE", and Inky's bubble ends at "Let's crack" without "it!". | Pixel Tablet emulator, Home. | Fixed-height containers with text that wraps on this screen density. |
| D8 | Low | Puzzle cells are about 24 pt wide and keyboard keys about 33 pt wide, under the 44 pt rule in CLAUDE.md. | Measured on the Pixel 7 at text size 1. | Cells and keys sit edge to edge, so this is a layout trade-off rather than a simple fix. The difficulty chip and header buttons pass. |
| D9 | Cosmetic | At app text size 4 the "29%" label touches the edges of the progress ring. | Settings › Text size › Size 4, open a puzzle. | The ring's label scales with text size but the ring does not. |

## Not run or not verifiable here

- **10.4 review prompt:** the emulator image has no Play Store, so the in-app review dialog can never show.
- **10.5 data recovery:** MMKV keeps the main blob and its backup in one file, so one cannot be corrupted alone over adb. Covered by unit tests in `src/data/__tests__/repo.test.ts`.
- **Spoken TalkBack output:** checked through the accessibility tree instead (cell, key, Delete, progress ring and Report labels are all correct). Spoken announcements such as "Solved!" were not heard.

## Not app defects

- The round grey gear "Tools" bubble belongs to the Expo dev client and appears in debug builds only.
- The UI dumper used by the test driver cannot read a screen while something animates every second, such as the puzzle timer or the Solved screen celebration. Several retries in the log come from this, not from the app.
- The About page names Bartlett's 9th edition (1891). That matches the quote pipeline; `specs.md` §4.1 still says 10th edition (1919) and should be updated.

## Saved state

| What | Where |
|---|---|
| Snapshot at the pause (J8.3, 16 Jan 2027) | AVD `SalesTrackerApi35`, snapshot `lettercrack-e2e-paused-J8` |
| Snapshot after J10 (before the reinstall test, 16 Jan 2027) | AVD `SalesTrackerApi35`, snapshot `lettercrack-e2e-after-J10` |
| App data at the pause | `e2e/state/lc-mmkv.tar`, not committed |

The emulator itself was left on a fresh install (the reinstall test), with the clock on 16 Jan 2027 and automatic time off.

To load a snapshot and start Metro:

```bash
emulator -avd SalesTrackerApi35 -snapshot lettercrack-e2e-after-J10
```

```bash
npx expo start --dev-client --port 8081
```

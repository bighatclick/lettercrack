# E2E run results (paused)

Run on 7 Nov 2026 against the branch with `origin/main` merged in (latest code, commit 3164f27 plus the test-case docs). Local debug build via `npm run android:local`, Pixel 7 emulator, Android 15, dev seed quotes. Emulator clock moved between 10 Jan and 15 Feb 2027 as the journeys require. Testing was **paused at J8 step 8.3** at the user's request.

## Summary

| Journey | Result | Notes |
|---|---|---|
| J1 Install, onboarding, Home | Pass | 1.1–1.8 all as expected. |
| J2 Daily puzzle | Pass | 2.1–2.18 all as expected, share sheet shows the image card. |
| J3 Levels | Pass after fix | 3.14 failed (D1), now fixed and rechecked on the emulator. All other steps pass. |
| J4 Hints | Pass | 4.1–4.5 all as expected; refill at the next day works. |
| J5 Streak and dates | Pass, one crash to triage | Streak 2, freeze, reset, rewound clock all correct. One crash on relaunch after the 30-day jump (see below). |
| J6 Archive | Pass | Grid, started ring, archive solve with no streak change, "Back to archive". |
| J7 Stats | Pass for 7.1–7.4 | 7.5 (timer on) not finished. |
| J8 Settings | Partial | 8.1 and 8.2 pass. Paused at 8.3. |
| J9 Accessibility | Not run | |
| J10 Resilience | Not run | |

## Defects found

| # | Severity | What happens | Steps | Likely cause |
|---|---|---|---|---|
| D1 | High, **fixed** | A reported quote reappeared in the level path. Reproduced twice. Fixed in `src/game/session.ts` with two unit tests; rechecked on the emulator, including after a force-stop. | Level 6 → ⋯ → "Report and hide" (Oscar Wilde, #90019). The app moves to another quote. Solve it, tap Next: Level 7 is #90019 again. Reporting it again on Level 7 and reopening still shows #90019. | `reportQuote` deletes the level save, but the puzzle screen is still mounted and its 1-second elapsed-time tick calls `saveProgress`, which writes the save back. `nextLevelRef` resumes any open level save without checking `reportedQuoteIds`. |
| D2 | Medium | Home's Archive and Stats tiles are sometimes blank (empty space below the Levels card). | Seen twice with system animations off (Reduce Motion). Not seen with animations on. Intermittent. | The tiles sit inside `Enter`, a Reanimated `entering` animation; with reduced motion the entering animation can leave the view at its start state. |
| D3 | Medium, unconfirmed | Every button on Home stopped responding (gear, Continue level, tiles), even after a force-stop and relaunch. | Happened after changing settings with system animations off. Worked again once animations were turned back on. | Possibly the same root cause as D2. Needs a repro outside the test driver. |
| D4 | To triage | Crash on relaunch: `IllegalArgumentException: App react context shouldn't be created before`. | Clock jumped forward 30 days, app relaunched through the dev-client deep link while the previous instance was still alive. | Probably the dev-client launcher, not app code. Recheck on a release build. |

## Not app defects

- The round gear "Tools" bubble is the Expo dev client's, not the app's. It overlaps the app's top-right buttons in debug builds only.
- Deep link `lettercrack://settings` is ignored when the app is already running (the dev client swallows it). Use the gear instead.

## Device state at pause

Saved at 10:02 on the emulator clock, **Saturday 16 Jan 2027** (IST), automatic time off. In-app settings left as: auto-fill **off**, show solve time **on**, daily reminder **on**, default difficulty Hard. Progress: Level 8 open, 1-day streak (best 3), 13 quotes solved, quotes #90019 and #90024 reported. The snapshot was taken before the D1 fix was checked, so it still has only #90019 reported.

Saved copies:

| What | Where |
|---|---|
| Full emulator snapshot (app data, settings, clock) | AVD `SalesTrackerApi35`, snapshot `lettercrack-e2e-paused-J8` |
| App data only (MMKV folder) | `e2e/state/lc-mmkv.tar` in this worktree, not committed |
| Device date at pause | `e2e/state/device-date.txt`, not committed |

To resume, boot the snapshot, start Metro, then turn auto-fill back on and continue at 8.3:

```bash
emulator -avd SalesTrackerApi35 -snapshot lettercrack-e2e-paused-J8
```

```bash
npx expo start --dev-client --port 8081
```

If the snapshot is lost, restore the app data instead (needs `adb root`), then set the clock back to 16 Jan 2027:

```bash
adb push e2e/state/lc-mmkv.tar /sdcard/ && adb shell "am force-stop app.lettercrack && cd /data/data/app.lettercrack/files && rm -rf mmkv && tar xf /sdcard/lc-mmkv.tar"
```

# LetterCrack: iOS end-to-end test cases (GitHub Actions)

The iOS version of `e2e/TEST_CASES.md` (the Android plan, 211 steps). Every step there is listed here
with the iOS flow that runs it, or the reason it can't run on a simulator in CI. The flows are Maestro
files in `e2e/ios/flows/`; `.github/workflows/ios.yml` runs them on every pull request and every push
to `main`.

## How it runs

| Item | Value |
|---|---|
| **Build** | One Release simulator build per run, with `EXPO_PUBLIC_E2E=1` (the E2E hooks below). No signing. |
| **Devices** | `full` suite on the newest iPhone Pro; `tablet` on an iPad; `small` on the smallest iPhone the runtime has (SE, mini or "e"). |
| **Isolation** | Every flow starts from its own fresh install (`common/start.yaml`), so one failure never breaks the next flow. |
| **Runner** | `e2e/ios/run.sh` runs the flows one by one and does what Maestro can't: Dynamic Type size, dark mode, Reduce Motion, reinstalling the app, measuring touch targets. |
| **Results** | Per-flow JUnit, screenshots, Maestro debug output and the screen hierarchy are uploaded as artifacts. A summary table goes on the run page. |
| **Content** | The 30-quote dev seed. The dates and facts the flows rely on are pinned by `src/e2e/__tests__/iosFlowFacts.test.ts`, so a content change fails a unit test first. |
| **Switches** | Ads and payments off. Free hints: 5 a day. Every flow that could show a sale checks there is none (`common/no-sales.yaml`). |

### The E2E hooks (E2E builds only)

The iOS simulator uses the Mac's clock, so it can't be moved like the emulator's (`adb shell date`).
E2E builds add a test clock and set-up links. Release builds don't have them: each use is behind an
inline `process.env.EXPO_PUBLIC_E2E === '1'` check, which is false at build time.

| Hook | What it does |
|---|---|
| `lettercrack://e2e?at=2027-01-10T10:00:00` | Moves "now" to that device-local time. The clock keeps ticking, so waiting past midnight works. Saved, so it survives restarts. |
| `…?fresh=1` | Wipes the save and its backup: the next launch is a fresh install (on the test date). |
| `…?seed=v1…v5` | Writes an old-schema save (the migration fixtures): an app update. |
| `…?corrupt=main`, `…?lose=main` | Damages or deletes the main save, keeping the backup file. |
| `…?real=1`, `…?cloud=on/off` | Back to the real clock; iCloud sync (off by default in E2E builds, so one flow's progress can't leak into the next). |
| Puzzle buttons `e2e solve`, `e2e wrong`, `e2e right`, `e2e almost` | Type the answer, one wrong letter, one right letter, or a full board with one wrong letter, through the same reducer as a key tap. |

**Changing the clock.** The Android runs set the clock, then brought the app to the foreground. The
iOS flows set the clock and restart the app (`common/clock.yaml`). Two flows instead stay open across
midnight (14b, 15b) to cover the no-restart path.

## Status key

- ✅ **Automated:** runs in CI and asserts the expected result.
- 🟡 **Partly automated:** what a simulator can show is asserted; the rest is a screenshot for review, or listed as a manual check.
- 🧑 **Manual:** needs a real device, an Apple ID or a person's eyes. Done on TestFlight before release.
- ➖ **Not on iOS:** Android-only behaviour.

## Coverage summary

| Journey | Steps | ✅ | 🟡 | 🧑 | ➖ | Flows |
|---|---:|---:|---:|---:|---:|---|
| U0 Upgrade an old save | 7 | 7 | 0 | 0 | 0 | 00, 00b |
| J1 Fresh install, onboarding, Home | 12 | 11 | 1 | 0 | 0 | 01, 01b, 13c |
| J2 Daily puzzle and Solved | 24 | 22 | 2 | 0 | 0 | 02, 02b |
| J3 Levels, difficulty, chapters, rank, report | 24 | 24 | 0 | 0 | 0 | 03, 03b, 03c |
| J4 Goals and the +1 hint | 9 | 9 | 0 | 0 | 0 | 03b, 04, 07 |
| J5 Hints and the midnight refill | 6 | 6 | 0 | 0 | 0 | 05 |
| J6 Streak, milestones, freezes, reminder | 16 | 14 | 0 | 2 | 0 | 06, 06b, 06c |
| J7 Archive and stamp book | 11 | 11 | 0 | 0 | 0 | 07, 07b |
| J8 Stats and badges | 10 | 10 | 0 | 0 | 0 | 08, 06 |
| J9 Library and author facts | 9 | 9 | 0 | 0 | 0 | 09 |
| J10 Wardrobe and time-of-day badges | 13 | 12 | 1 | 0 | 0 | 10, 10b |
| J11 Home-screen widget | 9 | 0 | 0 | 0 | 9 | (Android only; no iOS widget yet) |
| J12 Settings, About, notifications | 15 | 12 | 3 | 0 | 0 | 12, 12b, 06b, 06c |
| J13 Accessibility, text size, motion, tablet | 12 | 7 | 4 | 1 | 0 | 13, 13b–13g |
| J14 Resilience, links, recovery, reinstall | 13 | 11 | 2 | 0 | 0 | 14, 14b–14g, 16b |
| J15 Real-world scenarios | 13 | 7 | 3 | 1 | 2 | 15, 15b–15e, 17, 14 |
| J16 Retests for the date fixes | 8 | 7 | 0 | 0 | 1 | 16, 06, 07b, 00, 14b |
| **Total** | **211** | **179** | **16** | **4** | **12** | 45 flow files |

The four manual steps are 6.15 and 6.16 (reminder delivery), 13.11 (hardware keyboard) and 15.3
(real phones). Parts of partly automated steps are manual too, such as 15.4's two-device iCloud
sync. The reasons are in the tables below.

---

## U0: Upgrade an old save (v2 → current)

| # | Android step | iOS | Flow |
|---|---|---|---|
| U.1 | Note the old build's progress | ✅ The v2 fixture is the "old build": streak 37, best 61, 63 hints, level 43, a daily in progress, non-default settings | 00 |
| U.2 | Install over it, launch | ✅ Home, no onboarding, no recovery note | 00 |
| U.3 | Progress unchanged | ✅ Streak, in-progress daily, level 43, Expert default, hints ≥ 63, timer on | 00 |
| U.4 | New Home cards | ✅ Goals, Rank, Library and Wardrobe tiles | 00 |
| U.5 | Badges from existing progress | ✅ First crack, Daily decoder, Warming up, One week, One month earned on first launch | 00 |
| U.6 | Wardrobe after migration | ✅ Monocle still worn | 00 |
| U.7 | Saved freezes for old milestones | ✅ "N saved streak freezes" | 00 |
| (extra) | Every schema ever shipped | ✅ v1, v3, v4 and v5 saves open on Home and play | 00b |

## J1: Fresh install, onboarding, Home

| # | Step | iOS | Flow |
|---|---|---|---|
| 1.1 | Onboarding screen, no prompt or ad | ✅ | 01 |
| 1.2 | Solve A CAT | ✅ | 01 |
| 1.3 | Difficulty picker | ✅ | 01 |
| 1.4 | Hard → Home hero | ✅ Date, greeting, bubble, no streak | 01 |
| 1.5 | Today card | ✅ Today's quote, Sunday special, Hard, 47 letters, preview, text, Crack it | 01 |
| 1.6 | Goals card | ✅ Three rows at 0 and the reward caption | 01 |
| 1.7 | Rank card | ✅ Rookie, 0 letters, 500 to Apprentice | 01 |
| 1.8 | Levels card | ✅ Level 1, chapter strip, Continue level 1 | 01 |
| 1.9 | Tiles | ✅ Archive (nothing yet on install day), Stats 0, Library 0 of 18, Wardrobe 1 item, no "New" | 01 |
| 1.10 | Greeting by time of day | ✅ Morning, afternoon, evening, and the change on the hour without a restart | 01b |
| 1.11 | Kill and relaunch | ✅ Straight to Home | 01b |
| 1.12 | Dark mode | 🟡 iOS dark mode set by the runner; screenshots of every screen (colours need eyes) | 13c |

## J2: Daily puzzle and Solved

The calendar moved since the Android plan was written: 10 Jan 2027 is now Thoreau (47 letters), not
Franklin. The iOS expectations use the current calendar.

| # | Step | iOS | Flow |
|---|---|---|---|
| 2.1 | Puzzle screen | ✅ Title, chip, ring, menu, hint bar, "5 hints left", Check disabled | 02 |
| 2.2 | No word split across lines | 🟡 Screenshots (13b at the largest size); layout is unit-tested (`layout.ts`) | 13b |
| 2.3 | Tapping a cell highlights its group | 🟡 Highlight is visual; selection is shown by the next key filling that group | 02 |
| 2.4 | Givens are locked | ✅ | 02 |
| 2.5 | Typing fills every match; Check enables | ✅ | 02 |
| 2.6 | Word hop | ✅ No input dropped or doubled while words hop (the hop itself is an animation) | 14 |
| 2.7 | Conflicts | ✅ | 02 |
| 2.8 | Delete clears a group and its flags | ✅ | 02 |
| 2.9 | Wrong letter + Check | ✅ Flagged, 4 hints left | 02 |
| 2.10 | Right letter clears the flag | ✅ | 02 |
| 2.11 | Reveal | ✅ 3 hints left | 02 |
| 2.12 | Full but wrong | ✅ "Almost!…", 47 of 47, no charge, not solved | 02 |
| 2.13 | Back: Home in progress | ✅ | 02 |
| 2.14 | Continue | ✅ Same hints and state | 02 |
| 2.15 | Solve; back doesn't return | ✅ Back swipe stays on Solved | 02 |
| 2.16 | Solved header and tags | ✅ Not clean (a Check and a Reveal were used) | 02 |
| 2.17 | Awards card | ✅ "New badges!" and "and 1 more"; all four on the shelf | 02 |
| 2.18 | Quote and author card with fact | ✅ | 02 |
| 2.19 | Goals card on Solved | ✅ | 02 |
| 2.20 | Tomorrow's teaser | ✅ "9 words from the 1800s… H." | 02 |
| 2.21 | Buttons; no reminder card; no ad | ✅ | 02 |
| 2.22 | Share result | ✅ The iOS share sheet opens and closes; the text preview is checked when the sheet shows it | 02b |
| 2.23 | Share (image card) | ✅ Sheet opens and closes, or the "Sharing isn't available" alert | 02b |
| 2.24 | Home after; "See today's quote" | ✅ | 02 |

## J3: Levels

| # | Step | iOS | Flow |
|---|---|---|---|
| 3.1 | Level 1 | ✅ | 03 |
| 3.2 | Difficulty sheet | ✅ Restart disabled on the current level | 03 |
| 3.3 | Pick, then Cancel | ✅ | 03 |
| 3.4 | Tap outside closes | ✅ | 03 |
| 3.5 | Expert + Restart | ✅ No givens, letters gone | 03 |
| 3.6 | Easy + Restart | ✅ Givens | 03 |
| 3.7 | Difficulty persists | ✅ | 03 |
| 3.8 | Kill mid-level | ✅ Entries, difficulty and hints kept | 03 |
| 3.9 | Clean level solve | ✅ Tags, Clean solve badge, Starry sky, goal, "Next puzzle", no Share result | 03 |
| 3.10 | Next → Level 2 at the default | ✅ | 03 |
| 3.11 | Home after | ✅ | 03 |
| 3.12 | All goals → +1 hint, Goal getter | ✅ | 03b |
| 3.13 | Report dialog | ✅ | 03b |
| 3.14 | Cancel; Report and hide | ✅ New quote, level moves on | 03b |
| 3.15 | Rank-up to Apprentice, beret | ✅ | 03c |
| 3.16 | Big quote level on Home | ✅ | 03c |
| 3.17 | Level 10 is long | ✅ 60+ letters | 03c |
| 3.18 | Chapter 1 stamped; First chapter | ✅ | 03c |
| 3.19 | Chapter 2 | ✅ | 03c |
| 3.20 | Expert levels 11–20 and their badges | ✅ No givens; Expert cracker, Master of keys, 1,000 letters, Bookworm | 03c |
| 3.21 | Every level used | ✅ Level 21 repeats the oldest quote; no dead end | 03c |
| 3.22 | Double-tap Next | ✅ One navigation | 03 |
| 3.23 | Default back to Hard | ✅ | 03c |
| 3.24 | No ads anywhere | ✅ Checked on Home, Settings, Solved and the hint bar | 00, 02, 03, 03c, 05, 12 |

## J4: Goals

| # | Step | iOS | Flow |
|---|---|---|---|
| 4.1 | No second reward the same day | ✅ | 03b |
| 4.2 | New goals next day | ✅ | 04 |
| 4.3 | 5 free + saved bonus | ✅ 6 hints | 04 |
| 4.4 | "Solve 2 levels 1/2" | ✅ | 04 |
| 4.5 | VoiceOver goal labels | ✅ "…: 1 of 2", "…: done" | 04, 13 |
| 4.6 | Daily ticks its goal | ✅ | 04 |
| 4.7 | Second level and reward | ✅ 7 hints | 04 |
| 4.8 | Archive daily doesn't count for today | ✅ | 07 |
| 4.9 | Rewind: no double reward | ✅ | 04 |

## J5: Hints

| # | Step | iOS | Flow |
|---|---|---|---|
| 5.1 | Reveal to 0 | ✅ | 05 |
| 5.2 | Disabled buttons; no ad offer | ✅ | 05 |
| 5.3 | Kill: still 0 | ✅ | 05 |
| 5.4 | Next day: 5 | ✅ | 05 |
| 5.5 | Check with nothing typed | ✅ Disabled, nothing charged | 05 |
| 5.6 | Clock back | ✅ Every flow sets its own clock | 05 |

## J6: Streak, milestones, freezes, reminder

| # | Step | iOS | Flow |
|---|---|---|---|
| 6.1 | Streak 2, reminder offer, teaser | ✅ | 06 |
| 6.2 | "Remind me" → permission | ✅ The real iOS prompt, allowed; also the denied path | 06b, 06c |
| 6.3 | 3-day milestone | ✅ | 06 |
| 6.4 | 4–6: no milestone | ✅ | 06 |
| 6.5 | 7-day milestone, freeze, Party hat | ✅ | 06 |
| 6.6 | Stats: 7, best 7, 1 freeze | ✅ | 06 |
| 6.7 | Sunday, Perfect week | ✅ | 06 |
| 6.8 | Missed day: still bridgeable | ✅ | 06 |
| 6.9 | Weekly freeze used | ✅ | 06 |
| 6.10 | Saved freeze spent | ✅ | 06 |
| 6.11 | Two missed days end it | ✅ | 06 |
| 6.12 | Streak 1, best 10 | ✅ | 06 |
| 6.13 | Rewound clock: no credit | ✅ | 06 |
| 6.14 | Far forward and back | ✅ | 06 |
| 6.15 | Reminder text at 9:00 | 🧑 iOS delivers scheduled notifications by the real clock, which the test clock can't move. Manual on a device (the text per date is unit-tested in `reminderSync`). |  |
| 6.16 | No second reminder after solving | 🧑 Same reason |  |

## J7: Archive and stamp book

| # | Step | iOS | Flow |
|---|---|---|---|
| 7.1 | Archive from the install day | ✅ | 07 |
| 7.2 | Stamp count (22 for January) | ✅ | 07 |
| 7.3 | Start a past day | ✅ | 07 |
| 7.4 | Solve it: no streak, Time traveller | ✅ | 07 |
| 7.5 | Read-only reopen | ✅ | 07 |
| 7.6 | 4th Sunday: Sunday regular | ✅ | 07b |
| 7.7 | "N to play" goes down | ✅ 13 → 10 | 07 |
| 7.8 | Whole month: Full month, Gold medal | ✅ | 07b |
| 7.9 | Medal on the month header | ✅ | 07b |
| 7.10 | VoiceOver day and stamp labels | ✅ | 07, 07b, 13 |
| 7.11 | Wrap-around: same quote, separate days, letters once | ✅ | 07 |

## J8: Stats

| # | Step | iOS | Flow |
|---|---|---|---|
| 8.1 | Streak card | ✅ | 08 |
| 8.2 | Tiles and rows | ✅ | 08 |
| 8.3 | Weekly chart | ✅ | 08 |
| 8.4 | Favourite authors | ✅ | 08 |
| 8.5 | Rank same as Home | ✅ | 08 |
| 8.6 | Badge shelf groups | ✅ | 08 |
| 8.7 | Badge labels | ✅ | 08, 13 |
| 8.8 | "New" once | ✅ | 08 |
| 8.9 | Badges kept after a reset | ✅ | 06 |
| 8.10 | Timer | ✅ Puzzle time, "Solved in", the average; off hides it | 08, 12 |

## J9: Library

| # | Step | iOS | Flow |
|---|---|---|---|
| 9.1 | Hero and count | ✅ | 09 |
| 9.2 | Shelves in order; no empty sets | ✅ | 09 |
| 9.3 | Reward lines | ✅ | 09 |
| 9.4 | Met and unmet tiles | ✅ | 09, 13 |
| 9.5 | Detail panel | ✅ | 09 |
| 9.6 | One detail at a time | ✅ | 09 |
| 9.7 | Finished shelf: outfit | ✅ Stage ruff (12 Jan), Grand sash (16 Jan) | 09 |
| 9.8 | A fact for every author | ✅ All 18 | 09 |
| 9.9 | Home tile matches | ✅ 18 of 18 | 09 |

## J10: Wardrobe

| # | Step | iOS | Flow |
|---|---|---|---|
| 10.1 | Tile with "New" → Wardrobe | ✅ | 10 |
| 10.2 | Sections; Glasses has no "None" | ✅ | 10 |
| 10.3 | Locked captions | ✅ | 10 |
| 10.4 | Monocle | ✅ | 10 |
| 10.5 | "New" seen after ~1.5 s | ✅ | 10 |
| 10.6 | Wear an item | ✅ Starry sky (the beret needs Apprentice, worn in 03c's rank-up instead) | 10 |
| 10.7 | Three slots at once | ✅ Star shades replace the monocle; Sunrise | 10b |
| 10.8 | Locked can't be worn | ✅ | 10 |
| 10.9 | Same outfit on Home and Solved | 🟡 Screenshots (Inky's drawing has no text) | 10 |
| 10.10 | Kept after relaunch | ✅ | 10, 10b |
| 10.11 | Night owl | ✅ | 10b |
| 10.12 | Early bird (not at 4:30) | ✅ | 10b |
| 10.13 | VoiceOver item labels | ✅ | 10, 13 |

## J11: Home-screen widget

| # | Step | iOS |
|---|---|---|
| 11.1–11.9 | Android widget | ➖ Android only. The iOS widget (WidgetKit) isn't built yet; when it is, these nine steps apply to it. |

## J12: Settings

| # | Step | iOS | Flow |
|---|---|---|---|
| 12.1 | Settings screen, no Restore purchases, version | ✅ | 12 |
| 12.2 | Fill every matching letter | ✅ | 12 |
| 12.3 | Highlight conflicts | ✅ | 12 |
| 12.4 | Default difficulty | ✅ | 12 |
| 12.5 | Show solve time | ✅ | 08, 12 |
| 12.6 | Text size 1–4 | 🟡 Applied everywhere, keyboard keeps its height; screenshots for word splits | 12, 13b |
| 12.7 | Appearance | 🟡 Applied at once; screenshots | 12, 13c |
| 12.8 | High contrast | 🟡 Screenshots | 12, 13c |
| 12.9 | Sound and haptics | ✅ Toggle without error (sound and touch need a device) | 12 |
| 12.10 | Daily reminder on/off | ✅ Allowed, denied (snaps back), kept after restart | 12, 06b, 06c |
| 12.11 | Reminder denied path | ✅ | 06c |
| 12.12 | About our quotes | ✅ | 12b |
| 12.13 | Send feedback | ✅ No crash without Mail (the mail body is unit-tested) | 12b |
| 12.14 | Privacy policy, Terms | ✅ Browser opens; back to Settings | 12b |
| 12.15 | Settings kept after relaunch | ✅ | 12 |

## J13: Accessibility

| # | Step | iOS | Flow |
|---|---|---|---|
| 13.1 | Largest text: puzzle | 🟡 Largest Dynamic Type + Size 4: keyboard, hint bar and board reachable; screenshots | 13b |
| 13.2 | Largest text: Home | 🟡 Same | 13b |
| 13.3 | Largest text: Solved | 🟡 Same, including the share card | 13b |
| 13.4 | Largest text: Stats, Library, Wardrobe | 🟡 Same | 13b |
| 13.5 | VoiceOver: puzzle | ✅ Cell, given, conflict, wrong, key, Delete, ring, menu labels | 13 |
| 13.6 | VoiceOver: solve | ✅ Title, badge and author labels (the spoken "Solved!" announcement needs a device) | 13 |
| 13.7 | VoiceOver: Home | ✅ | 13 |
| 13.8 | Reduce Motion | ✅ Best-effort: content all visible with Reduce Motion set | 13d |
| 13.9 | Touch targets ≥ 44 pt | ✅ Measured on Home and the puzzle (cells and keys: height, D8) | 13e, 13f |
| 13.10 | Tablet, both orientations | ✅ iPad suite: rotation keeps entries; screenshots | 13g |
| 13.11 | Hardware keyboard | 🧑 The simulator's XCTest can't send hardware key presses to a non-text view. Manual on iPad with a keyboard. |  |
| 13.12 | Dark + high contrast | ✅ States present; screenshots | 13c |

## J14: Resilience

| # | Step | iOS | Flow |
|---|---|---|---|
| 14.1 | Background mid-puzzle | ✅ State kept; the timer doesn't run in the background | 14 |
| 14.2 | Interruption (Notification Centre) | ✅ | 14 |
| 14.3 | Ten fast keys | ✅ | 14 |
| 14.4 | Background right after solving | ✅ Recorded once | 14 |
| 14.5 | Midnight during a puzzle | ✅ | 14b |
| 14.6 | Review prompt | 🟡 Best-effort: the simulator may not show StoreKit's prompt | 14g |
| 14.7 | Data recovery | ✅ Corrupt and missing main save | 14d |
| 14.8 | Bad deep links | ✅ | 14c |
| 14.9 | Dated links | ✅ | 14c |
| 14.10 | Screen links | ✅ Also a repeated link and a link to a closed app | 14c |
| 14.11 | Reinstall | ✅ | 14f |
| 14.12 | Real date | 🟡 The real clock with no offset; the real midnight itself can't be waited for in CI | 16b |
| 14.13 | Install on any date | ✅ 20 Nov 2026, 20 May 2027, 29 Feb 2028 | 14e |

## J15: Real-world scenarios

| # | Step | iOS | Flow |
|---|---|---|---|
| 15.1 | Travelling west | 🟡 The local date going back is the rewound clock (06, 16); time zones themselves are unit-tested across 7 zones in `ci.yml` | 06, 16 |
| 15.2 | Update over an existing install | ✅ The runner reinstalls the build over the played one | 15a, 15b |
| 15.3 | Real phones | 🧑 TestFlight on real iPhones, including an older, small one |  |
| 15.4 | iOS, iCloud, prompts | 🟡 This suite is the iOS run; the notification prompt is covered (06b, 06c); iCloud restore is best-effort (17); two-device sync is 🧑 manual | 17 |
| 15.5 | Reminders on real phones | ➖ Android battery savers |  |
| 15.6 | Widget on real launchers | ➖ Android only |  |
| 15.7 | Backup restore | 🟡 iCloud KV restore after reinstall, best-effort | 17 |
| 15.8 | Open across midnight | ✅ | 15b |
| 15.9 | 60-day gap | ✅ | 15c |
| 15.10 | Year end and leap day | ✅ | 15d |
| 15.11 | Screens and navigation | ✅ Smallest iPhone, iPad, newest Pro | small, tablet suites |
| 15.12 | Killed mid-puzzle | ✅ Kill and relaunch keep the letters | 03, 16 |
| 15.13 | Numbers agree | ✅ | 15e |

## J16: Retests for the date fixes

| # | Step | iOS | Flow |
|---|---|---|---|
| 16.1 | Sundays | ✅ | 16 |
| 16.2 | J6 rerun | ✅ | 06 |
| 16.3 | Rewound clock + midnight | ✅ | 16 |
| 16.4 | Goals across midnight | ✅ | 14b |
| 16.5 | Badges from daily history | ✅ | 06, 07, 07b |
| 16.6 | Old v2 save | ✅ | 00 |
| 16.7 | Reopen a saved daily the next day | ✅ From the archive. 🧑 From a notification (needs a delivered reminder) | 16 |
| 16.8 | Widget and reminder text | ➖ Widget; reminder text unit-tested |  |

---

## Not reachable with the seed

Same as the Android plan: higher ranks, 50+ solves, 5,000+ letters, Librarian, Storyteller,
Marathon, the empty shelves and long streaks are covered by unit tests (`rank`, `badges`,
`chapters`, `awards`, `streak`).

## Blocked by the switches

Ads and payments are off, so the shop, Restore purchases, interstitials and rewarded hints don't
exist. `common/no-sales.yaml` checks that no sale or ad UI appears. When either switch is turned on,
add flows for it (StoreKit test configuration on the simulator).

## Running locally on a Mac

```bash
EXPO_PUBLIC_E2E=1 npx expo run:ios --configuration Release
export SIM_UDID=$(xcrun simctl list devices booted -j | python3 -c 'import json,sys; print([d["udid"] for r in json.load(sys.stdin)["devices"].values() for d in r][0])')
bash e2e/ios/run.sh full e2e-out
```

One flow: `maestro test e2e/ios/flows/02-daily-puzzle-solved.yaml`.

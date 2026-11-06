# LetterCrack: end-to-end test cases (emulator / simulator)

Manual E2E scenarios for the current build. Scenarios are grouped into **journeys**: every step inside a journey runs in one continuous session, in order, because each step leaves the app in the state the next step needs. Run journeys in the order listed; J1 must start from a fresh install.

Covers what is built today (Home, Puzzle, Solved). Screens from later phases are listed at the end as blocked so nobody wastes a run looking for them.

## Setup

| Item | Value |
|---|---|
| Build | Debug build on an Android emulator (`npx expo run:android`) or iOS simulator (`npx expo run:ios`). Use a native build, not Expo Go: MMKV needs it. |
| Content | Dev seed, 30 quotes, IDs 90001+. The plain text of every quote is in `assets/quotes.seed.json`; testers use it as the answer key. |
| Feature switches | `config/features.json`: ads **off**, payments **off**. No ad, consent, tracking or shop UI should ever appear. Free hints: **5 per day**. |
| Daily rotation | Dailies are indexed from the launch date **2027-01-01**. Before that date every day shows the same quote. For J6 set the emulator clock to 2027-01-05 or later before starting J1. |
| Fresh install | Uninstall the app (or clear its data) before J1. |
| Device date | Android: Settings › System › Date & time, turn off automatic. iOS simulator: `xcrun simctl status_bar` only fakes the clock display, so use a real date change in the simulator's Settings or override `today()` in a dev build. |
| Reset between runs | Clear app data again before re-running J1. |

Pass criteria common to every step: no crash, no red box, no blank screen, every visible string comes from `src/i18n/en.json` (no raw keys like `home.title`).

---

## J1: Fresh install, first launch and Home

Preconditions: app not installed. Clock set as described above.

| # | Step | Expected |
|---|---|---|
| 1.1 | Install and launch the app. | Splash shows until fonts and data load, then Home. No onboarding, permission prompt, consent dialog or ad appears. |
| 1.2 | Inspect Home. | Header "LetterCrack". Card "Today's quote" with text "A new quote is waiting to be decoded." and a primary button "Start puzzle". No streak line. Card "Levels" with "Continue level 1". No "We restored your saved progress" banner. |
| 1.3 | Switch the OS to dark mode and come back to the app. | Background, text and card colours switch to the dark palette; status bar icons turn light. Switch back to light before continuing. |
| 1.4 | Kill the app and relaunch. | Home shows the same state as 1.2 (nothing was started, nothing is in progress). |

---

## J2: Daily puzzle: input, hints, wrong answers, solve, streak, Solved screen

Preconditions: J1 done. Have the answer for today's daily open (`quotes.seed.json`; the daily is `dailyOrder[0]` while the clock is before launch, else `dailyOrder[daysSinceLaunch]`).

| # | Step | Expected |
|---|---|---|
| 2.1 | Tap "Start puzzle". | Puzzle screen. Header: "Back", title "Daily quote", no timer, chip "Medium". Board shows the cipher letters small with empty guess cells below; punctuation and spaces shown as-is. Exactly 2 cipher letters are pre-filled (givens) in every position they occur. Hint bar: "Reveal", "Check" (Check disabled while the board is empty), "5 hints left". |
| 2.2 | Check word wrapping. | No word is split across two lines. Lines are left-aligned in monospace; cipher and guess letters line up. |
| 2.3 | Tap an empty cell. | That cell and every other cell with the same cipher letter are highlighted as selected. |
| 2.4 | Tap a given (pre-filled) cell. | Nothing is selected or changed; givens are locked. |
| 2.5 | With a cell selected, tap a letter key, e.g. `T`. | The letter appears in the selected cell **and** in every cell with that cipher letter (auto-fill on). Selection moves to the next empty cell. Key `T` is dimmed on the keyboard but still tappable. Haptic tick on a real device; no error on emulator. |
| 2.6 | Tap the same letter `T` for a *different* cipher letter. | Both groups of cells now show `T` and are flagged as conflicts (highlight-conflicts on). "Check" is now enabled. |
| 2.7 | Tap the delete key (⌫) with one of the conflicting cells selected. | That cipher letter is cleared everywhere it occurs. The conflict flag disappears from both groups. Key `T` is dimmed only if `T` is still used somewhere. |
| 2.8 | Enter a letter you know is wrong, then tap "Check". | The wrong cells are marked wrong (flag dots). Counter reads "4 hints left". Correct entries are not marked. |
| 2.9 | Fix the wrong letter by typing the right one. | The wrong flag on those cells clears as soon as the letter changes. |
| 2.10 | Tap "Reveal". | One unsolved cipher letter is filled everywhere it occurs and those cells become locked (tapping them selects nothing; delete cannot clear them). Counter reads "3 hints left". |
| 2.11 | Fill every remaining cell so the board is full but at least one letter is wrong. | Message "Almost! The highlighted letters aren't right yet." The wrong cells are flagged. No hint is charged, no popup, no fail state, no life lost. |
| 2.12 | Tap "Back". | Return to Home. "Today's quote" card now reads "You're partway through today's quote." and the button says "Continue". |
| 2.13 | Tap "Continue". | The puzzle reopens with exactly the same entries, flags, revealed letters and "3 hints left". |
| 2.14 | Correct the last wrong letter so the board is fully correct. | Letters flip left to right (about 0.6 s); the difficulty chip is disabled; then the Solved screen replaces the puzzle (Back does not return to the puzzle). TalkBack / VoiceOver, if on, announces "Solved!". |
| 2.15 | Inspect the Solved screen. | Caption "Solved". Full quote in serif with curly quotes, then "— Author". No "Clean solve" badge (hints were used). No "Solved in" time (timer off). "Streak: 1 day". No freeze line. Author card with name, life dates, one-line bio, and "Work, Year". Primary button "Play a level", secondary "Home". No ad plays at any point. |
| 2.16 | Tap "Home". | Home card reads "Solved. A new quote arrives tomorrow.", shows "1-day streak" and a secondary button "See today's quote". |
| 2.17 | Tap "See today's quote". | The same Solved screen as 2.15 opens. The streak line is absent this time (streak is only shown on the solve itself). Tap "Home". |

---

## J3: Level path: difficulty sheet, restart, clean solve, Next, no repeats, autosave across kill

Preconditions: J2 done.

| # | Step | Expected |
|---|---|---|
| 3.1 | Tap "Continue level 1". | Puzzle titled "Level 1", chip "Medium", 2 givens, "3 hints left" (shared daily allowance). The quote is **not** today's daily quote. |
| 3.2 | Tap the "Medium" chip. | A modal sheet "Difficulty" with chips Easy / Medium / Hard / Expert, Medium selected, note "Changing the difficulty restarts this puzzle.", buttons "Cancel" and "Restart" (Restart disabled while Medium is still selected). |
| 3.3 | Tap "Hard" then "Cancel". | Sheet closes. Puzzle unchanged, chip still "Medium". |
| 3.4 | Open the sheet again and tap outside the card (scrim). | Sheet closes with no change. |
| 3.5 | Type two letters, then open the sheet, pick "Expert", tap "Restart". | Sheet closes. Same quote, same cipher, but **0 givens** and your two letters are gone. Chip reads "Expert". Hints left unchanged (restart is free). |
| 3.6 | Open the sheet, pick "Easy", "Restart". | 3 or 4 cipher letters pre-filled. Chip "Easy". |
| 3.7 | Tap "Back", then on Home tap "Continue level 1". | Reopens at Easy with the givens from 3.6 (difficulty persisted in the save). |
| 3.8 | Type three correct letters, then force-kill the app (swipe away / stop) and relaunch. | Home shows "Continue level 1". Opening it restores the exact entries, Easy difficulty, and the same selection-free board. "3 hints left" persists. |
| 3.9 | Solve Level 1 **without** Reveal or Check. | Solved screen shows "✓ Clean solve: no hints, no checks". No streak line (levels never touch the streak). Button reads "Next puzzle". |
| 3.10 | Tap "Next puzzle". | Goes straight to a puzzle titled "Level 2" with a **different** quote. No ad, no interstitial, no delay beyond navigation (ads off). Difficulty is back to the default "Medium" (the per-puzzle choice does not stick). |
| 3.11 | Tap "Back". | Home shows "Continue level 2". |
| 3.12 | Repeat 3.1 → 3.9 → 3.10 for Levels 2 to 6, noting each quote. | Six distinct quotes, none equal to the daily. Level number increments by one per solve. "Continue level N" on Home always matches the next unsolved level. |
| 3.13 | On the Solved screen of Level 6 tap "Home" instead of Next, then "Continue level 7", then Back. | Home still says "Continue level 7" (opening a level marks it seen but does not advance the counter until solved). |

---

## J4: Hint exhaustion and midnight refill

Preconditions: J3 done; hints left should be low. If more than 2 remain, spend them with Reveal first.

| # | Step | Expected |
|---|---|---|
| 4.1 | In an open level puzzle, tap "Reveal" until the counter hits 0. | Each Reveal fills one letter and decrements the counter. At 0 the counter text changes to "No hints left today. Free hints refill at midnight." and both "Reveal" and "Check" are disabled. |
| 4.2 | Tap the disabled "Reveal" and "Check". | Nothing happens; no charge, no dialog, no rewarded-ad offer (ads off). |
| 4.3 | Kill and relaunch; reopen the puzzle. | Still 0 hints; buttons still disabled. |
| 4.4 | Advance the device date by one day. Return to the app (foreground), reopen the puzzle. | Counter reads "5 hints left"; buttons enabled. |
| 4.5 | Tap "Check" with a board that has no typed letters (only givens/reveals). | Message "Type some letters first."; counter unchanged (nothing charged). |

---

## J5: Daily rollover, streak growth, freeze and rewound clock

Preconditions: J4 done, so the device date is now D+1 relative to the day the first daily was solved (call the original day D). Clock must be ≥ 2027-01-01 for the quote to change.

| # | Step | Expected |
|---|---|---|
| 5.1 | Go Home on D+1. | "Today's quote" is back to "A new quote is waiting to be decoded." with "Start puzzle". Streak line still shows "1-day streak". |
| 5.2 | Start and solve the daily. | A different quote from D's daily; same cipher on a second device/emulator set to the same date (determinism). Solved screen: "Streak: 2 days". Home afterwards: "2-day streak". |
| 5.3 | Set the date to D+3 (skip D+2). Foreground the app, solve the daily. | Solved screen shows "Streak: 3 days" and "Your weekly streak freeze covered a missed day." (Skipped day bridged by the weekly freeze; D+2 and D+3 must fall in the same ISO week for this; otherwise pick dates that do.) |
| 5.4 | Set the date to D+6 (skip D+4 and D+5, same ISO week). Solve the daily. | Solved screen "Streak: 1 day". Two missed days in one week cannot be bridged; the streak restarts. Home shows "1-day streak". |
| 5.5 | Set the date **back** to D+5. Foreground the app. | Home shows D+5 as unsolved ("Start puzzle"). |
| 5.6 | Solve the D+5 daily. | Solved screen shows **no** streak line; Home streak stays "1-day streak". Credit is refused after the clock is wound back below the highest date seen; the solve itself still records (Home says "Solved."). |
| 5.7 | Set the clock forward 30 days. Foreground and check Home. | Home still works; "Start puzzle" is available; streak shows the last value. No crash from a large date jump. |
| 5.8 | Restore the real date before the next journey. | — |

---

## J6: Deep links and bad routes

Preconditions: any state. Use `adb shell am start -a android.intent.action.VIEW -d "<url>"` with the app scheme from `app.json`, or `xcrun simctl openurl booted "<url>"`.

| # | Step | Expected |
|---|---|---|
| 6.1 | Open `<scheme>://puzzle/level%3A1` (quote ID that does not exist). | Screen "This puzzle isn't available." with a "Go home" button. Tapping it goes Home. |
| 6.2 | Open `<scheme>://puzzle/daily%3A2099-01-01` (future date). | Same "not available" screen. |
| 6.3 | Open `<scheme>://puzzle/daily%3A<yesterday>` (a past, post-launch date). | Yesterday's daily opens as "Daily quote" and is solvable. Solving it shows no streak line (archive solves never change the streak), but Home's today card is unaffected. |
| 6.4 | Open `<scheme>://solved?key=level%3A1`. | "This puzzle isn't available." with a "Home" button. |
| 6.5 | Open `<scheme>://puzzle/garbage`. | "Not available" screen; no crash. |

---

## J7: Accessibility, text size, reduce motion, tablet

Preconditions: any state with at least one unsolved level available.

| # | Step | Expected |
|---|---|---|
| 7.1 | Set OS font size to the largest (Android "Font size" max; iOS Accessibility › Larger Text max). Open a level. | Cells and text grow; words still never split across lines; the board scrolls if needed; the keyboard keeps its fixed key height and key labels grow only slightly. Hint bar wraps instead of clipping. Buttons remain tappable. |
| 7.2 | Open the Solved screen of any solved quote at that size. | Quote, author card and buttons are all readable and reachable; nothing is cut off. |
| 7.3 | Turn on TalkBack / VoiceOver. Swipe through the puzzle. | Each cell reads "cipher X, guess Y" or "cipher X, empty", plus "given", "conflict" or "marked wrong" where applicable. Punctuation cells read the character. Keys read the letter, and "already used" for dimmed ones; delete reads "Delete". Reveal and Check read their hints ("Fills one letter everywhere. Uses a hint." / "Marks wrong letters. Uses a hint."). Hint counter updates are announced (live region). |
| 7.4 | With the screen reader on, solve the puzzle. | "Solved!" is announced before the Solved screen appears. Turn the reader off. |
| 7.5 | Enable Reduce Motion (Android "Remove animations" / iOS Reduce Motion). Solve a puzzle. | No letter-flip; the board fades briefly and the Solved screen appears. |
| 7.6 | Measure or inspect touch targets (Layout Inspector / Accessibility Inspector). | Every key, cell, chip and button is at least 44×44 pt. |
| 7.7 | Run the app on a tablet emulator (e.g. Pixel Tablet / iPad) in portrait and landscape. | Keyboard is centred and capped in width; board uses the width without stretching letters; Solved screen content is centred and readable. Rotating mid-puzzle keeps all entries. |
| 7.8 | Dark mode plus high text size together on the puzzle and Solved screens. | Contrast stays readable: selected, conflict and wrong cell states are distinguishable in dark mode. |

---

## J8: Resilience: background, interruptions and data recovery

| # | Step | Expected |
|---|---|---|
| 8.1 | Mid-puzzle, background the app for a minute, then return. | Puzzle exactly as left. No re-render of a fresh board. |
| 8.2 | Mid-puzzle, trigger an incoming call / notification shade / rotate the device. | Entries, selection and hint count survive. |
| 8.3 | Type letters rapidly (10 keys in ~1 s). | Each tap enters exactly one letter; no doubled entries, no skipped cells. |
| 8.4 | Double-tap "Next puzzle" on the Solved screen quickly. | Only one navigation happens (button disables while busy). |
| 8.5 | (Debug build, Android) Corrupt the main MMKV blob: `adb shell run-as app.lettercrack` and overwrite the root key file with junk, keeping the backup file. Relaunch. | Home shows "We restored your saved progress from a backup." Progress, streak and hints match the last good state. Nothing is wiped. |
| 8.6 | Uninstall, reinstall, launch. | Clean fresh state (J1.2). No leftover data, no crash. |

---

## Blocked: screens not built yet

Record these as **Blocked, not Failed**. They come from `specs.md` §6 and will become journeys when the screen lands.

| Area | Phase | Scenarios to add when available |
|---|---|---|
| Archive (S4) | 4 | Calendar of past dailies back to launch, gold dot on solved days, future dates not tappable, solving an archive daily never changes the streak, all free. |
| Stats (S5) | 4 | Puzzles solved, clean solves, current/best streak, average time only when timer is on, favourite authors; values match the journeys above. |
| Share card (S9) | 4 | 1080×1350 image with quote, author and "Solved on LetterCrack · lettercrack.app"; daily share only after solving; respects text size. |
| Report quote | 4 | Hides the quote locally; it never appears again in levels; nothing is sent online. |
| Settings (S7) | 6 | Auto-fill off (letter fills one cell only), highlight conflicts off, show timer (header timer, "Solved in" badge, pauses in background), text size slider, appearance, high contrast, haptics, daily reminder, "About our quotes". |
| Onboarding (S8) | 6 | One tiny interactive puzzle then the difficulty picker; no permission prompts; default difficulty applied to Level 1. |
| Shop / Restore (S6) | 5 (switch off) | Must **not** appear while `payments` is off. When on: Remove Ads, hint packs, Restore, StoreKit prices, failures never block play, free hints drop to 2/day. |
| Ads | 5 (switch off) | Must **not** appear while `ads` is off. When on: interstitial only after Next, never first 3 puzzles, never on dailies, max 1 per 2 solves and 1 per 4 min, muted; rewarded +1 hint only on EARNED_REWARD, cap 5/day. |
| Review prompt (F8), reminder (F9) | 6/7 | After 3rd clean solve ≥ 2 days after install, max 3/year; reminder opt-in after 2nd daily solve. |
| iCloud merge | 7 | Two devices, hints balance = max(local, cloud), seen IDs union, streak never lost. iOS only. |

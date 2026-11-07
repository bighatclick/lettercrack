# LetterCrack: end-to-end test cases (emulator / simulator)

Manual E2E scenarios for the current build (Phases 0–8 code, ads and payments off). Scenarios are grouped into **journeys**: every step inside a journey runs in one continuous session, in order, because each step leaves the app in the state the next one needs. Run journeys in the order listed; J1 must start from a fresh install.

Maestro flows for the two spec §14 smoke paths live beside this file (`01-…yaml`, `02-…yaml`); they need an E2E build. Everything below runs on an ordinary debug build.

## Setup

| Item | Value |
|---|---|
| Build | Debug APK via `npm run android:local` (always local, never EAS cloud) or `npx expo run:ios`. Expo Go cannot run it: MMKV, hardware-keys and icloud-kv are native modules. |
| Content | Dev seed, 30 quotes, IDs 90001+. The plain text of every quote is in `assets/quotes.seed.json`; testers use it as the answer key. The daily order starts at quote 90010. |
| Feature switches | `config/features.json`: ads **off**, payments **off**. No ad, consent, tracking, shop or "Restore purchases" UI should ever appear. Free hints: **5 per day**. |
| Daily rotation | Dailies are indexed from the launch date **2027-01-01**. Before that date every day shows the same quote and the Archive is empty. Set the emulator clock to **2027-01-10** before J1 so the archive has days and dailies rotate. |
| Fresh install | Uninstall the app (or clear its data) before J1. |
| Device date | Android: Settings › System › Date & time, automatic off, or `adb shell "su 0 toybox date 012709002027"` style commands on a Google APIs image (`adb root` first). iOS simulator: change the date in the simulator's Settings app. |
| Deep links | Scheme `lettercrack://`. Android: `adb shell am start -a android.intent.action.VIEW -d "<url>" app.lettercrack`. iOS: `xcrun simctl openurl booted "<url>"`. |

Pass criteria common to every step: no crash, no red box, no blank screen, every visible string is real text (no raw keys like `home.title`).

---

## J1: Fresh install, onboarding and Home

Preconditions: app not installed, clock at 2027-01-10.

| # | Step | Expected |
|---|---|---|
| 1.1 | Install and launch. | Splash, then **Onboarding**: Inky waving, "Welcome to LetterCrack", intro text, task box "Try this tiny one… Hint: it's an animal that purrs." A 2-word board (A CAT in cipher, no givens), the A–Z keyboard, no Reveal/Check bar, a "Skip" button top right. No permission prompt, consent dialog or ad. |
| 1.2 | Tap the first cell, type `A`; tap a cell of the second word, type `C`, `A`, `T` as needed. | Letters fill every matching cipher cell. When correct the task box turns green with "You've got it.", Inky cheers, and a "Next puzzle" button appears. |
| 1.3 | Tap "Next puzzle". | Dark gradient screen with floating letters: "How tricky should puzzles be?", four radio tiles Easy / Medium / Hard / Expert (Medium selected), "Start playing". |
| 1.4 | Select "Hard", then "Start playing". | **Home** opens. Hero: today's date, a greeting ("Good morning/afternoon/evening, codebreaker!"), gear button, Inky with bubble "Today's quote is ready. Let's crack it!". No streak tag. |
| 1.5 | Inspect the Today card. | Tags: "TODAY'S QUOTE", "Hard" (the onboarding choice), "N letters". A row of coloured cipher tiles (first words of the quote in code, with "…" if truncated). Text "A new quote is waiting to be decoded." Button "Crack it". |
| 1.6 | Inspect the Levels card and tiles. | "Levels" with tag "Level 1", a winding path with node 1 pulsing and later nodes locked, button "Continue level 1". Two tiles: "Archive" with subtitle "9 to play" (days since launch), "Stats" with "0 quotes solved". |
| 1.7 | Kill and relaunch. | Opens straight on Home (onboarding is not shown again). |
| 1.8 | Switch the OS to dark mode and back. | Cards and background follow the device theme (Appearance default is "Device"); status bar icons invert. |

---

## J2: Daily puzzle: input, hints, wrong answers, solve, streak, Solved screen

Preconditions: J1 done. Answer key open.

| # | Step | Expected |
|---|---|---|
| 2.1 | Tap "Crack it". | Puzzle screen. Round back button, title "Daily quote", chip "Hard" (1 given), progress ring "x%" that counts the given letters, round "⋯" menu button. Board card with cipher letters small above empty guess cells; punctuation shown as-is. Below the board Inky with one of six tips (never the answer). Hint bar: "Reveal", "Check" (disabled, board has no typed letters), "5 hints left". |
| 2.2 | Check word wrapping. | No word is split across lines. Cipher and guess letters align (monospace). |
| 2.3 | Tap an empty cell. | That cell and every other cell with the same cipher letter are highlighted. |
| 2.4 | Tap the given (pre-filled) cell. | Nothing changes; givens are locked. |
| 2.5 | Type a letter, e.g. `T`. | `T` fills every cell of that cipher letter (auto-fill on); selection advances; the progress ring rises; key `T` dims on the keyboard but stays tappable. |
| 2.6 | Type `T` again for a *different* cipher letter. | Both groups show `T` and are flagged as conflicts. "Check" becomes enabled. |
| 2.7 | Select one conflicting group and tap ⌫. | That cipher letter clears everywhere; the conflict flag disappears from both groups. |
| 2.8 | Enter a letter you know is wrong, tap "Check". | Wrong cells get the "wrong" flag; correct ones do not. "4 hints left". |
| 2.9 | Type the right letter over it. | The wrong flag clears as soon as the letter changes. |
| 2.10 | Tap "Reveal". | One unsolved cipher letter fills everywhere and locks (cannot be selected or erased). "3 hints left". |
| 2.11 | Fill the board completely with one letter still wrong. | Message "Almost! The highlighted letters aren't right yet." Wrong cells flagged. Ring shows 100%. No hint charged, no popup, no fail state. |
| 2.12 | Tap back. | Home. Inky bubble "Your quote is waiting right where you left it.", card text "You're partway through today's quote.", button "Continue". Archive tile still "9 to play" (today is not in the archive). |
| 2.13 | Tap "Continue". | Same entries, flags, revealed letters, "3 hints left" and ring value. |
| 2.14 | Correct the last letter. | Letters flip left to right (~0.6 s), chip disables, then the **Solved** screen replaces the puzzle (back does not return to the puzzle). |
| 2.15 | Inspect Solved. | Dark gradient, confetti, rotating rays, Inky cheering with a coral seal, rainbow title "Cracked it!". Tags: "Streak: 1 day" only (no "Clean solve", no time). Tilted paper stack with "SOLVED", the quote in serif, author medal + "Work, Year". Author card (name, dates, bio). Buttons: "Play a level", then "Share" and "Home". No reminder card yet (needs 2 daily solves). No ad. |
| 2.16 | Tap "Share". | System share sheet opens with a PNG (1080×1350 card: quote, author, "Solved on LetterCrack · lettercrack.app"). Dismiss it. No crash if no share target is installed (an alert "Sharing isn't available right now." is acceptable on a bare emulator). |
| 2.17 | Tap "Home". | Hero shows a flame tag "1-day streak" and bubble "Nice work today! A new quote arrives tomorrow." Card: "Solved. A new quote arrives tomorrow." with a secondary "See today's quote". Stats tile: "1 quote solved". |
| 2.18 | Tap "See today's quote". | Solved screen again without the streak tag and without confetti-triggered review prompt. "Play a level" still works. Tap "Home". |

---

## J3: Level path: difficulty sheet, restart, clean solve, Next, no repeats, autosave across kill

Preconditions: J2 done.

| # | Step | Expected |
|---|---|---|
| 3.1 | Tap "Continue level 1". | Title "Level 1", chip "Hard", 1 given, "3 hints left", a different quote from the daily. |
| 3.2 | Tap the chip. | "Difficulty" sheet with Easy / Medium / Hard / Expert chips (Hard selected), note "Changing the difficulty restarts this puzzle.", "Cancel" and "Restart" (Restart disabled while Hard is selected). |
| 3.3 | Pick "Medium" then "Cancel". | Sheet closes, puzzle untouched, chip still "Hard". |
| 3.4 | Open the sheet and tap the dim area outside the card. | Sheet closes with no change. |
| 3.5 | Type two letters; open the sheet; pick "Expert"; "Restart". | Same quote and cipher, **0 givens**, your letters gone, ring 0%, chip "Expert". Hints unchanged. |
| 3.6 | Sheet → "Easy" → "Restart". | 3–4 givens, chip "Easy". |
| 3.7 | Back, then "Continue level 1". | Reopens at Easy with the same givens (difficulty persisted). |
| 3.8 | Type three correct letters; force-kill the app; relaunch; "Continue level 1". | Exactly the same entries, Easy, ring value and "3 hints left". |
| 3.9 | Solve Level 1 with no Reveal and no Check. | Solved screen with tag "Clean solve: no hints, no checks", no streak tag, button "Next puzzle". |
| 3.10 | Tap "Next puzzle". | Goes directly to "Level 2" with a **new** quote. No ad, no interstitial. Chip is back to the default ("Hard" from onboarding). |
| 3.11 | Back. | Home: Levels tag "Level 2", path shows node 1 ticked and node 2 pulsing, button "Continue level 2". Stats tile "2 quotes solved". |
| 3.12 | Repeat solve → "Next puzzle" for Levels 2–5, noting each quote. | Five distinct quotes, none equal to the daily. Level tag and path advance each time. |
| 3.13 | On Level 6, tap the "⋯" menu. | Alert "Report this quote?" with body "It will be hidden on this device and listed in your next feedback email. Nothing is sent now." Buttons "Cancel" / "Report and hide". |
| 3.14 | Tap "Cancel", reopen menu, tap "Report and hide". | The app jumps straight to Level 7 with a different quote (reported level is skipped). Back → Home still says "Continue level 7"; the reported quote never appears again. No network activity. |
| 3.15 | Double-tap "Next puzzle" quickly on any later Solved screen. | Only one navigation; the button disables while busy. |

---

## J4: Hint exhaustion and midnight refill

Preconditions: J3 done. If more than 2 hints remain, spend them with Reveal first.

| # | Step | Expected |
|---|---|---|
| 4.1 | In an open level, tap "Reveal" until the counter hits 0. | Each Reveal fills a letter and decrements. At 0 the text becomes "No hints left today. Free hints refill at midnight." and both buttons are disabled. |
| 4.2 | Tap the disabled buttons. | Nothing; no rewarded-ad offer (ads off). |
| 4.3 | Kill, relaunch, reopen the puzzle. | Still 0, still disabled. |
| 4.4 | Advance the device date one day (to 2027-01-11); foreground the app; reopen the puzzle. | "5 hints left", buttons enabled. |
| 4.5 | Erase all typed letters, tap "Check". | "Type some letters first."; counter unchanged. |

---

## J5: Daily rollover, streak growth, freeze, reminder offer, rewound clock

Preconditions: J4 done; the device is on D+1 where D = 2027-01-10 (the first daily solved).

| # | Step | Expected |
|---|---|---|
| 5.1 | Home on D+1. | Today card back to "A new quote is waiting…" with "Crack it"; hero still shows "1-day streak"; Archive tile "10 to play" (D is now in the archive but solved, so count unchanged… see 6.1). |
| 5.2 | Solve the daily. | New quote. Solved: "Streak: 2 days" **and** a reminder card "Want a nudge tomorrow?" with "Remind me" / "No thanks" (offered once, after the 2nd daily solve). |
| 5.3 | Tap "Remind me". | Android 13+/iOS: system notification permission dialog. Allow it. Card disappears. Settings later shows "Daily reminder" on. |
| 5.4 | Tap "Home". | Hero "2-day streak". |
| 5.5 | Set the date to D+3 (skip D+2; D+2 and D+3 must be in the same ISO week; 12 and 13 Jan 2027 are). Foreground, solve the daily. | "Streak: 3 days" and "Your weekly streak freeze covered a missed day." No reminder card (already offered). |
| 5.6 | Set the date to D+6 (skip D+4, D+5). Solve. | "Streak: 1 day". Two misses in one week cannot be bridged. |
| 5.7 | Set the date back to D+5. Foreground. | Home treats D+5 as today's unsolved daily. |
| 5.8 | Solve it. | **No** streak tag; hero streak stays "1-day streak" (credit refused after the clock is wound back). Card still flips to "Solved." |
| 5.9 | Set the clock forward 30 days; foreground. | Home works, "Crack it" available, no crash. Restore the date to D+6 afterwards. |

---

## J6: Archive

Preconditions: J5 done (several past dailies, one in progress from the deep-link step is optional). Date D+6 = 2027-01-16.

| # | Step | Expected |
|---|---|---|
| 6.1 | Tap the "Archive" tile. | Sunset hero "Archive", Inky thinking, intro "Every past daily quote, ready whenever you are.", tags "N solved", "N started", "N to play". One card per month ("January 2027") with a Monday-first weekday row and a day grid from 1 Jan to yesterday. Days you solved (D, D+1, D+3, D+5) are coloured with a dot; unsolved days are plain. |
| 6.2 | Tap an unsolved past day, e.g. 2 Jan. | Puzzle titled "Daily quote · 2027-01-02". Type one letter, go back. |
| 6.3 | Back in the Archive. | 2 Jan now shows a progress ring (started) and "1 started" in the tags; the legend explains the dot and ring. |
| 6.4 | Reopen 2 Jan and solve it. | Solved screen with **no** streak tag and button "Back to archive" (instead of "Play a level"). Tap it. |
| 6.5 | Archive. | 2 Jan now coloured with a dot; "N solved" went up by one. Tap it: Solved screen opens read-only with "Back to archive". |
| 6.6 | Back to Home. | Archive tile subtitle "N to play" dropped by one. Hero streak unchanged. |
| 6.7 | TalkBack: focus a day. | Reads "2 January, solved" / "…, in progress" / "…, not solved yet". |

---

## J7: Stats

Preconditions: J6 done.

| # | Step | Expected |
|---|---|---|
| 7.1 | Tap the "Stats" tile. | Night hero "Stats". Candy streak card: big flame, current streak number, "day streak · best 3", Inky, a 7-day row with flames on solved days (today highlighted). |
| 7.2 | Check the tiles and rows. | "Puzzles solved" = total of all solves so far (dailies + levels + archive). "Clean solves" percentage and ring, with "N solved with no hints". Rows: "Daily quotes solved" (count of dailies solved on their own day), "Best streak: 3 days". **No** "Average solve time" row (timer off). |
| 7.3 | "Each week" chart. | Six bars; the current week has all your solves; label "Puzzles solved in each of the last 6 weeks." |
| 7.4 | "Favorite authors". | Podium with up to 3 authors by solve count; initials medals; counts like "2 quotes". |
| 7.5 | Back → Settings (gear) → turn "Show solve time" on → solve one more level → Stats. | "Average solve time" row now appears with a mm:ss value; Solved screen of that level showed "Solved in m:ss". Puzzle header shows a running timer that pauses while the app is backgrounded. |

---

## J8: Settings and About

Preconditions: any state after onboarding.

| # | Step | Expected |
|---|---|---|
| 8.1 | Tap the gear on Home. | Candy hero "Settings", subtitle "Make LetterCrack yours.", Inky. Sections PLAY / LOOK AND FEEL / ABOUT. No "Restore purchases" row (payments off). Footer "Version 1.0.0". |
| 8.2 | Turn "Fill every matching letter" off; open a level; type a letter. | Only the selected cell fills, not its siblings. Turn it back on afterwards and verify siblings fill again. |
| 8.3 | Turn "Highlight conflicts" off; reuse a letter for two cipher letters. | No conflict flags. Turn it back on: flags return immediately. |
| 8.4 | "Default difficulty": pick "Easy". Open a *new* level (not one in progress). | Starts at Easy with 3–4 givens. Home Today tag reflects the default for an unstarted daily. |
| 8.5 | "Text size": tap Size 4. | Whole app scales; puzzle words still never split; keyboard keys keep height; Settings itself remains laid out. Return to Size 1 (or keep for J9). |
| 8.6 | "Appearance": Dark, then Light, then Device. | Immediate theme change regardless of OS setting; "Device" follows the OS again. |
| 8.7 | "High contrast" on. | Borders on cards/board get thicker; text contrast rises; cell states still distinguishable. |
| 8.8 | "Sound effects" and "Haptics" toggles. | Toggle without error. With sound on, a key tap plays a click and a solve plays a chime (emulator audio permitting). |
| 8.9 | "Daily reminder" toggle. | Turning on asks for notification permission if not granted; if denied the toggle snaps back off. Turning off cancels (no notification at 9:00 next day). With it on and the date advanced past 09:00 with today unsolved, a notification "LetterCrack: Today's quote is ready." appears; after solving today's daily no further notification arrives that day. |
| 8.10 | "About our quotes". | Lagoon hero "About our quotes", four paragraphs on public domain, Bartlett's, editorial review and author notes. Back works. |
| 8.11 | "Send feedback". | Opens the mail client with subject "LetterCrack feedback" and body listing app version, quote DB version and any reported quotes (the one from J3.14). On an emulator with no mail app nothing happens and no crash. |
| 8.12 | "Privacy policy" / "Terms of use". | Open the browser at the configured URLs; no crash if no browser. |
| 8.13 | Back to Home. | Every change above is still in effect after kill and relaunch. |

---

## J9: Accessibility, text size, reduce motion, tablet

| # | Step | Expected |
|---|---|---|
| 9.1 | OS font size max **and** Settings text Size 4; open a puzzle. | Board scrolls; no word split; keyboard fixed height; hint bar wraps; header title truncates with an ellipsis instead of pushing the menu button off screen. |
| 9.2 | Solved screen at that size. | Title "Cracked it!" wraps; quote, author card, buttons all reachable by scrolling. |
| 9.3 | TalkBack on; swipe through the puzzle. | Cells: "cipher X, guess Y" / "cipher X, empty" plus "given" / "conflict" / "marked wrong". Keys: the letter, "already used" hint when dimmed; ⌫ reads "Delete". Reveal/Check read their hints. Progress ring reads "N of M letters filled". Menu button reads "Report this quote". |
| 9.4 | Solve with TalkBack on. | "Solved!" announced; Solved title is read as "Cracked it!". |
| 9.5 | Reduce Motion (Android "Remove animations"). Open Home, solve a puzzle. | No entrance pops or pulsing path node; on solve the board fades instead of flipping; confetti and rays are still/absent on Solved. |
| 9.6 | Touch targets (Layout Inspector). | Keys, cells, chips, round header buttons, archive days and tile buttons are ≥ 44 pt. |
| 9.7 | Tablet emulator, portrait and landscape. | Home cards, puzzle (max width ~820), keyboard (max 640) and Solved (max 640) stay centred; rotating mid-puzzle keeps entries. |
| 9.8 | Hardware keyboard on the emulator: type letters, Backspace, arrow keys in a puzzle. | Letters enter, Backspace erases, arrows move the selection; same in onboarding. |
| 9.9 | Dark + high contrast on puzzle and Solved. | Selected, conflict and wrong states remain distinguishable. |

---

## J10: Resilience: background, interruptions, data recovery, review prompt

| # | Step | Expected |
|---|---|---|
| 10.1 | Background mid-puzzle for a minute; return. | Exact state; timer (if on) did not advance while backgrounded. |
| 10.2 | Rotate / notification shade / incoming call mid-puzzle. | Entries, selection and hints survive. |
| 10.3 | Type 10 keys in ~1 s. | One letter per tap, no doubles, no skipped cells. |
| 10.4 | Review prompt: with the device date ≥ 2 days after install, achieve a 3rd clean solve. | About 1.2 s after the Solved screen appears the in-app review dialog is requested (on an emulator without Play Store it silently does nothing; no crash). It is not asked again within 30 days. |
| 10.5 | (Debug, Android) `adb shell run-as app.lettercrack` and overwrite the main MMKV file with junk, keeping the backup. Relaunch. | Home shows "We restored your saved progress from a backup." Progress, streak, hints intact. Nothing wiped. |
| 10.6 | Deep links: `lettercrack://puzzle/level%3A1`, `lettercrack://puzzle/daily%3A2099-01-01`, `lettercrack://puzzle/garbage`, `lettercrack://solved?key=level%3A1`. | Each shows "This puzzle isn't available." with a "Go home" / "Home" button; no crash. `lettercrack://puzzle/daily%3A2027-01-03` opens that archive daily. |
| 10.7 | Uninstall, reinstall, launch. | Onboarding again; clean state. |

---

## Blocked (switches off / platform)

| Area | Why blocked | Scenarios when unblocked |
|---|---|---|
| Shop, Restore purchases, hint packs | `payments` off | Shop screen, StoreKit/Play prices, Restore, failures never block play, free hints drop to 2/day. |
| Interstitials, rewarded hints | `ads` off | Only after Next; never first 3 puzzles or dailies; max 1 per 2 solves / 4 min; muted; rewarded +1 only on EARNED_REWARD, cap 5/day. |
| iCloud merge | iOS only | Two devices: hints balance = max, seen IDs union, streak never lost. |
| Real quote DB | Editorial review pending | `quotes:validate` passes; no seed IDs (90001+) in the shipped build. |

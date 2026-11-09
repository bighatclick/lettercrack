# LetterCrack: end-to-end test cases v2 (Android emulator)

This suite covers the build at `c1fc66c` (8 Nov 2026), which has engagement phases A–D, schema v4, and ads and payments off. It replaces v1. The v1 run is recorded in `RESULTS.md`, and v1 itself is in git history.

**How it's organised.** Steps are grouped into **journeys**. Steps inside a journey run in one continuous session, in order, because each step leaves the app in the state the next step needs. Run the journeys in the order listed. U0 needs the *old* build still installed. J1 starts from a fresh install.

**What's new in v2:**
- Daily goals.
- Streak milestones and saved freezes.
- Tomorrow's teaser and the share-result line.
- Word hop.
- Codebreaker rank.
- 36 badges.
- Inky's wardrobe.
- The Library and author facts.
- Chapters and big-quote levels.
- Sunday specials.
- The monthly stamp book.
- Varied reminder text.
- The Android home-screen widget.
- Migration from v2 to v4.

## Setup

| Item | Value |
|---|---|
| **Build** | Debug APK from `npm run android:local`. Always build locally, never on EAS cloud. Rebuild native: the home-widget module and `expo-screen-orientation` are new. Run Metro with `--clear`. |
| **E2E bundle** | Needed only for the long-run steps marked **[LR]**. Start Metro with `EXPO_PUBLIC_E2E=1 npx expo start --dev-client --clear`. This adds an "e2e solve" button that types the answer, which counts as a clean solve. Use it only where the step says so; solve every other step by hand. |
| **Emulator** | SalesTrackerApi35 (Pixel 7, Android 15, Google APIs image, so `adb root` works). The Pixel Tablet AVD is used for J13 only. |
| **Content** | Dev seed: 30 quotes, IDs 90001–90030, by 18 authors. The answer key is in `assets/quotes.seed.json`.<br>**Dailies:** 90001–90010, in the order 90010 → 90001, then repeating.<br>**Levels:** 90011–90030, so there are 20 levels (2 chapters). |
| **Switches** | Ads **off** and payments **off**. No ad, consent, tracking, shop or "Restore purchases" UI may ever appear. Free hints: **5 per day**. |
| **Dates** | The launch date is 2027-01-01, and dailies before it never rotate. Set the clock with `adb root`, then `adb shell "date 011010002027.00"` (format MMDDhhmmYYYY.ss). Automatic date and time must be off. Foreground the app after every clock change. |
| **Deep links** | `adb shell am start -a android.intent.action.VIEW -d "<url>" app.lettercrack` |

**Pass criteria for every step:**
- No crash, red box or blank screen.
- No raw string keys on screen (such as `badges.solves_10`).
- No word in a puzzle or title split across lines.
- Nothing in the app is for sale.

### Daily calendar for the seed (expected values)

The **Goals** column comes from `goalsFor(date)`. The **Teaser** column is what the Solved screen shows as *tomorrow's* teaser, using the *next* row's quote.

| Date | Day | # | Quote | Author (Library set) | Letters | Words · era | Today's goals | Reminder text variant |
|---|---|---|---|---|---|---|---|---|
| 01-10 | **Sun** | 10 | 90001 | Benjamin Franklin (Leaders) | 28 | 7 · 1700s | daily, clean, long | 1 "Inky found a 7-word quote for you today." |
| 01-11 | Mon | 11 | 90010 | Ralph Waldo Emerson (Essayists) | 46 | 9 · 1800s | daily, levels2, long | 2 "…Their name starts with R." |
| 01-12 | Tue | 12 | 90009 | Henry David Thoreau (Essayists) | 42 | 10 · 1800s | daily, letters150, levels2 | 3 "Your daily quote is ready to crack." |
| 01-13 | Wed | 13 | 90008 | Thoreau | 47 | 11 · 1800s | daily, levels3, long | 0 "Today's quote is ready: 11 words from the 1800s." |
| 01-14 | Thu | 14 | 90007 | Thoreau | 46 | 9 · 1800s | daily, clean, hard | 1 |
| 01-15 | Fri | 15 | 90006 | William Shakespeare (Playwrights) | 68 | 14 · 1600s | daily, hard, levels3 | 2 |
| 01-16 | Sat | 16 | 90005 | Shakespeare | 51 | 13 · 1600s | daily, levels2, letters150 | 3 |
| 01-17 | **Sun** | 17 | 90004 | Shakespeare | 32 | 9 · 1600s | daily, letters150, hard | 0 |
| 01-18 | Mon | 18 | 90003 | Shakespeare | 62 | 15 · 1600s | daily, hard, levels3 | 1 |
| 01-19 | Tue | 19 | 90002 | Franklin | 38 | 10 · 1700s | daily, hard, clean | 2 |
| 01-20 | Wed | 20 | 90001 | Franklin | 28 | 7 · 1700s | daily, clean, long | 3 |
| 01-21 | Thu | 21 | 90010 | Emerson | 46 | 9 · 1800s | (not needed) | 0 |
| 01-24 | **Sun** | 24 | 90007 | Thoreau | 46 | 9 · 1800s | (not needed) | 3 |

**What the goal names mean:**
- **daily:** "Solve today's quote".
- **clean:** "Solve one with no hints or checks".
- **long:** "Solve a long quote (60+ letters)".
- **levels2 / levels3:** "Solve 2 levels" / "Solve 3 levels".
- **letters150:** "Decode 150 letters".
- **hard:** "Solve a Hard or Expert quote".

**Rank thresholds** (XP = letters of each solved quote, counted once per quote):
- Rookie: 0.
- Apprentice: 500.
- Sleuth: 2,000.
- Cryptographer: 6,000.
- Cipher Master: 15,000.

The seed totals **1,463 XP**, so only Rookie and Apprentice can be reached (see "Not reachable with the seed").

---

## Journey overview

| Journey | Area | Steps | Clock |
|---|---|---|---|
| U0 | Upgrade from the previous build (v2 save → v4) | 7 | as it is |
| J1 | Fresh install, onboarding, new Home | 12 | 01-10 |
| J2 | Daily puzzle, input, hints, Solved screen (new cards) | 24 | 01-10 |
| J3 | Levels, difficulty sheet, chapters, big quote, rank, report | 24 | 01-10 → |
| J4 | Daily goals and the +1 hint reward | 9 | 01-10, 01-11 |
| J5 | Hint exhaustion and midnight refill | 6 | 01-10 → 01-11 |
| J6 | Streak, milestones, saved freezes, reminder, rewound clock | 16 | 01-11 → 01-24 |
| J7 | Archive and the monthly stamp book | 11 | 01-24 → 02-01 |
| J8 | Stats: rank, freezes, badge shelf | 10 | any |
| J9 | Library and author facts | 9 | any |
| J10 | Inky's wardrobe and time-of-day badges | 13 | any |
| J11 | Android home-screen widget | 9 | 01-10 → |
| J12 | Settings, About, notifications | 15 | any |
| J13 | Accessibility, text size, reduce motion, tablet | 12 | any |
| J14 | Resilience, deep links, data recovery, review prompt, reinstall | 11 | any |
| **Total** | | **188** | |

---

## U0: Upgrade from the previous build (v2 save → v4)

**Preconditions:**
- The emulator still has the previous build (`2f6a695` or older) with progress: solved quotes, a streak and hints.
- Back up first with `adb shell run-as app.lettercrack tar -cf /sdcard/lc-pre.tar files`. `e2e/state/lc-mmkv.tar` is the v1 run's save, and can be restored into the old build to recreate it.

| # | Step | Expected |
|---|---|---|
| U.1 | Note on the old build: the streak, best streak, solved count, hints left, current level and an in-progress puzzle. | Recorded for comparison. |
| U.2 | Install the new APK **over** the old one (`adb install -r`). Do not uninstall. Launch. | **Home** opens; no onboarding. No "restored from a backup" line (the migration succeeded). |
| U.3 | Compare with U.1. | Streak, best, Stats "N quotes solved", level number and hints are unchanged. The in-progress puzzle reopens with the same letters. |
| U.4 | New Home cards. | "Today's goals" (0 of 3 done unless today's daily is already solved). "Codebreaker rank" shows the rank for the existing XP. Library and Wardrobe tiles are present. |
| U.5 | Open Stats → Badges. | Every badge the existing progress qualifies for is already earned on its first launch: First crack, Daily decoder, streak badges up to the best streak, Time traveller if an archive day was solved. Each shows "New" once. |
| U.6 | Wardrobe tile. | "New" dot if the migration unlocked items (e.g. Starry sky from a past clean solve). Inky still wears the monocle. |
| U.7 | If the old streak was 7 or more: Stats streak card. | "1 saved streak freeze" (milestones passed before v3 are credited once). |

Then **uninstall** the app before J1.

---

## J1: Fresh install, onboarding and Home

**Preconditions:** the app is not installed, and the clock is at **2027-01-10 10:00** (a Sunday).

| # | Step | Expected |
|---|---|---|
| 1.1 | Install and launch. | Splash, then **Onboarding**: Inky waving, "Welcome to LetterCrack", the task box with the "animal that purrs" hint, a 2-word A CAT board, the A–Z keyboard and "Skip". No permission prompt, consent dialog or ad. |
| 1.2 | Solve A CAT. | The letters fill every matching cell. The box turns green with "You've got it.", Inky cheers, and "Next puzzle" appears. |
| 1.3 | Tap "Next puzzle". | "How tricky should puzzles be?" with four tiles (Medium selected) and "Start playing". |
| 1.4 | Pick **Hard** → "Start playing". | **Home**. The hero has "Sunday, 10 January", "Good morning, codebreaker!" (before 12:00), the gear button, Inky waving with the monocle, and the bubble "Today's quote is ready. Let's crack it!". No streak tag. |
| 1.5 | Today card. | Tags: "TODAY'S QUOTE", **"Sunday special"** (star), "Hard", "28 letters". Coloured cipher tiles, "A new quote is waiting to be decoded." and "Crack it". |
| 1.6 | "Today's goals" card. | Three rows: "Solve today's quote 0/1", "Solve one with no hints or checks 0/1", "Solve a long quote (60+ letters) 0/1", and the caption "Finish all three for +1 hint". |
| 1.7 | "Codebreaker rank" card. | "Rookie", "0 letters decoded", "500 letters to Apprentice", empty progress bar. |
| 1.8 | Levels card. | "Levels" with tag "Level 1". A chapter strip (book icon) "Chapter 1 · Quill Meadow", "Level 1 of 10". The path has node 1 pulsing and later nodes locked. "Continue level 1". |
| 1.9 | Tiles. | "Archive · 9 to play", "Stats · 0 quotes solved", "Library · 0 of 18 authors", "Inky's wardrobe · 1 item unlocked" (no "New" dot). |
| 1.10 | Set the clock to 14:00 and foreground; then 19:00. | Greeting "Good afternoon, codebreaker!", then "Good evening, codebreaker!". The title never splits a word. Set it back to 10:00. |
| 1.11 | Kill and relaunch. | Opens straight on Home. |
| 1.12 | Switch the OS to dark mode and back. | Every card, including Goals, Rank, the chapter strip and the new tiles, follows the theme; status bar icons invert. |

---

## J2: Daily puzzle: input, hints, wrong answers, solve, Solved screen

**Preconditions:** J1 is done, on 01-10. The answer key for 90001 is ready.

| # | Step | Expected |
|---|---|---|
| 2.1 | Tap "Crack it". | Puzzle: back button, "Daily quote", chip "Hard" (1 given), progress ring, "⋯" menu. The board; Inky with a tip that is never the answer; the hint bar has "Reveal", "Check" (disabled until you type a letter; givens and revealed letters don't count) and "5 hints left". |
| 2.2 | Word wrapping. | No word split across lines; cipher and guess letters line up. |
| 2.3 | Tap an empty cell. | It and every cell with the same cipher letter highlight. |
| 2.4 | Tap the given cell. | Nothing; givens are locked. |
| 2.5 | Type a letter. | It fills every cell of that cipher letter; selection advances; the ring rises; the key dims but stays tappable. |
| 2.6 | **Word hop:** fill the last empty cell of a word. | That word hops once (small lift and scale). It reacts to filling, not to correctness; refilling or erasing does not hop again until the word is complete again. |
| 2.7 | Type the same letter for a different cipher letter. | Both groups show conflict flags; "Check" enables. |
| 2.8 | Select one conflicting group, tap ⌫. | It clears everywhere; both conflict flags go. |
| 2.9 | Enter a wrong letter, tap "Check". | Wrong cells are flagged; "4 hints left". |
| 2.10 | Type the right letter over it. | The wrong flag clears. |
| 2.11 | Tap "Reveal". | One letter fills everywhere and locks; "3 hints left". |
| 2.12 | Fill the board with one letter still wrong. | "Almost! The highlighted letters aren't right yet." The ring shows 100%; no hint is charged; no fail state. |
| 2.13 | Back. | Home: bubble "Your quote is waiting right where you left it.", text "You're partway through today's quote.", "Continue". Goals still 0/3. |
| 2.14 | "Continue". | Same entries, flags, revealed letters, "3 hints left". |
| 2.15 | Correct the last letter. | The letters flip, then **Solved** replaces the puzzle (back doesn't return to it). |
| 2.16 | Solved header. | Confetti, rays, Inky cheering (wearing the monocle), coral seal, "Cracked it!". Tags: "Streak: 1 day", **"Sunday special"**, **"New author for your Library!"**. No "Clean solve" tag. |
| 2.17 | **New awards card.** | "New badges!" with 3 medals: **First crack, Up for a challenge, Daily decoder**, then "and 2 more" (Full shelf, Sunday special). A note "New outfit for Inky! Grand sash" (Franklin completes the Leaders shelf) and the button "Open the wardrobe". No "New rank". |
| 2.18 | Quote stack and author card. | "SOLVED", the quote, Franklin's medal, "Work, Year". The author card has name, dates, bio and a yellow **"Did you know?"** box with Franklin's fact. |
| 2.19 | Goals card on Solved. | "Solve today's quote" ✓ "Done!"; the other two 0/1. |
| 2.20 | **Tomorrow's teaser.** | "Tomorrow's quote: 9 words from the 1800s, by an author whose name starts with R." and the tag "Ready tomorrow". No words of the quote are shown. |
| 2.21 | Buttons. | "Play a level", **"Share result"**, then "Share" and "Home". No reminder card (it needs 2 daily solves). No ad. |
| 2.22 | "Share result". | The share sheet carries the text "LetterCrack #10: I cracked today's quote on Hard" and, on the next line, "Can you crack it?". There is no clean or streak part (the streak is 1). No quote words. |
| 2.23 | "Share". | The share sheet with a PNG card (quote, author, "Solved on LetterCrack · lettercrack.app"). With no target, the alert "Sharing isn't available right now." No crash. |
| 2.24 | "Home", then "See today's quote". | Home: flame "1-day streak", bubble "Nice work today!…", "Solved. A new quote arrives tomorrow.", goals 1/3, Stats "1 quote solved", Library "1 of 18 authors", Wardrobe "2 items unlocked" with a **"New"** dot. "See today's quote" reopens Solved **without** the streak tag, awards card or goals card; the teaser and "Share result" stay. "Home". |

---

## J3: Levels: difficulty sheet, chapters, big quote, rank, report, run-out

**Preconditions:** J2 is done. Solve by hand until 3.14. From 3.15, the **[LR]** E2E bundle may be used.

| # | Step | Expected |
|---|---|---|
| 3.1 | "Continue level 1". | "Level 1", chip "Hard", 1 given, "3 hints left", not the daily quote. |
| 3.2 | Tap the chip. | The "Difficulty" sheet: four chips (Hard selected), the note "Changing the difficulty restarts this puzzle.", "Cancel" and "Restart" (disabled on Hard). |
| 3.3 | Pick Medium → Cancel. | No change. |
| 3.4 | Open the sheet, tap outside the card. | It closes; no change. |
| 3.5 | Type 2 letters → sheet → Expert → Restart. | Same quote, 0 givens, letters gone, ring 0%, chip "Expert". |
| 3.6 | Sheet → Easy → Restart. | 3–4 givens, chip "Easy". |
| 3.7 | Back → "Continue level 1". | Reopens at Easy (persisted). |
| 3.8 | Type 3 letters, force-kill, relaunch, "Continue level 1". | Same entries, Easy, "3 hints left". |
| 3.9 | Solve Level 1 with no Reveal and no Check. | Tags "Clean solve: no hints, no checks" and "New author…". Awards: "New badge!" **Clean solve**, plus the outfit note "Starry sky". The goals card shows "Solve one with no hints or checks" ✓. The button reads "Next puzzle". No "Share result" (it's only for today's daily) and no teaser. |
| 3.10 | "Next puzzle". | Straight to "Level 2", a new quote, chip back to "Hard". No ad. |
| 3.11 | Back. | Home: "Level 2", "Level 2 of 10", node 1 ticked, node 2 pulsing. Stats "2 quotes solved". |
| 3.12 | Solve levels until one has **60+ letters** (on the solve that finishes the third goal). | Solved: "All of today's goals done! +1 hint" on the goals card, and the badge **Goal getter**. On Home the goals card reads "All done today. You earned +1 hint!". |
| 3.13 | On the next level, tap "⋯". | "Report this quote?" with the "hidden on this device… Nothing is sent now." body, and "Cancel" / "Report and hide". |
| 3.14 | Cancel; reopen; "Report and hide". | Jumps to the next level with a new quote. Home's level number advanced; the reported quote never comes back. |
| 3.15 | Keep solving. Each time watch the Rank card. | XP rises by the quote's letters. When it reaches **500**: Solved shows **"New rank: Apprentice!"** and the outfit note "Painter's beret". The Home Rank card shows "Apprentice" and "N letters to Sleuth". |
| 3.16 | Reach **Level 10** on Home. | The chapter strip reads **"Big quote level"** instead of "Level 10 of 10". |
| 3.17 | Open Level 10. | A long quote from the Expert-length band (e.g. 90012 Austen 92 letters or 90018 Twain 87 letters, if still unsolved; otherwise any unseen quote), whatever the default difficulty. |
| 3.18 | Solve Level 10. | Tag **"Chapter 1 stamped!"**; badge **First chapter**. |
| 3.19 | Home. | "Level 11", **"Chapter 2 · Lantern Lane"** in new colours, "Level 1 of 10"; the path restarts. |
| 3.20 | Settings → Default difficulty **Expert**; solve levels 11–20 (**[LR]** allowed). | Each starts with 0 givens. Badges: **Expert cracker** at the first, **Master of keys** at the tenth Expert solve; **1,000 letters** when XP ≥ 1,000; **Bookworm** at 10 authors. Level 20 is a big quote; "Chapter 2 stamped!". |
| 3.21 | Home after level 20 (all 20 level quotes solved or reported). | Once every level quote is used, the next level repeats the oldest one (hard rule 6: no repeats until the pool is exhausted). "You've decoded every quote. New ones arrive with updates." shows only when no eligible quote is left (all reported). No crash. |
| 3.22 | Double-tap "Next puzzle" quickly on any Solved screen (before 3.21). | Only one navigation. |
| 3.23 | Set the default difficulty back to Hard. | Saved. |
| 3.24 | Throughout J3: hard rule 2. | No ad, interstitial or "watch to earn" offer anywhere. |

---

## J4: Daily goals and the +1 hint reward

**Preconditions:** J3.12 earned the 01-10 reward.

| # | Step | Expected |
|---|---|---|
| 4.1 | On 01-10 after the reward, solve another level. | The goals card doesn't grant a second hint; it still reads "All done today…". The hint count rises by nothing. |
| 4.2 | Note the hint count, then set the clock to **2027-01-11 10:00**. Foreground. | Home goals reset: "Solve today's quote", "Solve 2 levels", "Solve a long quote (60+ letters)", all at 0. No penalty, no carry-over. |
| 4.3 | Hints. | 5 free hints for the new day **plus** the saved +1 bonus (it never expires). |
| 4.4 | Solve one level. | "Solve 2 levels 1/2", with "Done!" not shown yet. |
| 4.5 | TalkBack on the goals card. | Each row reads "Solve 2 levels: 1 of 2"; a finished row reads "…: done". |
| 4.6 | Solve the 01-11 daily. | "Solve today's quote" ✓. |
| 4.7 | Solve a second level. | "Solve 2 levels" ✓; if one of these had 60+ letters, the "long" goal is ✓ too and the reward fires ("+1 hint"). Otherwise solve until a 60+ letter quote is done. |
| 4.8 | An **archive** daily never counts for "Solve today's quote". | Checked in J7.4: the goal stays as it was. |
| 4.9 | Rewind the clock to 01-10. | Goals show 01-10's set. No reward is granted twice for a day. Restore 01-11. |

---

## J5: Hint exhaustion and midnight refill

| # | Step | Expected |
|---|---|---|
| 5.1 | In an open level, tap "Reveal" until the counter reaches 0 (free hints first, then any saved bonus). | Each Reveal decrements. At 0: "No hints left today. Free hints refill at midnight." Both buttons are disabled. |
| 5.2 | Tap the disabled buttons. | Nothing; no rewarded-ad offer. |
| 5.3 | Kill, relaunch, reopen. | Still 0. |
| 5.4 | Advance the clock one day and foreground. | "5 hints left". |
| 5.5 | Erase all letters → "Check". | "Type some letters first."; the counter is unchanged. |
| 5.6 | Set the clock back to the J6 start date (01-11, if the clock moved). | The app works. The rewound-clock guard is covered in J6. |

---

## J6: Streak, milestones, saved freezes, reminder offer, rewound clock

**Preconditions:** 01-10 and 01-11 dailies solved (streak 2 after J4.6). Foreground after every clock change.

| # | Step | Expected |
|---|---|---|
| 6.1 | The 01-11 Solved screen (from J4.6). | "Streak: 2 days" and the reminder card "Want a nudge tomorrow?" with "Remind me" / "No thanks". The teaser reads "10 words from the 1800s, by… H". |
| 6.2 | "Remind me". | The Android 13+ permission dialog; allow. The card disappears; Settings shows "Daily reminder" on. |
| 6.3 | **01-12:** solve the daily cleanly. | "Streak: 3 days" and the **milestone card "3-day streak!"** with "Inky is proud of you…" and **no** freeze note. Badge **Warming up**. "Share result" reads "LetterCrack #12: I cracked today's quote on Hard · with no hints · 3-day streak". |
| 6.4 | **01-13 to 01-15:** solve each daily. | Streaks 4, 5, 6; no milestone card (4–6 aren't milestones). |
| 6.5 | **01-16:** solve. | Milestone **"7-day streak!"** with the note "Inky gave you a streak freeze…". Badge **One week**; the outfit note **Party hat**. |
| 6.6 | Stats. | The streak card shows "7", "best 7" and **"1 saved streak freeze"**. |
| 6.7 | **01-17 (Sunday):** solve. | "Streak: 8 days", tag "Sunday special". Badge **Perfect week** (Mon 01-11 to Sun 01-17 all solved on their own day). No milestone card. |
| 6.8 | **01-19** (skip 01-18): Home before solving. | The hero still shows "8-day streak" (bridgeable). |
| 6.9 | Solve 01-19. | "Streak: 9 days" and "A streak freeze covered a missed day, so your streak is safe." (the weekly freeze for W03). Saved freezes still 1. |
| 6.10 | **01-21** (skip 01-20): solve. | "Streak: 10 days" and the freeze message (the weekly freeze is used, so the **saved** one is spent). Stats: the saved-freeze line is gone (0). |
| 6.11 | **01-24 (Sunday)** (skip 01-22 and 01-23): Home. | The streak tag is gone (2 missed days can't be bridged). |
| 6.12 | Solve 01-24. | "Streak: 1 day". Best stays 10. Badges already earned stay earned. |
| 6.13 | Set the clock **back** to 01-23. Foreground and solve that daily. | **No** streak tag, no streak credit (the clock went backwards); the card still shows "Solved." |
| 6.14 | Set the clock forward 30 days (02-23), then back to 01-24. | Home works; no crash. |
| 6.15 | **Reminder text:** with the reminder on and the clock at 08:58 on a day whose daily is unsolved, wait past 09:00. | Notification "LetterCrack" with that date's variant from the calendar table (e.g. 01-13: "Today's quote is ready: 11 words from the 1800s."). No quote words; no "your streak is waiting" wording. |
| 6.16 | Solve that day's daily, then set the clock past 09:00 again the same day. | No further reminder that day. |

---

## J7: Archive and the monthly stamp book

**Preconditions:** J6 is done; the clock is at 01-24.

| # | Step | Expected |
|---|---|---|
| 7.1 | The "Archive" tile. | The "Archive" hero, Inky thinking, the intro, and tags "N solved / N started / N to play". The "January 2027" card has the Monday-first grid from 1 Jan to yesterday, with solved days marked by a dot. |
| 7.2 | Stamp tag on the month header. | "N of 31 stamps", where N is the number of January dailies solved (on the day or later). |
| 7.3 | Tap 2 Jan, type one letter, back. | 2 Jan shows a ring; "1 started". |
| 7.4 | Reopen 2 Jan and solve it. | No streak tag; "Back to archive"; no "Share result" or teaser. Badge **Time traveller**. Today's "Solve today's quote" goal is unchanged. The stamp count is +1. |
| 7.5 | Tap 2 Jan again. | Solved opens read-only with "Back to archive". |
| 7.6 | Solve **3 Jan** (a Sunday) from the archive. | Tag "Sunday special". With 01-10, 01-17 and 01-24 already solved, this is the 4th Sunday: badge **Sunday regular**. |
| 7.7 | Home. | Archive "N to play" is down by 2; the hero streak is unchanged. |
| 7.8 | **[LR]** Set the clock to **2027-02-01**. In the Archive, solve every remaining January day. | When the last January day is solved: Solved shows badges **Full month** (and **Regular** once 30 dailies are solved), and the outfit note **Gold medal**. |
| 7.9 | Archive. | The January header shows the tag **"Full month! Medal earned."** (trophy). February has no stamp tag, or "0 of 28 stamps". |
| 7.10 | TalkBack: focus a day and the stamp tag. | A day reads "2 January, solved" / "in progress" / "not solved yet"; the tag reads "January 2027: 31 of 31 days stamped". |
| 7.11 | Daily wrap-around: 01-11 shows quote 90010 again (as on 01-01). | It plays as a separate daily (its own date key); a solve on one date doesn't mark the other date solved. XP for 90010 is counted once. |

---

## J8: Stats: rank, freezes, badge shelf

| # | Step | Expected |
|---|---|---|
| 8.1 | The "Stats" tile. | The "Stats" hero; the streak card (flame, number, "day streak · best N", 7-day row, saved-freeze line only when > 0). |
| 8.2 | Tiles and rows. | "Puzzles solved" = all solved quotes; "Clean solves" % and ring; "Daily quotes solved"; "Best streak: N days"; no "Average solve time" (timer off). |
| 8.3 | "Each week" chart. | Six bars matching the solves per week; the hint "…last 6 weeks." |
| 8.4 | "Favorite authors". | A podium of up to 3 authors with "N quotes". |
| 8.5 | **Rank card.** | The same rank, XP and "N letters to …" as Home. At Apprentice the bar shows progress toward Sleuth. |
| 8.6 | **Badges shelf.** | "Badges" with "N of 36". Groups in order: Solving, Skill, Streaks, Collecting, Moments. Earned medals are in colour; locked ones are grey. |
| 8.7 | TalkBack on badges. | Earned: "<name>. <how> Earned <date>". Locked: "<name>. Locked: <how>" (e.g. "Locked: Solve 50 quotes."). |
| 8.8 | "New" markers. | Badges earned since the last visit show "New" once; on leaving and reopening Stats they're gone. Wardrobe items are not marked seen here. |
| 8.9 | Badges are kept forever. | After the streak reset (J6.12) every streak badge is still earned. |
| 8.10 | Timer: Settings → "Show solve time" on → solve one level → Stats. | "Average solve time" mm:ss appears; Solved shows "Solved in m:ss"; the puzzle timer pauses while backgrounded. Turn it off again. |

---

## J9: Library and author facts

| # | Step | Expected |
|---|---|---|
| 9.1 | The "Library" tile. | The "Library" hero with tag "N of 18 authors" and the intro "Every quote you solve adds its author…". |
| 9.2 | Shelves. | Five cards, in this order: **Poets (6), Novelists (6), Playwrights (2), Leaders (1), Essayists (3)**. Thinkers and Scientists aren't shown (no seed authors). Each card has a count "n/total" and a progress bar. |
| 9.3 | Reward lines. | Unfinished: "Reward: Laurel wreath" (Poets), "Reading glasses" (Novelists), "Stage ruff" (Playwrights), "Bookshelf" (Essayists). Finished: "Shelf complete · Grand sash" (Leaders) with a check. |
| 9.4 | Author tiles. | Met authors are shown, A–Z within the shelf. Unmet tiles are blank; TalkBack reads "An author you haven't met yet", and tapping does nothing. |
| 9.5 | Tap a met author (e.g. Franklin). | It's selected; the detail panel shows the name, dates and "Did you know?" with the fact (bio if there is no fact). TalkBack reads "Benjamin Franklin, 1706–1790. <fact>". |
| 9.6 | Tap another met author. | The selection moves; one detail at a time. |
| 9.7 | Finish a shelf (e.g. solve Wilde's level quote with Shakespeare already met → Playwrights 2/2). | Solved shows the outfit note "Stage ruff". The Library card reads "Shelf complete · Stage ruff". |
| 9.8 | Facts on Solved. | Every one of the 18 authors' Solved author cards has a "Did you know?" box. |
| 9.9 | Home Library tile. | Matches the hero count. |

---

## J10: Inky's wardrobe and time-of-day badges

| # | Step | Expected |
|---|---|---|
| 10.1 | The Home tile with the "New" dot → the Wardrobe. | The "Inky's wardrobe" hero; a large Inky in the current outfit; the intro "Earn outfits by playing… Nothing here is for sale." |
| 10.2 | Sections. | Hats (7), Glasses (4), Neckwear (5), Backdrops (5). Each section starts with a "None" tile, except Glasses: Inky always wears glasses. |
| 10.3 | Locked items. | Faded, with captions such as "Reach the Sleuth rank", "Earn the One month badge" and "Collect every author in Thinkers". |
| 10.4 | Brass monocle. | Unlocked, with the caption "Always yours"; worn by default ("Wearing"). |
| 10.5 | "New" markers. | Items unlocked since the last visit show "New"; after about 1.5 s on screen they're seen. Leave and reopen: no "New"; the Home dot is gone. |
| 10.6 | Tap **Painter's beret**. | Inky wears it at once; the tile reads "Wearing"; the previous hat goes back to "Wear". |
| 10.7 | Neckwear → **Grand sash**; Backdrops → **Starry sky**; Glasses → **Reading glasses**. | The preview shows all three, with reading glasses instead of the monocle. |
| 10.8 | Tap a locked item. | Nothing changes (locked items can't be worn). |
| 10.9 | Back to Home and solve something. | Home's Inky and Solved's Inky wear the same outfit. |
| 10.10 | Kill and relaunch. | The outfit is kept. |
| 10.11 | **Night owl:** set the clock to **22:30**, solve any level or archive day. | Badge **Night owl** and the outfit note **Star shades**. |
| 10.12 | **Early bird:** set the clock to **05:30**, solve another. | Badge **Early bird** and the outfit note **Sunrise**. At 04:30 neither badge would fire. |
| 10.13 | TalkBack on items. | "<item>. Wearing" / "<item>. Wear" / "<item>. Locked: <how>". |

---

## J11: Android home-screen widget

| # | Step | Expected |
|---|---|---|
| 11.1 | Long-press the launcher → Widgets → LetterCrack; add it. | A widget about 180×110 dp: "LetterCrack", the start of today's quote **in code**, and the status line. |
| 11.2 | 01-10 before the daily (fresh state). | The cipher matches the Home tiles; "Tap to crack today's quote"; no streak line. |
| 11.3 | Tap the widget. | The app opens (Home). |
| 11.4 | Solve the daily, go to the launcher (wait about 2 s). | "Solved ✓ See you tomorrow" and "1-day streak". |
| 11.5 | Advance the clock past midnight **without opening the app**. Wait for the widget to update (up to 30 min, or reboot the launcher). | The next day's cipher and "Tap to crack today's quote"; the streak still shows (bridgeable). |
| 11.6 | Advance 8+ days without opening the app. | "A new quote is ready" (beyond the 7-day snapshot); no crash and no stale "Solved". |
| 11.7 | Open the app. | The widget refreshes to today. |
| 11.8 | Dark mode and a large font. | The widget text stays inside its pill and background. |
| 11.9 | Remove the widget, then add it again. | It works; no crash on remove. |

---

## J12: Settings, About and notifications

| # | Step | Expected |
|---|---|---|
| 12.1 | Gear on Home. | The "Settings" hero with "Make LetterCrack yours.", and the sections PLAY / LOOK AND FEEL / ABOUT. No "Restore purchases". The footer shows "Version 1.0.0". |
| 12.2 | "Fill every matching letter" off → type in a level. | Only the selected cell fills. Turn it back on. |
| 12.3 | "Highlight conflicts" off. | No conflict flags. On: they return at once. |
| 12.4 | "Default difficulty" Easy → a new level. | 3–4 givens. The Home Today tag shows the default for an unstarted daily. |
| 12.5 | "Show solve time". | Covered in J8.10. |
| 12.6 | "Text size" 1–4. | The whole app scales, including the Goals, Rank, Library, Wardrobe and badge shelf. Titles never split a word. The keyboard keeps its height. |
| 12.7 | "Appearance" Dark / Light / Device. | Immediate; "Device" follows the OS. |
| 12.8 | "High contrast". | Thicker borders and higher contrast; cell states stay distinct; badge and wardrobe locked/unlocked states stay distinct. |
| 12.9 | "Sound effects" / "Haptics". | Toggle without error; key click and solve chime when on. |
| 12.10 | "Daily reminder" on. | The permission prompt if needed; if denied, the toggle snaps back. Off cancels pending reminders. |
| 12.11 | Reminder declined path: fresh state where the offer appears (or J14.11 reinstall), "Remind me" → **Deny**. | The alert "Notifications are off for LetterCrack. You can turn them on in your device settings."; the toggle stays off; the offer doesn't appear again. |
| 12.12 | "About our quotes". | The "About our quotes" hero and four paragraphs; back works. |
| 12.13 | "Send feedback". | The mail app with subject "LetterCrack feedback" and a body with the version, DB version and the reported quote from J3.14. No mail app: no crash. |
| 12.14 | "Privacy policy" / "Terms of use". | The browser opens the configured URLs; no crash without one. |
| 12.15 | Kill and relaunch. | Every setting is kept. |

---

## J13: Accessibility, text size, reduce motion, tablet

| # | Step | Expected |
|---|---|---|
| 13.1 | OS font maximum and in-app Size 4: puzzle. | The board scrolls; no word split; the keyboard has a fixed height; the hint bar wraps; the header title truncates. |
| 13.2 | Same size: Home. | The greeting shrinks to fit ("codebreaker!" on one line); the Goals rows wrap cleanly; the Rank text isn't clipped; the chapter strip and tiles are readable. |
| 13.3 | Same size: Solved with awards, milestone, goals and teaser cards. | Everything wraps and scrolls; badge names show up to 2 lines; "Cracked it!" wraps between words only. |
| 13.4 | Same size: Stats badge shelf, Library and Wardrobe. | Grids reflow; no clipped captions. |
| 13.5 | TalkBack: puzzle (on an emulator, check the accessibility labels; spoken output needs a device). | Cells read "cipher X, guess Y" / "empty", plus "given", "conflict" and "marked wrong". Keys read; ⌫ reads "Delete". The ring reads "N of M letters filled"; the menu reads "Report this quote". |
| 13.6 | TalkBack: solve (as 13.5). | "Solved!" is announced; the title reads "Cracked it!". The awards card reads each badge name and how it was earned; the author card reads the "Did you know?" fact. |
| 13.7 | TalkBack: Home. | The goals, rank ("Rank: Apprentice. N letters decoded. …"), chapter and tiles (with "New") read correctly. |
| 13.8 | Reduce Motion (Android "Remove animations"). | No entrance pops, pulsing node or **word hop**. On solve the board fades. Confetti and rays are still or absent. Home tiles, Stats charts, the badge shelf and wardrobe items are all **visible** (no content hidden behind animations). |
| 13.9 | Touch targets. | Keys, cells, chips, round header buttons, archive days, tiles, goal rows, wardrobe items, Library author tiles and badge medals are ≥ 44 pt. Hint, Check and "e2e" buttons too. |
| 13.10 | Tablet AVD, portrait and landscape. | The app rotates, with no letterboxing. Home, puzzle, Solved, Stats, Library and Wardrobe stay centred at their max widths; rotating mid-puzzle keeps the entries. |
| 13.11 | Hardware keyboard in the puzzle and onboarding. | Letters, Backspace and the arrow keys work. |
| 13.12 | Dark mode with high contrast on the puzzle, Solved and Wardrobe. | All states remain distinguishable. |

---

## J14: Resilience, deep links, data recovery, review prompt, reinstall

| # | Step | Expected |
|---|---|---|
| 14.1 | Background mid-puzzle for 1 minute. | Exact state on return; the timer didn't run. |
| 14.2 | Rotate, notification shade, or an incoming call (emulator extended controls) mid-puzzle. | The state survives. |
| 14.3 | Type 10 keys in about 1 s. | One letter per tap; the word hop doesn't drop or double input. |
| 14.4 | Solve a puzzle, then background the app within 1 s (before the Solved screen). | On return: the Solved screen or Home. Progress, goals, badges and the streak are recorded once (no double award, no double hint). |
| 14.5 | Midnight during a puzzle: open the daily at 23:59, solve at 00:01. | The solve counts for the puzzle's date (now an archive day): no streak credit for the new day; "Solve today's quote" isn't ticked for the new day. |
| 14.6 | Review prompt: install date ≥ 2 days ago, 3rd clean solve. | The review is requested about 1.2 s after Solved (on an emulator without Play it silently does nothing). It isn't asked again within 30 days. |
| 14.7 | Data recovery: `adb shell run-as app.lettercrack`, overwrite the main MMKV file with junk (keep the backup), relaunch. | Home shows "We restored your saved progress from a backup."; progress, streak, hints, badges, outfit and goals are intact. |
| 14.8 | Deep links: `lettercrack://puzzle/level%3A1`, `…/puzzle/daily%3A2099-01-01`, `…/puzzle/garbage`, `lettercrack://solved?key=level%3A1`. | "This puzzle isn't available." with "Go home" / "Home"; no crash. |
| 14.9 | `lettercrack://puzzle/daily%3A2027-01-05`. | Opens that archive daily. |
| 14.10 | `lettercrack://wardrobe`, `lettercrack://library`, `lettercrack://stats`. | Each screen opens; back goes to Home (or closes); no crash. |
| 14.11 | Uninstall, reinstall, launch. | Onboarding again, with a clean state: no badges, Rookie, monocle only, Library 0 of 18. |

---

## Not reachable with the seed (verified by unit tests instead)

| Item | Why | Covered by |
|---|---|---|
| Ranks Sleuth, Cryptographer and Cipher Master; Detective cap, Top hat and Crown | The seed totals only 1,463 XP | `src/engine/__tests__/rank.test.ts`, `wardrobe.test.ts` |
| Half a hundred, Century and Quote collector; Bow tie; Sharp eye; Hearts | 30 quotes in total, so 30 solves at most | `badges.test.ts` |
| 5,000 and 20,000 letters; Librarian (25 authors); Storyteller (5 chapters) | Only 18 authors and 20 levels (2 chapters) | `badges.test.ts`, `chapters.test.ts` |
| Marathon and Long and clean | The longest seed quote has 92 letters | `badges.test.ts` |
| Thinkers and Scientists shelves; Mortarboard and Lab goggles | No seed authors in those sets | `awards.test.ts` |
| One month, Hundred days and A whole year; Cosy scarf; Confetti; freeze milestones at 30 and 100 | Reachable only by walking the clock 30 to 365 days. One month is optional **[LR]**. | `streak.test.ts` |

## Blocked (switches off or platform)

| Area | Why blocked | When unblocked |
|---|---|---|
| Shop, Restore purchases, hint packs | `payments` is off | Prices from the store, Restore, failures never block play, free hints drop to 2 a day |
| Interstitials and rewarded hints | `ads` is off | Only after Next; never in the first 3 puzzles or on dailies; at most 1 per 2 solves and 1 per 4 min; muted; rewarded +1 |
| iCloud merge (badges are a union, keeping the earliest date; freezes take the max) | iOS only | Two devices |
| iOS widget (WidgetKit) | Not built yet | Same cases as J11 |
| Real quote DB | Editorial review is pending, including the author facts flagged in `DEVELOPMENT_PLAN.md` §13 | `quotes:validate` passes; no seed IDs ship |

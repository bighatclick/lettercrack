# Screenshots

Five screenshots, same order on iPhone 6.9", iPad 13" and Play phone. Only public-domain authors appear (no living or modern authors). Captions exactly as below (spec §2).

| # | Caption | Screen | Content |
|---|---|---|---|
| 1 | Decode a timeless quote every day | Puzzle, daily, about half solved | A Franklin or Twain daily, Medium |
| 2 | No timers. No lives. Solve at your own pace. | Puzzle with the keyboard and hint bar | Calm, partly filled board |
| 3 | Meet the author behind every quote | Solved screen with the author card | Jane Austen or Thoreau |
| 4 | Big, clear letters, easy on the eyes | Puzzle at text size 4 in dark mode | Same quote as 1 |
| 5 | Your streak and progress, safely backed up | Stats screen | Streak 12, longest 30, three favorite authors |

Capture: run an E2E build on a simulator, use `e2e-solve` to set up solved states, and take shots with Maestro `takeScreenshot` or the simulator. Frame them in brand colours (cream #FFF8EC, violet #6D3FE0, sunny #FFC93C, ink #1E1B3A).

## Drafts (Play phone)

`store/en/screenshots/draft-android/play-phone-1…5.png` are framed drafts made from the Android emulator with
`python tools/store/frame_screenshots.py <raw-dir> <out-dir>` (raw captures named 1.png … 5.png in caption order).
They are **not final**: they use the dev seed quotes (not the reviewed DB), show the dev-client button on the left
edge and a 1-day streak. Before submitting, retake them from a release or E2E build with the real quote DB and the
states listed above (Franklin or Twain daily, Austen or Thoreau author card, streak 12 / longest 30). iPhone and iPad
sets need the iOS build.

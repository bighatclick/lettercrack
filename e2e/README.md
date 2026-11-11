# End-to-end flows (Maestro)

Run against an E2E build, which adds a hidden "e2e solve" button to the puzzle screen:

```bash
EXPO_PUBLIC_E2E=1 npm run android:local -- release   # Android is always built on this laptop
maestro test e2e/
```

E2E builds also keep the endless animations still (Inky's bob, floating letters, pulses; see
`src/ui/fx/loops.ts`), because a screen that never goes idle stops Maestro and uiautomator from
reading it. One-off animations, such as entrances and the word hop, still run.

| Flow | Covers |
|---|---|
| `01-onboarding-daily-share-archive.yaml` | Onboarding → daily solve → share → archive (spec §14) |
| `02-kill-and-resume.yaml` | Kill and relaunch mid-puzzle restores the letter (F4) |

CI: `.github/workflows/ios.yml` builds an iOS simulator E2E app on a macOS runner and runs these flows on every push to main and every pull request. Android is not built in CI.

The spec's third flow (buy hints in a StoreKit test config) waits until the payments switch is turned on.

Flows match cells by their screen-reader label ("cipher K, guess Q"), so they work for any quote.

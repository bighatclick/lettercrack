# End-to-end flows (Maestro)

Run against an E2E build, which adds a hidden "e2e solve" button to the puzzle screen:

```bash
eas build --profile e2e -p android
maestro test e2e/
```

| Flow | Covers |
|---|---|
| `01-onboarding-daily-share-archive.yaml` | Onboarding → daily solve → share → archive (spec §14) |
| `02-kill-and-resume.yaml` | Kill and relaunch mid-puzzle restores the letter (F4) |

The spec's third flow (buy hints in a StoreKit test config) waits until the payments switch is turned on.

Flows match cells by their screen-reader label ("cipher K, guess Q"), so they work for any quote.

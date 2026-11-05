# Privacy labels (first release: ads and payments off)

## App Store: App Privacy

- **Data used to track you:** none.
- **Data linked to you:** none.
- **Data not linked to you:** Diagnostics › Crash data, only if a Sentry DSN is set for the build. Purpose: App functionality. If the build has no DSN, answer "Data not collected".
- **iCloud:** progress sync uses the player's own iCloud key-value store. Apple does not count this as collection by the developer.

No App Tracking Transparency prompt and no UMP consent form: this release shows no advertising.

## Google Play: Data safety

- **Data collected:** Crash logs (only with a Sentry DSN). Not shared, not linked to identity, processed ephemerally where possible, required for app functionality.
- **Data shared:** none.
- **Encrypted in transit:** yes (HTTPS to Sentry).
- **Deletion request:** not applicable (no account). Crash reports expire under Sentry retention.
- **Backup:** Android Auto Backup includes the progress file (MMKV).

## When ads or payments are turned on

Add: Identifiers (device ID for AdMob), Usage data (ad interactions), Purchases. Add the ATT and UMP prompts (spec §8). Update the privacy policy at lettercrack.app/privacy.

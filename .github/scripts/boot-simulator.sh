#!/usr/bin/env bash
# Boots the newest available iPhone simulator and installs the given .app.
set -euo pipefail
APP="$1"
UDID=$(xcrun simctl list devices available -j | python3 -c '
import json, sys, re
d = json.load(sys.stdin)["devices"]
runtimes = sorted((k for k in d if "iOS" in k), key=lambda k: [int(x) for x in re.findall(r"\d+", k)], reverse=True)
for rt in runtimes:
    phones = [x for x in d[rt] if x["name"].startswith("iPhone") and "SE" not in x["name"]]
    if phones:
        print(phones[-1]["udid"]); break
')
[ -n "$UDID" ] || { echo "No iPhone simulator available"; xcrun simctl list devices available; exit 1; }
xcrun simctl list devices | grep "$UDID"
xcrun simctl boot "$UDID" || true
xcrun simctl bootstatus "$UDID" -b
xcrun simctl install "$UDID" "$APP"
echo "SIM_UDID=$UDID" >> "${GITHUB_ENV:-/dev/null}"

#!/usr/bin/env bash
# Boots a simulator of the given kind on the newest iOS runtime and installs the app.
#   boot-simulator.sh <iphone|small|ipad> <path/to/App.app>
# Writes SIM_UDID and SIM_NAME to $GITHUB_ENV.
set -euo pipefail
KIND="$1"
APP="$2"
read -r UDID NAME < <(xcrun simctl list devices available -j | KIND="$KIND" python3 -c '
import json, os, re, sys
kind = os.environ["KIND"]
devices = json.load(sys.stdin)["devices"]
runtimes = sorted((k for k in devices if "iOS" in k), key=lambda k: [int(x) for x in re.findall(r"\d+", k)], reverse=True)
# Preference lists, best first. "small" is the smallest phone screen a runtime offers.
prefs = {
    "iphone": [r"^iPhone \d+ Pro$", r"^iPhone \d+$", r"^iPhone"],
    "small": [r"^iPhone SE", r"^iPhone \d+ mini$", r"^iPhone \d+e$", r"^iPhone \d+$"],
    "ipad": [r"^iPad \(", r"^iPad Air", r"^iPad Pro 11", r"^iPad"],
}[kind]
for rt in runtimes:
    names = devices[rt]
    for p in prefs:
        hits = [d for d in names if re.search(p, d["name"])]
        if hits:
            hits.sort(key=lambda d: d["name"])
            print(hits[-1]["udid"], hits[-1]["name"])
            sys.exit(0)
sys.exit(1)
') || { echo "No $KIND simulator available"; xcrun simctl list devices available; exit 1; }
echo "Using $NAME ($UDID)"
xcrun simctl boot "$UDID" || true
xcrun simctl bootstatus "$UDID" -b
# Steady status bar for screenshots; English, US region.
xcrun simctl status_bar "$UDID" override --time 9:41 --batteryState charged --batteryLevel 100 || true
xcrun simctl install "$UDID" "$APP"
{
  echo "SIM_UDID=$UDID"
  echo "SIM_NAME=$NAME"
} >> "${GITHUB_ENV:-/dev/null}"

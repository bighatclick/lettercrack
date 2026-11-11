#!/usr/bin/env bash
# Runs the iOS Maestro suite on a booted simulator, one flow at a time.
#
#   e2e/ios/run.sh <suite> <out-dir>
#   suite:   full (iPhone, every journey) | full-1 | full-2 | full-3 | tablet (iPad) | small (smallest iPhone)
#   needs:   SIM_UDID (the booted simulator), APP_PATH (the .app, for the update-in-place flow)
#
# Each flow starts from its own fresh install (common/start.yaml), so a failure never cascades.
# Some steps need the simulator itself (text size, dark mode, Reduce Motion, reinstalling the app,
# reading the screen's layout), which Maestro can't do, so they run here around the flow.
# Every flow runs even if an earlier one fails; the exit code is 1 if any failed.
set -uo pipefail

SUITE="${1:-full}"
OUT="$(mkdir -p "${2:-e2e-out}" && cd "${2:-e2e-out}" && pwd)"
HERE="$(cd "$(dirname "$0")" && pwd)"
: "${SIM_UDID:?SIM_UDID must be the booted simulator}"
mkdir -p "$OUT/junit" "$OUT/hierarchy"

case "$SUITE" in
  # The iPhone suite in three contiguous parts (CI runs them in parallel); 15-update-in-place-a
  # and -b must stay together and in order. `full` runs all of them in one go.
  full)
    FLOWS=(
      00-upgrade-v2-save
      00b-upgrade-every-schema
      01-onboarding-home
      01b-greetings-relaunch
      02-daily-puzzle-solved
      02b-share-sheets
      03-levels-difficulty
      03b-levels-goals-report
      03c-chapters-rank-expert
      04-goals-reward
      05-hints-refill
      06-streak-milestones-freezes
      06b-reminder-offer-allowed
      06c-reminder-offer-denied
      07-archive-stamps
      07b-archive-full-month
      08-stats-badges-timer
      09-library-facts
      10-wardrobe-outfits
      10b-time-of-day-badges
      12-settings
      12b-settings-links
      13-accessibility-labels
      13b-largest-text
      13c-dark-high-contrast
      13d-reduce-motion
      13e-touch-targets-home
      13f-touch-targets-puzzle
      14-resilience
      14b-midnight-during-puzzle
      14c-deep-links
      14d-data-recovery
      14e-install-on-any-date
      14f-reinstall-clean
      14g-review-prompt
      15-update-in-place-a
      15-update-in-place-b
      15b-open-across-midnight
      15c-long-gap
      15d-year-end-leap-day
      15e-numbers-agree
      16-sundays-rewound-reopen
      16b-real-clock
      17-icloud-restore
    )
    ;;
  full-1)
    # J0–J4
    FLOWS=(
      00-upgrade-v2-save
      00b-upgrade-every-schema
      01-onboarding-home
      01b-greetings-relaunch
      02-daily-puzzle-solved
      02b-share-sheets
      03-levels-difficulty
      03b-levels-goals-report
      03c-chapters-rank-expert
      04-goals-reward
    )
    ;;
  full-2)
    # J5–J13a
    FLOWS=(
      05-hints-refill
      06-streak-milestones-freezes
      06b-reminder-offer-allowed
      06c-reminder-offer-denied
      07-archive-stamps
      07b-archive-full-month
      08-stats-badges-timer
      09-library-facts
      10-wardrobe-outfits
      10b-time-of-day-badges
      12-settings
      12b-settings-links
      13-accessibility-labels
    )
    ;;
  full-3)
    # J13b–J17
    FLOWS=(
      13b-largest-text
      13c-dark-high-contrast
      13d-reduce-motion
      13e-touch-targets-home
      13f-touch-targets-puzzle
      14-resilience
      14b-midnight-during-puzzle
      14c-deep-links
      14d-data-recovery
      14e-install-on-any-date
      14f-reinstall-clean
      14g-review-prompt
      15-update-in-place-a
      15-update-in-place-b
      15b-open-across-midnight
      15c-long-gap
      15d-year-end-leap-day
      15e-numbers-agree
      16-sundays-rewound-reopen
      16b-real-clock
      17-icloud-restore
    )
    ;;
  tablet)
    FLOWS=(01-onboarding-home 02-daily-puzzle-solved 13g-tablet-rotation 13b-largest-text 13e-touch-targets-home)
    ;;
  small)
    FLOWS=(01-onboarding-home 02-daily-puzzle-solved 13b-largest-text 13e-touch-targets-home 13f-touch-targets-puzzle cross-platform-01 cross-platform-02)
    ;;
  *)
    echo "unknown suite $SUITE" >&2
    exit 2
    ;;
esac

# Flows that may not pass on a simulator for reasons outside the app; reported, never fatal.
BEST_EFFORT=" 13d-reduce-motion 14g-review-prompt 17-icloud-restore "

sim() { xcrun simctl "$@" || echo "simctl $* failed (continuing)"; }

before() {
  case "$1" in
    13b-largest-text) sim ui "$SIM_UDID" content_size accessibility-extra-extra-extra-large ;;
    13c-dark-high-contrast) sim ui "$SIM_UDID" appearance dark ;;
    13d-reduce-motion)
      sim spawn "$SIM_UDID" defaults write com.apple.Accessibility ReduceMotionEnabled -bool true
      sim spawn "$SIM_UDID" notifyutil -p com.apple.accessibility.reduce.motion.status
      ;;
    15-update-in-place-b)
      # Install the same build over the one the previous flow left with progress: an App Store update.
      sim install "$SIM_UDID" "${APP_PATH:?APP_PATH must be the .app}"
      ;;
  esac
}

after() {
  case "$1" in
    13b-largest-text) sim ui "$SIM_UDID" content_size large ;;
    13c-dark-high-contrast) sim ui "$SIM_UDID" appearance light ;;
    13d-reduce-motion)
      sim spawn "$SIM_UDID" defaults write com.apple.Accessibility ReduceMotionEnabled -bool false
      sim spawn "$SIM_UDID" notifyutil -p com.apple.accessibility.reduce.motion.status
      ;;
    13e-touch-targets-home | 13f-touch-targets-puzzle)
      # The flow leaves the app on the screen to measure.
      local dump="$OUT/hierarchy/$1.json"
      maestro --device "$SIM_UDID" hierarchy > "$dump" 2> "$dump.log" || return 1
      node "$HERE/tools/check-targets.mjs" "$dump" || return 1
      ;;
  esac
}

file_for() {
  case "$1" in
    cross-platform-01) echo "$HERE/../01-onboarding-daily-share-archive.yaml" ;;
    cross-platform-02) echo "$HERE/../02-kill-and-resume.yaml" ;;
    *) echo "$HERE/flows/$1.yaml" ;;
  esac
}

passed=()
failed=()
soft=()
for name in "${FLOWS[@]}"; do
  echo "::group::$name"
  before "$name"
  ok=1
  maestro --device "$SIM_UDID" test "$(file_for "$name")" \
    --format junit --output "$OUT/junit/$name.xml" \
    --test-output-dir "$OUT/$name" --debug-output "$OUT/$name/debug" || ok=0
  after "$name" || ok=0
  echo "::endgroup::"
  if [ $ok = 1 ]; then
    passed+=("$name")
  elif [[ "$BEST_EFFORT" == *" $name "* ]]; then
    soft+=("$name")
    echo "::warning title=$name::best-effort flow failed (see artifacts)"
  else
    failed+=("$name")
    echo "::error title=$name::flow failed (see artifacts)"
  fi
done

{
  echo "## iOS E2E ($SUITE)"
  echo
  echo "| Result | Count | Flows |"
  echo "|---|---:|---|"
  echo "| Passed | ${#passed[@]} | ${passed[*]:-} |"
  echo "| Failed | ${#failed[@]} | ${failed[*]:-} |"
  echo "| Best-effort failed | ${#soft[@]} | ${soft[*]:-} |"
} | tee "$OUT/summary.md" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"

[ ${#failed[@]} -eq 0 ]

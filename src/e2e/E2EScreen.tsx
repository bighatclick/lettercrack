/**
 * E2E builds only (see `app/e2e.tsx`). Maestro opens `lettercrack://e2e?…` to set up a test, then
 * restarts the app (`stopApp` + `launchApp`) so it starts from that state:
 *
 *   at=2027-01-10T10:00:00  move the test clock to this device-local time (it keeps ticking)
 *   real=1                  back to the real clock
 *   fresh=1                 wipe the save and its backup: the next launch is a fresh install
 *   seed=v1…v5              wipe, then write that old-schema save (the migration fixtures)
 *   corrupt=main            overwrite the main save with junk (the backup file is kept)
 *   lose=main               delete the main save (the backup file is kept)
 *   cloud=on|off            iCloud KV sync (off by default in E2E builds; see clock.ts)
 *   review=on|off           the App Store review prompt (off by default in E2E builds; see clock.ts)
 *
 * After a wipe, seed, corrupt or lose, saving is switched off until the restart, so the running app
 * can't write its in-memory state back over the change.
 */
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import v1 from '@/data/migrations/__fixtures__/v1.json';
import v2 from '@/data/migrations/__fixtures__/v2.json';
import v3 from '@/data/migrations/__fixtures__/v3.json';
import v4 from '@/data/migrations/__fixtures__/v4.json';
import v5 from '@/data/migrations/__fixtures__/v5.json';
import type { KV } from '@/data/kv';
import { createMMKVStore } from '@/data/mmkv';
import { ROOT_KEY } from '@/data/repo';
import { useAppStore } from '@/data/store';

import { setE2EClock, setE2ECloud, setE2EReview } from './clock';

const FIXTURES: Record<string, unknown> = { v1, v2, v3, v4, v5 };

type Params = { at?: string; real?: string; fresh?: string; seed?: string; corrupt?: string; lose?: string; cloud?: string; review?: string };

const wipe = (kv: KV) => {
  for (const k of kv.getAllKeys()) kv.remove(k);
};

/** Applies the parameters. Returns what was done, or throws with what went wrong. */
function apply(p: Params): string[] {
  const done: string[] = [];
  const kv = createMMKVStore();
  const freeze = () => useAppStore.setState({ readOnly: true });

  if (p.fresh === '1' || p.seed) {
    freeze();
    wipe(kv);
    if (kv.backup) wipe(kv.backup);
    done.push('wiped');
  }
  if (p.seed) {
    const blob = FIXTURES[p.seed];
    if (!blob) throw new Error(`unknown seed ${p.seed}`);
    kv.set(ROOT_KEY, JSON.stringify(blob));
    done.push(`seeded ${p.seed}`);
  }
  if (p.real === '1') {
    setE2EClock(null);
    done.push('real clock');
  } else if (p.at) {
    if (!setE2EClock(p.at)) throw new Error(`bad time ${p.at}`);
    done.push(`clock ${p.at}`);
  }
  if (p.corrupt === 'main') {
    freeze();
    kv.set(ROOT_KEY, '{"schemaVersion": 5, this is not JSON');
    done.push('corrupted main');
  }
  if (p.lose === 'main') {
    freeze();
    kv.remove(ROOT_KEY);
    done.push('removed main');
  }
  if (p.cloud === 'on' || p.cloud === 'off') {
    setE2ECloud(p.cloud === 'on');
    done.push(`cloud ${p.cloud}`);
  }
  if (p.review === 'on' || p.review === 'off') {
    setE2EReview(p.review === 'on');
    done.push(`review ${p.review}`);
  }
  return done;
}

export function E2EScreen() {
  const params = useLocalSearchParams<Params>();
  const [result, setResult] = useState<{ ok: boolean; lines: string[] } | null>(null);

  // The effect writes storage (an external system), then reports what it did. Run once.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      setResult({ ok: true, lines: apply(params) });
    } catch (e) {
      setResult({ ok: false, lines: [String(e)] });
    }
    // Applied once per visit; the flow restarts the app afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <View style={styles.root}>
      {result ? (
        <>
          <Text testID={result.ok ? 'e2e-ok' : 'e2e-error'} style={styles.big}>
            {result.ok ? 'e2e ok' : 'e2e error'}
          </Text>
          {result.lines.map((l) => (
            <Text key={l}>{l}</Text>
          ))}
          <Text testID="e2e-now">{new Date().toString()}</Text>
        </>
      ) : (
        <Text>e2e…</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, backgroundColor: '#FFFFFF' },
  big: { fontSize: 24 },
});

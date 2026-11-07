/**
 * UI sounds (spec §10): soft key tick and a paper rustle on solve. Off by default (Settings).
 * Respects the silent switch (playsInSilentMode false) and mixes with other audio.
 * Loaded lazily on first use; any audio failure is ignored.
 */
import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

type SoundName = 'tick' | 'rustle';

const sources: Record<SoundName, number> = {
  tick: require('../../assets/sounds/tick.wav'),
  rustle: require('../../assets/sounds/rustle.wav'),
};

const players: Partial<Record<SoundName, AudioPlayer>> = {};
let modeSet = false;

export function playSound(name: SoundName, enabled: boolean) {
  if (!enabled) return;
  try {
    if (!modeSet) {
      modeSet = true;
      setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    }
    let p = players[name];
    if (!p) {
      p = createAudioPlayer(sources[name]);
      p.volume = name === 'tick' ? 0.35 : 0.6;
      players[name] = p;
    }
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // Sound is decoration; never let it break input.
  }
}

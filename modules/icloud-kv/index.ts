import { requireOptionalNativeModule } from 'expo';

export type IcloudKvModule = {
  getString(key: string): string | null;
  setString(key: string, value: string): void;
  synchronize(): boolean;
  addListener(event: 'onChange', cb: () => void): { remove(): void };
};

/** Null on Android, web, Expo Go and in tests: sync is then simply off. */
export const IcloudKv = requireOptionalNativeModule<IcloudKvModule>('IcloudKv');

#!/usr/bin/env node
/**
 * Local Android build on this Windows laptop (Android builds never use EAS cloud).
 *   npm run android:local            → debug APK, installed on a running emulator/device if one is attached
 *   npm run android:local -- release → release APK (signed with the debug key; for testing only)
 *
 * Needs: Windows long paths on (HKLM\SYSTEM\CurrentControlSet\Control\FileSystem LongPathsEnabled=1),
 * and SDK CMake 3.31.6 (bundles Ninja 1.12.1, which handles long paths). The 3.22.1 default does not.
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..', '..');
const variant = process.argv[2] === 'release' ? 'release' : 'debug';
const CMAKE_VERSION = '3.31.6';

const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk');
const cmakeDir = join(sdk, 'cmake', CMAKE_VERSION);
const fail = (msg) => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};

if (process.platform === 'win32') {
  const reg = spawnSync('reg', ['query', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem', '/v', 'LongPathsEnabled'], { encoding: 'utf8' });
  if (!/0x1\b/.test(reg.stdout ?? '')) {
    fail(
      'Windows long paths are off, so the native build will fail (paths > 260 chars).\n' +
        '  In an ADMIN PowerShell run:\n' +
        '  New-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" -Name LongPathsEnabled -Value 1 -PropertyType DWORD -Force\n' +
        '  then sign out and back in.',
    );
  }
}
if (!existsSync(join(cmakeDir, 'bin'))) fail(`CMake ${CMAKE_VERSION} missing. Run: sdkmanager "cmake;${CMAKE_VERSION}"`);

const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit', env: process.env });

// Always regenerate android/ so config plugins and local modules are current.
run('npx expo prebuild --platform android --clean --no-install');

const esc = (p) => p.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
const localProps = join(root, 'android', 'local.properties');
const existing = existsSync(localProps) ? readFileSync(localProps, 'utf8') : '';
const kept = existing.split('\n').filter((l) => l && !/^(sdk|cmake)\.dir=/.test(l));
writeFileSync(localProps, [...kept, `sdk.dir=${esc(sdk)}`, `cmake.dir=${esc(cmakeDir)}`, ''].join('\n'));

// One ABI for local test builds keeps the native compile short (emulators on x86_64 laptops).
const abi = process.env.LC_ABI ?? 'x86_64';
const task = variant === 'release' ? 'assembleRelease' : 'assembleDebug';
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
run(`${gradlew} ${task} -PreactNativeArchitectures=${abi} --no-daemon`, join(root, 'android'));

const apk = join(root, 'android', 'app', 'build', 'outputs', 'apk', variant, `app-${variant}.apk`);
if (!existsSync(apk)) fail(`build finished but ${apk} is missing`);
console.log(`\n✓ ${apk}`);

const adb = join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const devices = spawnSync(adb, ['devices'], { encoding: 'utf8' }).stdout ?? '';
if (/\tdevice\b/.test(devices)) {
  run(`"${adb}" install -r "${apk}"`);
  console.log('✓ installed on the attached device/emulator');
}

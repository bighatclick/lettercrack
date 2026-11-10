// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apply } = require('../withReleaseSigning') as { apply: (src: string) => string };

// The part of the Expo template's android/app/build.gradle the plugin edits.
const TEMPLATE = `apply plugin: "com.android.application"

android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}
`;

describe('withReleaseSigning (D37)', () => {
  it('signs release with the upload key when its properties exist, debug stays on the debug key', () => {
    const out = apply(TEMPLATE);
    expect(out).toContain("lcSigningFile.exists() ? signingConfigs.release : signingConfigs.debug");
    expect(out).toMatch(/debug \{\n\s+signingConfig signingConfigs\.debug/);
    expect(out.indexOf('def lcSigningFile')).toBeLessThan(out.indexOf('android {'));
  });

  it('runs once', () => {
    const once = apply(TEMPLATE);
    expect(apply(once)).toBe(once);
  });

  it('fails the build instead of silently using the debug key when the template changes', () => {
    expect(() => apply('android {\n}\n')).toThrow(/did not match/);
  });
});

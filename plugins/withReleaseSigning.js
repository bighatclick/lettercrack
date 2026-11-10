/**
 * Release signing for local Android builds (D37).
 *
 * Release APKs used to be signed with the template debug key, so a build signed with any other key
 * could not update them (INSTALL_FAILED_UPDATE_INCOMPATIBLE) and testers had to uninstall and lose
 * their progress. This plugin signs release builds with the LetterCrack upload key when its
 * properties file exists, and falls back to the debug key (with a build warning) when it doesn't.
 *
 * The properties file is never in the repo. Default: ~/.lettercrack/upload-keystore.properties,
 * or the path in LC_KEYSTORE_PROPERTIES. Keys: storeFile (relative to the properties file or
 * absolute), storePassword, keyAlias, keyPassword.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = '// lettercrack-release-signing';

const LOADER = `${MARK}
def lcSigningFile = file(System.getenv('LC_KEYSTORE_PROPERTIES') ?: "\${System.getProperty('user.home')}/.lettercrack/upload-keystore.properties")
def lcSigning = new Properties()
if (lcSigningFile.exists()) {
    lcSigningFile.withInputStream { lcSigning.load(it) }
} else {
    logger.warn("LetterCrack: \${lcSigningFile} not found; release builds are signed with the DEBUG key and can't update builds signed with the upload key.")
}
`;

const CONFIG = `
        release {
            if (lcSigningFile.exists()) {
                def f = new File(lcSigning['storeFile'])
                storeFile f.isAbsolute() ? f : new File(lcSigningFile.parentFile, lcSigning['storeFile'])
                storePassword lcSigning['storePassword']
                keyAlias lcSigning['keyAlias']
                keyPassword lcSigning['keyPassword']
            }
        }`;

function apply(src) {
  if (src.includes(MARK)) return src;
  let out = src.replace(/^android \{/m, `${LOADER}\nandroid {`);
  out = out.replace(/(signingConfigs \{\n\s+debug \{[\s\S]*?\n\s{8}\})/, `$1${CONFIG}`);
  out = out.replace(
    /(release \{\n(?:\s*\/\/.*\n)*)\s*signingConfig signingConfigs\.debug/,
    '$1            signingConfig lcSigningFile.exists() ? signingConfigs.release : signingConfigs.debug',
  );
  if (!out.includes('signingConfigs.release : signingConfigs.debug') || !out.includes('lcSigning[\'keyAlias\']')) {
    throw new Error('withReleaseSigning: app/build.gradle did not match the expected template');
  }
  return out;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (c) => {
    c.modResults.contents = apply(c.modResults.contents);
    return c;
  });
};
module.exports.apply = apply;

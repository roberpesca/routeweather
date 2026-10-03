// Run right after "cap add android|ios". Adds the "routeweather://" link so Strava can send the
// user back into the app after login, and sets safe defaults. Safe to run more than once.
const fs = require('fs');
const path = require('path');
const platform = process.argv[2];
const root = path.join(__dirname, '..');

function edit(file, fn) {
  const p = path.join(root, file);
  const before = fs.readFileSync(p, 'utf8');
  const after = fn(before);
  if (after !== before) fs.writeFileSync(p, after);
  return after !== before;
}

if (platform === 'android') {
  const manifest = 'android/app/src/main/AndroidManifest.xml';
  edit(manifest, (x) => {
    if (x.includes('android:scheme="routeweather"')) return x;
    const filter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="routeweather" android:host="auth" />
            </intent-filter>
`;
    // put it inside the main <activity> right before its closing tag
    return x.replace(/(<activity[\s\S]*?)(<\/activity>)/, (m, a, b) => a + filter + '        ' + b);
  });
  // notifications permission (Android 13+) and alarms
  edit(manifest, (x) => {
    const perms = ['android.permission.POST_NOTIFICATIONS', 'android.permission.INTERNET'];
    let out = x;
    for (const p of perms) {
      if (!out.includes(p)) out = out.replace('</manifest>', `    <uses-permission android:name="${p}" />\n</manifest>`);
    }
    return out;
  });
  // launchMode singleTask so the login link returns to the already-open app
  edit(manifest, (x) => x.includes('launchMode') ? x : x.replace('<activity', '<activity android:launchMode="singleTask"'));
  // Version numbers (Google Play needs a bigger versionCode on every upload)
  const gradle = 'android/app/build.gradle';
  const vc = process.env.APP_VERSION_CODE || '1';
  const vn = process.env.APP_VERSION_NAME || '1.0.0';
  edit(gradle, (x) => x.replace(/versionCode \d+/, 'versionCode ' + vc).replace(/versionName "[^"]*"/, 'versionName "' + vn + '"'));
  // Signing (only when the secret keystore is provided by the build robot)
  if (process.env.ANDROID_KEYSTORE_FILE) {
    edit(gradle, (x) => {
      if (x.includes('signingConfigs')) return x;
      const signing = `    signingConfigs {
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_FILE"))
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release`;
      return x.replace('    buildTypes {\n        release {', signing);
    });
  }
  console.log('Android configured');
} else if (platform === 'ios') {
  const plist = 'ios/App/App/Info.plist';
  edit(plist, (x) => {
    if (x.includes('<string>routeweather</string>')) return x;
    const block = `\t<key>CFBundleURLTypes</key>
\t<array>
\t\t<dict>
\t\t\t<key>CFBundleURLName</key>
\t\t\t<string>com.roberpesca.routeweather</string>
\t\t\t<key>CFBundleURLSchemes</key>
\t\t\t<array>
\t\t\t\t<string>routeweather</string>
\t\t\t</array>
\t\t</dict>
\t</array>
\t<key>ITSAppUsesNonExemptEncryption</key>
\t<false/>
`;
    return x.replace(/<\/dict>\s*<\/plist>\s*$/, block + '</dict>\n</plist>\n');
  });
  console.log('iOS configured');
} else {
  console.error('Usage: node scripts/configure-native.js android|ios'); process.exit(1);
}

# Releasing an Android APK

## Local build (no keystore setup)

Build the APK on your machine. **No custom keystore required** — the build uses the project’s built-in debug keystore (`android/app/debug.keystore`), so you can build and install the APK without any signing setup.

**Requirements:** **Java 17** and the **Android SDK**.

- **Java:** If you see "Unable to locate a Java Runtime", install Java 17 (see below).
- **Android SDK:** If you see "SDK location not found", install the SDK and set `ANDROID_HOME`:
  1. Install [Android Studio](https://developer.android.com/studio).
  2. Open Android Studio → **Settings** (or **Preferences**) → **Languages & Frameworks** → **Android SDK**. Install the SDK if needed (default location is fine).
  3. Add to `~/.zshrc`:
     ```bash
     export ANDROID_HOME=$HOME/Library/Android/sdk
     export PATH=$ANDROID_HOME/platform-tools:$PATH
     ```
  4. Run `source ~/.zshrc`, then run `npm run build:apk` again.

If you see "Unable to locate a Java Runtime", install Java 17:

```bash
# Install Java 17 (macOS with Homebrew)
brew install openjdk@17
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Then run the build again.

**Build fails with "exit code 137"?**  
Exit 137 means the Hermes compiler was killed by the OS (out of memory). The build script uses a single ABI (`arm64-v8a`) to free RAM. If it still fails:

1. Close other apps and try again.
2. **Use EAS Build (recommended):** Build in the cloud so your machine’s RAM isn’t a limit:
   ```bash
   npx eas build --platform android --profile production
   ```
   You’ll get a download link for the APK. Hermes cannot be disabled when using react-native-reanimated (worklets) on React Native 0.81+, because the JSC tooling target is no longer shipped.

```bash
npm run build:android
# or
npm run build:apk
```

**Output:** `android/app/build/outputs/apk/release/app-release.apk`

You can install this APK on devices for testing or sideloading. For **Google Play** you’ll need a proper release keystore (or use EAS Build below).

---

## EAS Build (optional, for Play Store)

If you prefer cloud builds or need a store-ready build with managed signing:

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile production
```

Your `eas.json` already has `"buildType": "apk"` for production.

---

## First-time setup (local only)

If the `android/` folder is missing, run:

```bash
npx expo prebuild --platform android
```

Then run `npm run build:android` again.

# Native builds — Android APK & iOS

This documents the native app builds that wrap the web app (the PWA in the repo root).
For hosting/installing the web app itself, see [README.md](README.md) and [GUIDE.md](GUIDE.md).

## What you got

| Output | Location | Status |
|--------|----------|--------|
| **Android APK** (signed, installable) | [`builds/android/ReadyDev.apk`](builds/android/ReadyDev.apk) | ✅ Built |
| **iOS Xcode project** (build-ready) | `native/ios/` | ✅ Scaffolded (build on a Mac) |
| **iOS cloud build** (GitHub Actions) | [`.github/workflows/ios-build.yml`](.github/workflows/ios-build.yml) | ✅ Set up — builds an `.ipa` on a cloud Mac, see [`native/ios/CLOUD-BUILD.md`](native/ios/CLOUD-BUILD.md) |
| **iOS `.ipa`** | — | ❌ Not buildable *on Windows* (needs macOS/Xcode) — use the cloud build above |

## The Android APK

- **Package:** `com.readydev.app` · **minSdk** 24 · **targetSdk** 36 · version 1.0
- **Signed:** APK Signature Scheme v2 + v3 (correct for minSdk 24)
- **Permissions:** none — a plain WebView showing the bundled web app. This keeps it
  clean for Google Play Protect.
- **Size:** ~38 KB.

### Install it on a phone
1. Copy `ReadyDev.apk` to an Android phone (or host it on your site and download it).
2. Tap the file → Android asks to allow installs from this source → **Allow** → **Install**.
3. A "Play Protect scan recommended" prompt for a brand-new app is normal; continue.

### Rebuild it after changing the web app
```
powershell -ExecutionPolicy Bypass -File native/android-cli/build-apk.ps1
```
This re-copies the web files, rebuilds, signs, and refreshes `builds/android/ReadyDev.apk`.
Signing key details: [`native/KEYSTORE-INFO.txt`](native/KEYSTORE-INFO.txt).

## How it was built (and why not the "normal" way)

The standard toolchain is Capacitor + Gradle, and that project **does** exist at
`native/` (`native/android` is a full Capacitor/Gradle project). But on this machine
**Gradle can't run**: JDK 17's NIO selector creates its internal self-pipe over an
**AF_UNIX socket**, and on this Windows install that fails with
`java.net.SocketException: Invalid argument: connect` (AF_UNIX is broken here — usually
caused by security/anti-cheat software or a disabled AF_UNIX feature). JDK 11 works, but
the modern Android Gradle Plugin requires JDK 17, so Gradle is a dead end here.

So the APK is built **without Gradle**, driving the Android SDK's own tools directly
(`aapt2` → `javac` → `d8` → `zipalign` → `apksigner`) under JDK 11. Same signed,
installable result. That's what `native/android-cli/build-apk.ps1` does.

### To use the normal Gradle build later (optional)
Fix AF_UNIX so JDK 17 works, then `native/android` builds with Android Studio / Gradle:
- Temporarily pause the security/anti-cheat tool that hooks Winsock, **or**
- Run (Admin PowerShell) `netsh winsock reset` and reboot, **or**
- Build on a different machine / CI (GitHub Actions etc.).

Then: open `native/android` in Android Studio, or
`cd native && npx cap sync android && cd android && ./gradlew assembleRelease`.

## The iOS app

`native/ios/` is a complete, build-ready Xcode project (Capacitor 8, Swift Package
Manager — no CocoaPods). It can only be compiled into an `.ipa` on a **Mac with Xcode**
(or a cloud macOS build service).

**No Mac? A cloud build is already wired up.** [`.github/workflows/ios-build.yml`](.github/workflows/ios-build.yml)
compiles the iOS app on a GitHub-hosted macOS runner: push the repo to GitHub and it
produces an **unsigned `.ipa`** immediately (no Apple account), or a **signed, installable
`.ipa`** once you add four Apple Developer secrets. Step-by-step:
[`native/ios/CLOUD-BUILD.md`](native/ios/CLOUD-BUILD.md). Honest install caveats:
[`builds/ios/HOW-TO-BUILD-IPA.md`](builds/ios/HOW-TO-BUILD-IPA.md).

**For actually reaching iPhone users from your website, the PWA is the answer** — it
installs to the home screen from Safari with no App Store, no sideloading, and no `.ipa`.

## Folder map

```
D:\empty
├─ index.html, styles.css, app.js, ...   the web app (PWA) — host this
├─ icons/                                 app icons
├─ builds/
│  ├─ android/ReadyDev.apk               ← the signed Android APK
│  └─ ios/HOW-TO-BUILD-IPA.md            ← why no .ipa + how to make one on a Mac
└─ native/
   ├─ www/                                web assets copied for the native wrappers
   ├─ android/                            Capacitor + Gradle project (needs JDK 17 / AF_UNIX fix)
   ├─ android-cli/                        Gradle-free build (build-apk.ps1) — used to make the APK
   ├─ ios/                                Xcode project (build on a Mac)
   ├─ readydev-release.jks               Android signing key
   └─ KEYSTORE-INFO.txt                  key details + warnings
```

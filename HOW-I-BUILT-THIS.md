# How the APK and the iOS build were made — full build journal

This is the complete, honest record of how the Android `.apk` was built and how the iOS
`.ipa` build was set up, including the problems hit and how they were solved. Everything
here is reproducible on this machine.

- Beginner walkthrough: [START-HERE.md](START-HERE.md)
- Short reference: [BUILD.md](BUILD.md)

---

## 0. The overall idea

The app is a **web app (PWA)** in the repo root (`index.html`, `styles.css`, `app.js`,
`manifest.webmanifest`, `service-worker.js`, `icons/`). That single web app is:

- **hosted as a website** (installable on Android + iPhone with no store), and
- **wrapped** into native apps: an Android `.apk` and an iOS project.

The native wrappers show the bundled web app in a full‑screen WebView.

## 1. The machine / toolchain

Detected on this Windows 11 PC:

| Tool | Version / location |
|------|--------------------|
| Node.js | v22 (`C:\Program Files\nodejs`) |
| Python + Pillow | 3.10 + Pillow 9.5 (used to generate icons) |
| JDK 11 | `C:\Program Files\Java\jdk-11` (used for the Android tools — see §3.2) |
| JDK 17 | Adoptium 17 + Android Studio JBR 17 |
| Android Studio + SDK | `C:\Users\Hp Omen\AppData\Local\Android\Sdk` |
| Android platform | `android-36` |
| Android build‑tools | `36.1.0` (`aapt2`, `d8`, `zipalign`, `apksigner`) |

Icons were generated with Pillow (a `>_` glyph on an indigo→violet gradient) at all the
sizes Android/iOS need.

---

## 2. The web app (PWA)

Written by hand as static files. Key points that make it installable:

- `manifest.webmanifest` with `name`, `short_name`, `start_url`, `display: standalone`,
  `theme_color`, and 192/512 PNG icons (+ a maskable icon).
- `service-worker.js` caches the app shell so it works offline and is installable.
- `index.html` has the iOS tags (`apple-touch-icon`, `apple-mobile-web-app-capable`) and
  registers the service worker.
- All paths are **relative**, so it works at a domain root *or* under a subfolder
  (e.g. GitHub Pages' `/<repo>/`).

Verified locally with `python -m http.server`: service worker registered, manifest + icons
returned HTTP 200, the checkbox‑gated button worked, no console errors.

---

## 3. The Android APK

### 3.1 First attempt: Capacitor + Gradle (the "normal" way) — and why it failed here

Set up a Capacitor project in `native/`:

```
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap add android      # generates native/android (Gradle project, AGP 8.13, Gradle 8.14.3)
```

Capacitor 8 already targets **compileSdk/targetSdk 36** — matching the installed platform.
But every Gradle build died with:

```
java.io.IOException: Unable to establish loopback connection
Caused by: java.net.SocketException: Invalid argument: connect
    at sun.nio.ch.UnixDomainSockets.connect0(Native Method)
    at sun.nio.ch.PipeImpl$Initializer$LoopbackConnector.run(PipeImpl.java:133)
```

**Diagnosis (proven with small test programs):**
- JDK 17's NIO selector builds its internal self‑pipe over an **AF_UNIX socket**. On this
  Windows install, AF_UNIX `connect()` fails with *"Invalid argument"* — AF_UNIX is broken
  here (commonly caused by security/anti‑cheat software hooking Winsock, or the AF_UNIX
  feature being disabled). A short temp dir did **not** help.
- The exact same test on **JDK 11** printed `Pipe.open OK / Selector.open OK` — because
  JDK 11 uses **TCP loopback**, not AF_UNIX.
- Gradle needs NIO selectors, and the modern Android Gradle Plugin **requires JDK 17**, so
  Gradle simply cannot run on this machine. Dead end.

*(To fix the machine so Gradle works: pause the security tool that hooks Winsock, or run
`netsh winsock reset` as Admin and reboot, or build on another machine / CI. The Capacitor
Gradle project in `native/android` is intact for that.)*

### 3.2 What actually built the APK: the SDK tools directly (no Gradle)

Since Gradle couldn't run, the APK was built by driving the Android SDK's own tools under
**JDK 11** (which works, and these tools don't need the NIO selector). A minimal,
**framework‑only** WebView app was written (no AndroidX, no libraries, **zero permissions**)
so there are no dependencies to resolve:

- `native/android-cli/src/com/readydev/app/MainActivity.java` — a `WebView` that loads
  `file:///android_asset/www/index.html`, with JavaScript + DOM storage enabled.
- `native/android-cli/AndroidManifest.xml` — one launcher activity, `DeviceDefault` theme.
- `native/android-cli/res/…` — launcher icons (mdpi…xxxhdpi) + app name string.
- `native/android-cli/assets/www/` — a copy of the web app.

The exact pipeline (see `native/android-cli/build-apk.ps1`):

```
# 1. compile resources
aapt2 compile --dir res -o build/res.zip

# 2. link resources + manifest  (res.zip is a POSITIONAL input, not -R)
aapt2 link -o build/base.apk -I <sdk>/platforms/android-36/android.jar \
     --manifest AndroidManifest.xml --min-sdk-version 24 --target-sdk-version 36 \
     --version-code 1 --version-name 1.0  build/res.zip

# 3. compile Java against android.jar
javac -source 8 -target 8 -bootclasspath android.jar -d build/classes \
      src/com/readydev/app/MainActivity.java

# 4. dex it
d8 --lib android.jar --min-api 24 --output build/dex  build/classes/.../MainActivity.class

# 5. add assets + dex to the APK using `jar` (forward-slash entry names — see note)
jar uf build/base.apk -C . assets
jar uf build/base.apk -C build/dex classes.dex

# 6. align, then 7. sign
zipalign -f 4 build/base.apk build/aligned.apk
apksigner sign --ks readydev-release.jks --ks-pass pass:… --out build/ReadyDev.apk build/aligned.apk
```

**Two bugs found and fixed along the way:**
1. `aapt2 link` with `-R build/res.zip` errored *"resource string/app_name does not override
   an existing resource"* — because `-R` means *overlay*. Fix: pass `res.zip` as a **positional**
   input instead.
2. Using `aapt2 -A assets` bundled the web files but with **backslash** entry names on Windows
   (`assets/www\index.html`), which Android's asset loader can't open. Fix: drop `-A` and add
   the assets with the JDK **`jar`** tool, which always writes forward‑slash names. Verified
   the final APK has **0 backslash entries**.

### 3.3 The signing key

Generated with `keytool` (RSA 2048, 10000‑day validity):
`native/readydev-release.jks`, alias `readydev`. Details/passwords in
`native/KEYSTORE-INFO.txt`. **This key is git‑ignored** (never uploaded). Keep a backup —
every future update must be signed with the same key.

### 3.4 Verification of the finished APK

- `apksigner verify` → **v2 + v3 signatures valid** (correct for minSdk 24; v1 is only needed
  below API 24).
- `zipalign -c` → alignment **OK**; `resources.arsc` stored **uncompressed** (required for
  targetSdk 36).
- Contents: `classes.dex`, `resources.arsc`, all `assets/www/*` present with forward slashes,
  launcher icon, package `com.readydev.app`, minSdk 24 / targetSdk 36, **zero permissions**.
- Output: **`builds/android/ReadyDev.apk`** (~38 KB).

---

## 4. The iOS build

### 4.1 Why there is no `.ipa` file in this repo

Two independent reasons:
1. **iOS apps can only be compiled on macOS** (Apple's Xcode toolchain). There is no iOS
   compiler for Windows — so no `.ipa` can be produced on this PC, by any tool.
2. Even a built `.ipa` **can't be installed from a website** without the App Store or a
   sideloading tool — Apple enforces on‑device signing. (Full detail in
   [GUIDE.md](GUIDE.md) and [builds/ios/HOW-TO-BUILD-IPA.md](builds/ios/HOW-TO-BUILD-IPA.md).)

### 4.2 What was built: the iOS project + a cloud‑Mac build pipeline

- `npx cap add ios` scaffolded a complete Xcode project at **`native/ios/`** (Capacitor 8,
  **Swift Package Manager** — no CocoaPods). The web app is bundled at
  `native/ios/App/App/public`.
- The generated project had **no shared scheme**, which a CI runner needs. A shared scheme
  was created at `native/ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme`
  (pointing at the `App` target `504EC3031FED79650016851F`).
- A GitHub Actions workflow was added at **`.github/workflows/ios-build.yml`**
  (runner `macos-15`, Xcode 16). On push it:
  - refreshes the web assets into `native/www`, runs `npm ci` + `npx cap sync ios`,
  - if **no** Apple secrets are set → builds an **UNSIGNED** `.ipa`
    (`xcodebuild … archive CODE_SIGNING_ALLOWED=NO`, then zips `Payload/App.app`),
  - if Apple secrets **are** set → builds a **SIGNED** `.ipa` (App Store Connect API key +
    automatic signing + `-exportArchive` with `native/ios/ExportOptions.plist`),
  - uploads the `.ipa` as a downloadable artifact.

The **unsigned** output is exactly what **Sideloadly** needs — it re‑signs with a free Apple
ID on the device. Step‑by‑step: [native/ios/CLOUD-BUILD.md](native/ios/CLOUD-BUILD.md).

All three CI files were validated (plist parses, scheme is well‑formed XML, workflow YAML is
valid — job `ios`, `runs-on: macos-15`).

### 4.3 What you still need for iOS

- **Nothing extra** for a test install: push to GitHub → download the unsigned `.ipa` from
  Actions → Sideloadly it (free Apple ID, 7‑day refresh).
- For a **signed** `.ipa` (TestFlight / ad‑hoc): an Apple Developer account ($99/yr) and the
  4 secrets described in `native/ios/CLOUD-BUILD.md`.

---

## 5. Reproduce it

```powershell
# Android APK (Windows, this machine)
powershell -ExecutionPolicy Bypass -File native/android-cli/build-apk.ps1
#  -> builds/android/ReadyDev.apk

# iOS .ipa (cloud Mac): push repo to GitHub, then GitHub Actions builds it.
#  See START-HERE.md Part 4 and native/ios/CLOUD-BUILD.md
```

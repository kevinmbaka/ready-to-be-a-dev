# Ready to be a Dev — installable web app

> 🚀 **New to this? Read [START-HERE.md](START-HERE.md)** — a simple, step‑by‑step guide to
> putting the app online, installing the Android app, and getting it on your iPhone.


One website that installs as a real app icon on **both Android and iPhone**, straight
from the browser. **No Play Store. No App Store. No Sideloadly / AltStore. No `.ipa`.**

This is a **PWA (Progressive Web App)** — the only approach that actually meets all of
"host it on a website" + "installable on Android and iPhone" + "no app store" + "no
sideloading tool" at the same time.

> Want the full "why" behind all of this (Apple's rules, Play Protect, the 2026 Android
> developer-verification change, sources)? See **[GUIDE.md](GUIDE.md)**.

> **Native builds too:** a signed, installable **Android APK** is built at
> **[builds/android/ReadyDev.apk](builds/android/ReadyDev.apk)**, and a build-ready
> **iOS Xcode project** is at `native/ios/`. Details, rebuild steps, and why there's no
> `.ipa` file: **[BUILD.md](BUILD.md)**.

---

## 1. Files in this project

```
index.html              start page: "I'm ready to be a dev" + text box + tickbox
styles.css              styling (auto light/dark, mobile-first)
app.js                  checkbox gate, install button, service-worker registration
manifest.webmanifest    app name, icons, colors — makes it installable
service-worker.js       offline caching (required for install)
icons/                  app icons (Android maskable + iOS apple-touch-icon)
.claude/launch.json     local dev server config (python http.server on :5173)
```

## 2. Host it (this is the whole "publish" step)

A PWA is just static files, so any static host with **HTTPS** works. HTTPS is
**required** — install and the service worker won't work over plain `http://` (except on
`localhost` for testing).

Pick one, upload the whole folder:

| Host | How |
|------|-----|
| **Netlify** | Drag-and-drop the folder onto https://app.netlify.com/drop |
| **Cloudflare Pages** | New project → upload folder |
| **Vercel** | `npx vercel` in this folder |
| **GitHub Pages** | Push to a repo → Settings → Pages → deploy from branch |

All four give free HTTPS. Because every path in this app is **relative**, it works whether
it lives at `yoursite.com/` or `yoursite.com/app/` — no changes needed.

### Test locally first
```bash
python -m http.server 5173
```
Then open `http://localhost:5173`. (Install prompts behave fully only on a real HTTPS URL.)

## 3. How your users install it

**Android (Chrome/Edge):** Opening the site shows an **"Install app"** prompt (this app
also shows its own *Install this app* button). One tap → app icon on the home screen,
runs fullscreen with no browser bar.

**iPhone/iPad (must be Safari):** Tap the **Share** button → **"Add to Home Screen"**.
The app shows this hint automatically on iPhones. Result: a real app icon, fullscreen, no
Safari bar. iOS has **no** automatic install prompt and only Safari can install — that's
an Apple rule, not a bug.

That's it — no store account, no sideloading, no developer certificate.

---

## 4. The honest truth about a native iOS `.ipa`

You asked for an `.ipa` installable from a website without the App Store and without a
sideloading tool. **For the general public, that is not possible** — it's an Apple
restriction, not a gap in this project:

- Every app on a normal (non-jailbroken) iPhone must be **code-signed** by Apple's system.
- Installing an `.ipa` from a web link ("OTA" via an `itms-services://` manifest) **still
  requires** either an **Enterprise certificate** (only for a company's own employees;
  Apple bans public use and *revokes* certs that leak — apps then stop opening) or an
  **Ad-hoc** profile (you must pre-register each device's UDID, max ~100/year).
- **Sideloading tools** (AltStore/Sideloadly) work only by re-signing with your account and
  need re-signing every 7 days — which you explicitly don't want.
- **EU only:** since iOS 17.4, "Web Distribution" and alternative marketplaces exist, but
  they require an Apple developer account, Apple **notarization**, EU residency/eligibility,
  and a user approval step — so it still runs through Apple.

**Bottom line:** the PWA "Add to Home Screen" above *is* the legitimate way to get your app
onto an iPhone from a website with no store and no sideloading. If you ever need a true
native iOS app for everyone, the realistic route is the **App Store** (or TestFlight for
testers).

---

## 5. Optional: also ship a real Android `.apk` (Play-safe)

You don't need this — the PWA already installs on Android — but if you want a downloadable
`.apk` file on your site, wrap the PWA in a **Trusted Web Activity** with Bubblewrap. It
produces a thin native app that opens your hosted site fullscreen.

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://YOUR-DOMAIN/manifest.webmanifest
bubblewrap build
```
(You have JDK 17 installed; Bubblewrap can fetch the Android SDK for you on first run.)
Output: `app-release-signed.apk` — host it and let users download.

### Keeping it from being flagged
Google Play Protect scans apps installed from outside the Play Store. A clean app is very
unlikely to be flagged if you:
- **Sign the APK** with your own keystore (Bubblewrap does this) and keep the key safe.
- **Request no scary permissions** — this app needs none.
- **Target a recent `targetSdk`** (34+). Old target levels get blocked on new Android.
- Don't ship anything a scanner treats as malware (no dynamic code loading, no hidden APKs).

> **2025–2026 note — Android developer verification:** Google is rolling out a requirement
> that apps installed on *certified* Android devices come from a **verified developer**,
> even when sideloaded, phasing in through 2026–2027. If you later distribute an APK
> widely, plan to register as a verified developer with Google. This does **not** affect
> the PWA route.

## 6. Optional: the app stores later

- **Google Play:** Bubblewrap's `.aab` output uploads straight to the Play Console.
- **Apple App Store:** requires an Apple Developer account ($99/yr) and a Mac/Xcode (or a
  service like Capacitor + a cloud Mac build). This is the only path to a native iPhone app
  for the public.

## 7. Make it yours

- App name / colors: edit `manifest.webmanifest` (`name`, `theme_color`, `background_color`).
- Icons: replace the PNGs in `icons/` (keep the same filenames and sizes), or re-run the
  generator you were given.
- Start page text and fields: edit `index.html`.
- After changing any cached file, bump `CACHE = 'readydev-v1'` in `service-worker.js` so
  installed users get the update.

# How to Ship One App to Both Android and iPhone Without an App Store

You want a single app, hosted on your own website, that people can install on **both Android and iPhone** — with **no App Store, no Google Play, and no sideloading tools** (like AltStore or Sideloadly).

The short version:

- **Do this:** Build a **PWA** (Progressive Web App). It's just a website with a few extra files. It installs as a real home-screen icon on both platforms, from your own URL, with zero stores and zero tools. This is the only approach that actually works for the general public on both platforms.
- **Don't count on:** Installing a native **iPhone app (.ipa)** from a website. For the ordinary public, this is **not possible** — Apple blocks it by design.
- **Optional add-on:** A native **Android app (.apk)** you host yourself. This works, but comes with warnings from Google's "Play Protect" and a new identity-verification rule landing in 2026.

*(This project already implements the PWA in the "Do this" section — see [README.md](README.md).)*

---

## 1. The Recommended Approach: A PWA

A **PWA is a normal website** that you enhance with two small things: a **manifest** (a text file describing your app's name and icon) and a **service worker** (a small script that enables offline use and notifications). That's it. Users visit your URL and can add it to their home screen, where it opens full-screen like a native app — no browser bar, its own icon.

### Why this satisfies every constraint

| Your requirement | How the PWA meets it |
|---|---|
| One app, both Android + iOS | The same website installs on both. One codebase. |
| Hosted on a website | It *is* a website. You just host the files. |
| No app store | Users install straight from your URL. |
| No sideloading tool | Installation is built into the phone's browser. |
| Real app icon | Both platforms add a home-screen icon that launches full-screen. |

### What you need to build (works for both platforms)

1. **Serve everything over HTTPS.** Mandatory on both platforms. A plain `http://` site cannot be installed. (Netlify, Vercel, GitHub Pages, Cloudflare Pages all give free HTTPS.)
2. **A web app manifest** linked from your HTML, containing `name`/`short_name`, `start_url`, `display: "standalone"`, `background_color`/`theme_color`, and `icons` with at least a **192×192** and a **512×512** PNG.
3. **A service worker** with a `fetch` handler — enables Android's auto install prompt, offline use, and is **required** for iPhone push notifications.
4. **iPhone-specific tags:** `<link rel="apple-touch-icon" href="/icon-180.png">` (a **180×180** PNG), so the icon isn't a blurry screenshot.

### Honest limitations on iPhone (plan around these)

- **No automatic install prompt.** The user installs manually; you can only show a hint.
- **Safari only.** Not Chrome/Firefox on iPhone, and not inside other apps' browsers.
- **Storage can be wiped after ~7 days of no use.** Don't treat offline data as permanent.
- **No background activity.** The app can't sync or refresh while closed.
- **Push notifications work**, but only *after* the app is added to the home screen and the user allows them (iPhone 16.4+, March 2023 onward).

Android has none of these limits and even offers a one-tap install button you can trigger yourself.

---

## 2. The Honest Truth About Native iPhone Apps (.ipa)

**You cannot let the general public install an iPhone app (.ipa) from a website link — not without the App Store, and not without a sideloading tool. There is no legitimate workaround.**

- Every iPhone app must be **cryptographically signed by Apple** before the phone will install or open it. This check happens on the device and **cannot be bypassed** on a normal (non-jailbroken) iPhone. Hosting the file on a website changes nothing.
- There *is* a real "install from a web link" mechanism (**OTA / `itms-services`**), and it still works — **but** it only *delivers* the file; the app inside still needs a valid Apple signature.

The signing options all fail the "anyone, anywhere" test:

- **Ad-hoc** ($99/year): installs from a web link, but only onto **specific iPhones whose device IDs (UDIDs) you registered in advance**, capped at **100 devices**, expiring after **one year**. Fine for a small known group; useless for the public.
- **Apple Enterprise Program** ($299/year): unlimited devices, but Apple's contract **forbids public distribution** — misuse gets your certificate **revoked**, killing the app on every phone. Don't.
- **EU Web Distribution** (iPhone 17.4+): the only true "install from my website" public option — but **EU-only**, and requires an **EU-registered company with 2+ years of Apple membership and an app that already had 1M+ EU installs last year**. Not realistic for a beginner.
- **Free Apple account signing:** expires every **7 days** and **cannot** install from a web link — it *requires* a Mac and a sideloading tool. Exactly what you're avoiding.

**Bottom line for iPhone:** the App Store (or TestFlight for beta testers) is the only route to the public for a *native* app. For your goal — public, from a website, no store, no tools — **the PWA is the answer on iPhone.**

---

## 3. The Optional Android APK (and How to Stay Un-Flagged)

On Android you *can* legitimately host an installable **.apk** on your website. Two easy ways to turn a website into an APK:

- **Bubblewrap (Trusted Web Activity):** Google's official tool. Tiny (~800 KB) app that shows your live PWA via the phone's Chrome. **Requires** a real PWA *and* a `.well-known/assetlinks.json` file on your domain listing your app's signing fingerprint. Android-only.
- **Capacitor:** wraps *any* HTTPS website (even a non-PWA) in an Android app (~4 MB). No verification file needed; also builds for iPhone. More setup, more native features (camera, GPS, etc.).

### Keeping Google Play Protect from warning or blocking users

**Play Protect** is a scanner built into virtually every Android phone. It scans *all* apps — including ones from your website. To stay clean:

1. **Sign the app properly** (APK Signature Scheme v2/v3) and **reuse the same key for every update.** Never ship unsigned/debug-signed.
2. **Request the fewest permissions possible.** Avoid SMS reading (`READ_SMS`/`RECEIVE_SMS`), Notification Listener, and Accessibility Service unless core — these trigger *active install blocks*.
3. **Target a recent Android version** (`targetSdkVersion` within ~1 year of the newest Android). Old targets cause warnings and, if very old, an OS hard-block.
4. **Expect a first-install "scan recommended" prompt** for a brand-new app. Normal; fades as more people install cleanly.

### The 2026 change you must know about: Developer Verification

Google now requires an app's developer to have a **verified identity** to install on standard Android phones — even for apps you host yourself. It checks *who you are*, not your app's quality.

- **Timeline:** registration opened to all developers **March 2026**; enforcement starts in Brazil, Indonesia, Singapore, Thailand around **September 2026**, expanding **globally in 2027**.
- **What to do:** enroll before enforcement reaches your users' region. There's a **free hobbyist/limited tier** (small number of authorized devices) and a **full tier** for real distribution (legal name/ID; orgs also need a business registration number and verified website).

If this feels like a lot, it's another reason the **PWA is simpler**: PWAs are websites, so neither Play Protect nor developer verification applies.

---

## 4. Step-by-Step: Hosting and Installing

### A. Host your PWA (recommended, both platforms)

1. Put this project's files on any host with **free HTTPS** — Netlify, Vercel, Cloudflare Pages, or GitHub Pages (drag-and-drop the folder or connect a Git repo).
2. Confirm it loads at `https://yourdomain.com` with the padlock.
3. Test on a real Android phone and a real iPhone.

**Android users install it:** open in **Chrome** → tap the **Install** prompt / address-bar install icon (or the app's own *Install* button) → **Install**.

**iPhone users install it:** open in **Safari** (not Chrome) → tap **Share** (square with an up-arrow) → **Add to Home Screen** → **Add**.

### B. Host an Android APK (optional, Android only)

1. Build the APK with **Bubblewrap** or **Capacitor**, signed with your own key.
2. Upload the `.apk` to your HTTPS site and link a "Download for Android" button.
3. If you used Bubblewrap, also upload `.well-known/assetlinks.json`.
4. Enroll in **Android developer verification** ahead of your region's enforcement date.

**Android users install it:** tap **Download** → tap the file → **Allow** installs from this source → **Install**. A Play Protect "scan recommended" prompt is normal.

> There is **no APK equivalent for iPhone.** For iPhone, use the PWA.

---

## Quick Decision Guide

- **Public install on both iPhone + Android, from your website, no store, no tools?** → **Build a PWA.** The only approach that works for both.
- **Want a downloadable app *file* and only care about Android?** → PWA **plus** an optional APK (Bubblewrap/Capacitor); mind Play Protect and developer verification.
- **Want a native iPhone app for the public?** → Not possible from a website. Options are the **App Store** (public) or **TestFlight** (testers) — both of which you asked to avoid — or a **PWA**, your realistic answer.

**Recommendation:** Start with the PWA. Least work, no developer fees or identity checks, and the single thing that satisfies *all* your constraints on *both* platforms. Add an Android APK later only if you specifically need it.

# Build an iOS `.ipa` on a cloud Mac (no Mac required)

This repo includes a GitHub Actions workflow — [`.github/workflows/ios-build.yml`](../../.github/workflows/ios-build.yml)
— that compiles `native/ios/` into an `.ipa` on a GitHub-hosted **macOS** runner.

Two modes, automatically chosen by whether you've added Apple secrets:

| Mode | Needs | Output | Installable? |
|------|-------|--------|--------------|
| **Unsigned** | nothing | `ReadyDev-unsigned.ipa` | ✅ **via Sideloadly** (it re-signs with your free Apple ID) — or any re-signing tool |
| **Signed** | Apple Developer account + 4 secrets | `ReadyDev.ipa` | ✅ Via TestFlight or ad-hoc (see limits below) |

---

## ⚡ Sideloadly path (free — no Apple Developer account)

If you're going to **Sideloadly** the app onto your own device for testing, you only need
the **unsigned** `.ipa` — Sideloadly does the signing with your free Apple ID. So:

1. Do **Step 1** below (push to GitHub). Leave the Apple secrets **unset**.
2. Actions tab → the build run → download the **`ReadyDev-unsigned-ipa`** artifact → unzip
   it to get `ReadyDev-unsigned.ipa`.
3. Open **Sideloadly** on your PC, plug in your iPhone, drag in `ReadyDev-unsigned.ipa`,
   enter your Apple ID, and **Start**. It installs to your device.
   - Free Apple ID = the app works for **7 days**, then re-run Sideloadly to refresh it.
4. On the iPhone: **Settings → General → VPN & Device Management** → trust your Apple ID,
   then open the app.

You can **skip Step 2 entirely** — that's only for producing a pre-signed `.ipa` without
Sideloadly. Everything below Step 1 is optional for you.

---

---

## Step 1 — Put the project on GitHub

This folder isn't a git repo yet. From `D:\empty`:

```bash
git init
git add .
git commit -m "Ready to be a Dev app"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

The push triggers the workflow. In the repo's **Actions** tab you'll see
**"Build iOS IPA (cloud Mac)"** run. When it finishes, open the run and download the
**`ReadyDev-unsigned-ipa`** artifact. 🎉 That's a real `.ipa` compiled on a Mac — but
**unsigned, so it won't install on a device yet.** For that, do Step 2.

> No push needed to re-run: Actions tab → the workflow → **Run workflow**.

---

## Step 2 — Get a SIGNED, installable `.ipa`

You need an **Apple Developer account** ($99/yr). Then create an **App Store Connect API
key** and add four secrets — no Mac, no certificates to wrangle by hand.

### 2a. Create an App Store Connect API key
1. Go to <https://appstoreconnect.apple.com> → **Users and Access** → **Integrations** →
   **App Store Connect API** → **+** to generate a **Team key** with the **App Manager** role.
2. Download the `AuthKey_XXXXXXXXXX.p8` (you can only download it once).
3. Note the **Key ID** (the `XXXXXXXXXX`) and the **Issuer ID** (shown at the top).
4. Find your **Team ID**: <https://developer.apple.com/account> → **Membership** → Team ID
   (10 characters, e.g. `AB12CD34EF`).

### 2b. Base64-encode the .p8 (run in PowerShell on your PC)
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\Downloads\AuthKey_XXXXXXXXXX.p8")) | Set-Clipboard
```
(The encoded string is now on your clipboard.)

### 2c. Add secrets in GitHub
Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**,
add these four (names must match exactly):

| Secret name | Value |
|-------------|-------|
| `ASC_KEY_ID` | the Key ID (`XXXXXXXXXX`) |
| `ASC_ISSUER_ID` | the Issuer ID |
| `ASC_KEY_P8_BASE64` | the base64 string from 2b |
| `APPLE_TEAM_ID` | your 10-char Team ID |

Optionally add a **Variable** (same page, "Variables" tab) named `IOS_EXPORT_METHOD`:
- `ad-hoc` (default) — installs on devices whose UDIDs you've registered in the Apple portal.
- `app-store` — an `.ipa` you upload to App Store Connect → TestFlight.
- `development` — installs on registered development devices.

### 2d. Run it
Push again (or Actions → Run workflow). Now the workflow signs the app and produces the
**`ReadyDev-ipa`** artifact — a real, signed `.ipa`.

> The bundle id is `com.readydev.app`. If that id isn't available under your team, change
> `PRODUCT_BUNDLE_IDENTIFIER` in `native/ios/App/App.xcodeproj` (and `appId` in
> `native/capacitor.config.json`) to something you own, e.g. `com.yourname.readydev`.

---

## What you can actually do with the signed `.ipa`

This is the same wall from the start — signing gets you an `.ipa`, but **not** a public
"install from a website" app:

- **TestFlight** (`app-store` method → upload to App Store Connect): invite up to 10,000
  testers by email/link. Easiest way to let real people install it. Still "goes through Apple."
- **Ad-hoc** (`ad-hoc` method): install on up to 100 devices **whose UDIDs you registered**
  in advance. You can host this `.ipa` on a web page with an `itms-services` link, and those
  specific devices can install it — but nobody else can.
- **App Store**: submit for review for public distribution.

There is still **no** setting that lets an arbitrary visitor install this `.ipa` with no
store and no sideloading tool. For that audience, use the **PWA** (Safari → Add to Home
Screen). See [../../GUIDE.md](../../GUIDE.md).

---

## Even easier signing: Codemagic (alternative, UI-based)

If the API-key steps feel heavy, [Codemagic](https://codemagic.io) has a free tier and
handles iOS signing in its web UI:
1. Sign up, connect your GitHub repo.
2. Add a workflow → it auto-detects the Capacitor/Ionic iOS app at `native/ios/App`.
3. Under **Distribution → iOS code signing**, connect your App Store Connect API key
   (same key from Step 2a) and choose automatic signing.
4. Set the pre-build script to `cd native && npx cap sync ios`, then build & download the `.ipa`.

Same Apple-account requirement and same distribution limits apply.

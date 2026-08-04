# Why there is no `.ipa` file in this folder — and how to make one

There is **no `ReadyDev.ipa` here on purpose.** An iOS app cannot be compiled on
Windows (Apple's build tools, Xcode, only run on macOS), and — more importantly —
**a native `.ipa` can't be installed the way you want anyway.**

## The hard iPhone reality (unchanged)

Even a correctly built, signed `.ipa` **cannot** be installed by the public from a
website without the App Store and without a sideloading tool. Every iPhone app must
be signed by Apple on the device; the only channels are:

- **App Store / TestFlight** (needs Apple review / a Mac).
- **Ad-hoc** — max 100 pre-registered device UDIDs, expires yearly. Not public.
- **Enterprise cert** — internal employees only; using it for the public gets it
  revoked. Not allowed.
- **EU Web Distribution** — EU-only, and needs a big established EU company account.

**So for reaching users on iPhone, use the installable web app (PWA):** the same
website in this project installs to the iPhone home screen via Safari →
Share → *Add to Home Screen*. No store, no sideloading, no `.ipa`. See
[../../GUIDE.md](../../GUIDE.md).

## If you still need a native `.ipa` (e.g. to submit to the App Store)

The full, build-ready Xcode project already exists at **`native/ios/`**. On a Mac:

```bash
# 1. Get the project onto a Mac (copy the whole D:\empty\native folder)
cd native
npm install                 # restores Capacitor
npx cap sync ios            # copies the latest web app into the iOS project

# 2. Open in Xcode
npx cap open ios
#   - set your Team (Apple Developer account) under Signing & Capabilities
#   - pick a Bundle Identifier you own (e.g. com.yourname.readydev)

# 3. Build an .ipa
#   Xcode: Product > Archive > Distribute App
#   (choose App Store Connect, Ad Hoc, or Development as needed)
```

No Mac? Use a cloud macOS CI/build service (e.g. Codemagic, Ionic Appflow, GitHub
Actions macOS runners, or Xcode Cloud). Point it at `native/`, run
`npx cap sync ios`, then `xcodebuild archive` + `-exportArchive`. You still need an
Apple Developer account ($99/yr) to sign it, and the install limits above still apply.

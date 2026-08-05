# App permissions — what's implemented, and what each platform actually allows

You asked for five things: **battery-optimisation exemption**, **App Standby exemption**,
**foreground service**, **wakelock**, and **notifications**.

Short version:

- **Android: all five are implemented** and verified present in the APK.
- **iOS: only two of them exist at all.** Apple provides no battery-optimisation exemption,
  no App Standby control, and no foreground services. That's a platform limit, not a
  missing feature — details in §2.

---

## 1. Android (`builds/android/ReadyDev.apk`)

### Declared permissions (verified in the built APK with `aapt2 dump badging`)

| Permission | What it does | How it's granted |
|---|---|---|
| `POST_NOTIFICATIONS` | Show notifications | Runtime prompt (Android 13+) |
| `WAKE_LOCK` | Keep the CPU awake | Automatic (install-time) |
| `FOREGROUND_SERVICE` | Run a foreground service | Automatic (install-time) |
| `FOREGROUND_SERVICE_DATA_SYNC` | Service type, required on Android 14+ | Automatic (install-time) |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Ask to be exempt from Doze **and App Standby** | System dialog — user must accept |

> **App Standby is covered by the battery item.** Android does not expose App Standby as a
> separate permission. "Ignore battery optimisations" is the single switch that exempts an
> app from **both Doze and App Standby buckets** — it's the "Unrestricted" battery setting
> users see. There is no other API for it.

### What was built

- **`KeepAliveService.java`** — a real foreground service (`foregroundServiceType="dataSync"`,
  verified in the manifest). It posts an ongoing notification on a low-importance channel and
  returns `START_STICKY` so Android restarts it if killed. It can optionally hold a
  `PARTIAL_WAKE_LOCK` (CPU stays on).
- **`MainActivity.java`** — exposes an `AndroidPerms` JavaScript bridge so the app's own UI
  can check and request everything:
  `hasNotifications()`, `requestNotifications()`, `isBatteryUnrestricted()`,
  `requestBatteryUnrestricted()`, `startBackgroundService(withWakeLock)`,
  `stopBackgroundService()`, `setKeepScreenOn(bool)`, `openAppSettings()`.
- **In-app UI** — an "App permissions" panel with live status and one button per item. It
  appears **only inside the native app**, and is hidden on the website (where these APIs
  don't exist).

### Important: you cannot grant these silently

Two of them require the **user** to agree, by design:

- **Notifications** — Android 13+ shows a system prompt. If denied, the app can only send
  the user to Settings (the button does that automatically).
- **Unrestricted battery** — Android always shows a confirmation dialog. An app can never
  exempt itself. On some OEM ROMs (Xiaomi, Huawei, Oppo, Samsung) there are *additional*
  vendor battery managers; the app falls back to the battery-optimisation list, then to the
  app's settings page, if the direct dialog is blocked.

### ⚠️ Google Play policy warning

`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` is a **policy-restricted permission**. Google Play
only allows it for apps whose *core* function genuinely requires it (alarms, VoIP calls,
device-companion apps, continuous fitness tracking). A general-purpose app using it is
normally **rejected**.

This conflicts with the earlier goal of "don't let Play Store flag it":

- **Sideloading from your own website — fine.** No policy review happens. This is your setup.
- **Publishing to Google Play — expect rejection** unless you can justify the permission.
  If you later go to Play, remove `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` from
  `native/android-cli/AndroidManifest.xml` and rebuild; the other four are fine.

Play Protect on sideloaded installs is a separate matter: none of these five are in the
"actively blocked" group (SMS, Accessibility, Notification Listener), so a Play Protect
*block* is unlikely — but the app now requests more than before, so a first-install
"scan recommended" prompt is still normal.

---

## 2. iOS (`builds/ios/ReadyDev-unsigned.ipa`)

Here is the honest mapping. iOS deliberately gives apps **no control** over power management:

| What you asked for | iOS equivalent | Status |
|---|---|---|
| Notifications | `UNUserNotificationCenter` | ✅ **Implemented** — permission requested at launch |
| Wakelock | `isIdleTimerDisabled` (keeps the **screen** awake) | ✅ **Implemented** — no CPU wakelock exists on iOS |
| Battery optimisation exemption | — | ❌ **Does not exist.** No API, no entitlement, no setting |
| App Standby exemption | — | ❌ **Does not exist.** iOS suspends background apps on its own schedule |
| Foreground service | — | ❌ **Does not exist.** iOS has no equivalent concept |

### What was implemented on iOS

- **`AppDelegate.swift`** requests notification authorisation (alert + sound + badge) at
  launch, and sets `application.isIdleTimerDisabled = true`.
- **`Info.plist`** declares `UIBackgroundModes = ["fetch", "processing"]` plus a
  `BGTaskSchedulerPermittedIdentifiers` entry. This is the *closest* iOS offers to background
  work: iOS may grant your app brief, **system-scheduled** windows. You do not control when
  they happen, and they are not a foreground service.
- The in-app permissions panel shows these honestly — "Not on iOS" for the three that don't
  exist, rather than pretending they work.

### If you need real background work on iOS

The only supported routes are the specific background modes Apple allows (audio playback,
location updates, VoIP, external accessory, Bluetooth), and each requires your app to
genuinely do that thing — App Review rejects apps that declare a mode they don't use. For a
web-wrapper app, **push notifications** are the realistic way to make something happen while
the app is closed.

---

## 3. Verifying it yourself

```bash
# List the permissions actually inside the APK
aapt2 dump badging builds/android/ReadyDev.apk | grep uses-permission

# Confirm the foreground service and its type
aapt2 dump xmltree --file AndroidManifest.xml builds/android/ReadyDev.apk | grep -A2 service
```

On the phone, after installing: open the app → **App permissions** panel → each row shows
live status and a button. "Unrestricted battery" can also be checked in
**Settings → Apps → Ready to be a Dev → Battery** (it should read **Unrestricted**).

## 4. Rebuilding after changes

```bash
powershell -ExecutionPolicy Bypass -File native/android-cli/build-apk.ps1
```

The iOS app rebuilds automatically on every push to GitHub.

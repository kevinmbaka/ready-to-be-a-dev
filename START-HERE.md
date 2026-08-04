# 👋 START HERE — the simple, do‑this‑exactly guide

This explains **everything**, one baby step at a time. No experience needed.
When a step says *click the green button*, just do that. Take your time.

Your GitHub username is **kevinmbaka**, so wherever you see `kevinmbaka` below, that's you.
We'll make a **new, separate repo** called **`ready-to-be-a-dev`**.

---

## 🧩 What you actually have

You have **one app** that lives in this folder (`D:\empty`). From it you get:

1. **A website** — your app, that anyone can open in a browser.
2. **An installable app on Android AND iPhone** — from that same website, users tap
   "Add to Home Screen" and it becomes a real app icon. No app store needed.
3. **A real Android app file** (`.apk`) — already built, in `builds\android\ReadyDev.apk`.
4. **An iPhone app file** (`.ipa`) — built for you by GitHub (a free cloud Mac), then you
   put it on your iPhone with a free tool called **Sideloadly**.

---

## Part 1 — See your app right now (30 seconds)

1. Open the folder `D:\empty`.
2. Double‑click **`index.html`**.
3. It opens in your browser. You should see **"I'm ready to be a dev"**, a box, a tick box,
   and a **Let's go** button. That's your app. 🎉

*(Some features like "install" only fully work once it's online — that's Part 2.)*

---

## Part 2 — Put it online (so phones can install it)

We'll use **GitHub Desktop** — it's a simple app with buttons, no typing commands.

### 2.1 Install GitHub Desktop
1. Go to **https://desktop.github.com** and click **Download**.
2. Install it and open it.
3. Click **Sign in to GitHub.com** and log in as **kevinmbaka** (this is the login only you
   can do — that's why I can't do this part for you).

### 2.2 Add this folder
1. In GitHub Desktop: **File → Add local repository**.
2. Click **Choose…**, pick the folder **`D:\empty`**, click **Add repository**.
   *(It's already set up as a repo, so it just appears.)*

### 2.3 Publish it (this creates your separate repo)
1. Click the blue **Publish repository** button at the top.
2. **Name:** type `ready-to-be-a-dev`
3. **Untick** the box **"Keep this code private."**
   👉 Important: it must be **public** so the free cloud Mac and free website work.
   (No secrets are in here — your signing key is hidden and not uploaded.)
4. Click **Publish repository**.

Done! Your separate repo now lives at:
**https://github.com/kevinmbaka/ready-to-be-a-dev**

### 2.4 Turn the website ON (GitHub Pages)
1. Open **https://github.com/kevinmbaka/ready-to-be-a-dev** in your browser.
2. Click **Settings** (top menu) → **Pages** (left menu).
3. Under **Source**, choose **Deploy from a branch**.
4. Set **Branch** to **main** and folder to **/ (root)**. Click **Save**.
5. Wait about 1–2 minutes, refresh the page. It shows a link like:
   **https://kevinmbaka.github.io/ready-to-be-a-dev/**

That link **is your website**. Open it on any phone:
- **Android (Chrome):** a pop‑up says **Install** → tap it. App icon appears.
- **iPhone (Safari):** tap the **Share** button → **Add to Home Screen** → **Add**.

Your Android `.apk` is also downloadable at:
`https://kevinmbaka.github.io/ready-to-be-a-dev/builds/android/ReadyDev.apk`

---

## Part 3 — Install the Android app (the `.apk`)

The file is at **`builds\android\ReadyDev.apk`** (and at the web link above).

On the Android phone:
1. Get the file onto the phone (email it to yourself, use a USB cable, or Google Drive —
   or just open the web link above on the phone).
2. Tap the **ReadyDev.apk** file.
3. It may say *"For your security…"* — tap **Settings**, turn on **Allow from this source**,
   then go back.
4. Tap **Install**. If a "Play Protect / scan" pop‑up appears, that's normal for a new app —
   tap to continue.
5. Open the app. Done. ✅

---

## Part 4 — Get it on your iPhone (with Sideloadly)

GitHub built the iPhone app file for you on a free cloud Mac. Now you grab it and put it on
your phone with **Sideloadly**. You only need a **free Apple ID** (no $99 needed).

### 4.1 Download the iPhone app file from GitHub
1. Open **https://github.com/kevinmbaka/ready-to-be-a-dev** → click the **Actions** tab.
2. Click the newest run named **"Build iOS IPA (cloud Mac)"**.
3. Wait until it shows a **green check ✓** (first build takes ~10 minutes — grab a snack).
4. Scroll to the bottom to **Artifacts**. Click **`ReadyDev-unsigned-ipa`** to download it.
5. It downloads as a `.zip`. **Unzip it** → you get **`ReadyDev-unsigned.ipa`**. That's the file.

> If the run didn't start on its own: on the Actions page, click **"Build iOS IPA (cloud Mac)"**
> on the left, then the **Run workflow** button → **Run workflow**.

### 4.2 Put it on your iPhone with Sideloadly
1. On your PC, install **Sideloadly** from **https://sideloadly.io** (also install **iTunes**
   from Apple's site if Sideloadly asks).
2. Plug your iPhone into the PC with a USB cable. On the phone tap **Trust** if asked.
3. Open **Sideloadly**. Your iPhone should show at the top.
4. **Drag `ReadyDev-unsigned.ipa`** into the Sideloadly window (the "IPA or App" box).
5. Type your **Apple ID email** in the box.
6. Click **Start**. Enter your Apple ID password when Sideloadly asks (it goes straight to
   Apple — I never see it).
7. Wait for it to say **Done**.

### 4.3 Trust it on the iPhone, then open it
1. On the iPhone: **Settings → General → VPN & Device Management**.
2. Tap your **Apple ID / email** under "Developer App" → tap **Trust**.
3. Go to the home screen and open the app. 🎉

> **Heads‑up:** with a free Apple ID, the app works for **7 days**. When it stops opening,
> just do Part 4.2 again to refresh it for another 7 days.

---

## Part 5 — Changing your app later

1. Edit the files in `D:\empty` (start with `index.html`).
2. Open **GitHub Desktop** → type a short note in the bottom‑left box → click **Commit to main**
   → click **Push origin**.
3. That automatically updates your **website** and rebuilds the **iPhone app file** (grab the
   new one from the Actions tab like in Part 4.1).
4. For a new **Android** `.apk`, double‑click nothing — instead right‑click
   `native\android-cli\build-apk.ps1` → **Run with PowerShell** (or ask me). The fresh
   `.apk` appears in `builds\android\`.

---

## 🗺️ Where everything is

```
D:\empty
├─ START-HERE.md          ← this guide
├─ index.html, app.js …   your app (the website)
├─ builds\
│  ├─ android\ReadyDev.apk         the Android app (ready to install)
│  └─ ios\HOW-TO-BUILD-IPA.md      about the iPhone build
├─ native\                the "wrapper" projects + iPhone build setup
├─ HOW-I-BUILT-THIS.md    exactly how the .apk and .ipa were made (the techy story)
├─ README.md              short project overview
├─ GUIDE.md               the "why" (Apple/Google rules) with sources
└─ BUILD.md               native build reference
```

Stuck on any step? Tell me the step number and what you see, and I'll walk you through it.

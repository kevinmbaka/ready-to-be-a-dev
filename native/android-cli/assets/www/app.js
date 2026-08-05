// ---- Start-page interaction -------------------------------------------------
const form = document.getElementById('start-form');
const nameInput = document.getElementById('name');
const readyBox = document.getElementById('ready');
const goBtn = document.getElementById('go');
const result = document.getElementById('result');

// The "Let's go" button unlocks only when the checkbox is ticked.
function syncGate() {
  goBtn.disabled = !readyBox.checked;
}
readyBox.addEventListener('change', syncGate);
syncGate();

// Remember the name across launches (nice touch for an installed app).
try {
  const saved = localStorage.getItem('devName');
  if (saved) nameInput.value = saved;
} catch (_) {}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!readyBox.checked) return;
  const name = nameInput.value.trim();
  try { localStorage.setItem('devName', name); } catch (_) {}
  result.textContent = name
    ? `Let's build, ${name}. 🚀`
    : `Let's build. 🚀`;
});

// ---- Install to home screen -------------------------------------------------
const installBtn = document.getElementById('install');
const iosHelp = document.getElementById('ios-help');

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const isIOS =
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPadOS 13+ reports as Mac; detect via touch.
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Android / desktop Chrome: capture the native install prompt.
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

window.addEventListener('appinstalled', () => {
  installBtn.hidden = true;
  iosHelp.hidden = true;
});

// iOS has no install prompt — show a short how-to instead (Safari only, not installed).
if (isIOS && !isStandalone) {
  iosHelp.hidden = false;
}

// The download links point at files on the website. Inside the packaged native
// app (APK/IPA) those paths don't exist, so hide that section there.
const downloads = document.querySelector('.downloads');
const isWeb = /^https?:$/.test(location.protocol);
if (downloads && !isWeb) {
  downloads.hidden = true;
}

// ---- Native permissions panel ----------------------------------------------
// Android exposes the `AndroidPerms` bridge (see MainActivity.java).
// iOS has no equivalent for most of these — see PERMISSIONS.md.
const perms = document.getElementById('perms');
const permNote = document.getElementById('perm-note');
const android = window.AndroidPerms;
const isIOSNative = !isWeb && !android; // packaged iOS build

if (perms && (android || isIOSNative)) {
  perms.hidden = false;

  const rows = {};
  document.querySelectorAll('.perm-row').forEach((row) => {
    rows[row.dataset.perm] = {
      state: row.querySelector('[data-state]'),
      btn: row.querySelector('.perm-btn')
    };
  });

  const set = (key, label, on, btnText, disabled) => {
    const r = rows[key];
    if (!r) return;
    r.state.textContent = label;
    r.state.dataset.on = on ? 'yes' : 'no';
    if (btnText !== undefined) r.btn.textContent = btnText;
    r.btn.disabled = !!disabled;
  };

  if (android) {
    let serviceOn = false;
    let wakeOn = false;

    const refresh = () => {
      const notif = android.hasNotifications();
      set('notifications', notif ? 'Granted' : 'Not granted', notif,
          notif ? 'Settings' : 'Allow');

      const batt = android.isBatteryUnrestricted();
      set('battery', batt ? 'Unrestricted' : 'Restricted', batt,
          batt ? 'Settings' : 'Allow');

      set('service', serviceOn ? 'Running' : 'Off', serviceOn,
          serviceOn ? 'Stop' : 'Start');
      set('wakelock', wakeOn ? 'On' : 'Off', wakeOn, wakeOn ? 'Turn off' : 'Turn on');
    };

    // Called from native code when a permission dialog closes.
    window.onAndroidPermsChanged = refresh;

    document.querySelectorAll('.perm-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        switch (btn.dataset.action) {
          case 'notifications':
            android.hasNotifications() ? android.openAppSettings()
                                       : android.requestNotifications();
            break;
          case 'battery':
            android.isBatteryUnrestricted() ? android.openAppSettings()
                                            : android.requestBatteryUnrestricted();
            break;
          case 'service':
            serviceOn = !serviceOn;
            serviceOn ? android.startBackgroundService(wakeOn)
                      : android.stopBackgroundService();
            refresh();
            break;
          case 'wakelock':
            wakeOn = !wakeOn;
            android.setKeepScreenOn(wakeOn);
            if (serviceOn) android.startBackgroundService(wakeOn); // update the CPU lock
            refresh();
            break;
        }
      });
    });

    permNote.textContent =
      'Android asks you to confirm each of these — an app cannot grant them to itself.';
    refresh();
  } else {
    // iOS: only notifications and a screen wakelock exist. Be honest about the rest.
    set('notifications', 'Asked at launch', false, 'Settings');
    set('battery', 'Not on iOS', false, 'n/a', true);
    set('service', 'Not on iOS', false, 'n/a', true);
    set('wakelock', 'Screen only', true, 'n/a', true);

    rows.notifications.btn.addEventListener('click', () => {
      alert('Open the iPhone Settings app → Ready to be a Dev → Notifications.');
    });

    permNote.textContent =
      'iOS has no battery-optimisation exemption, app-standby control, or foreground ' +
      'services. Apple manages background activity itself.';
  }
}

// ---- Service worker (offline + installability) ------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('service-worker.js')
      .catch((err) => console.warn('SW registration failed:', err));
  });
}

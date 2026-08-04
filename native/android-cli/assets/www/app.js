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

// ---- Service worker (offline + installability) ------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('service-worker.js')
      .catch((err) => console.warn('SW registration failed:', err));
  });
}

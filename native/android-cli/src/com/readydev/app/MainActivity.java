package com.readydev.app;

import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Framework-only wrapper: shows the bundled PWA (assets/www) in a full-screen
 * WebView, and exposes a small `AndroidPerms` bridge so the web UI can check
 * and request the app's runtime permissions.
 */
public class MainActivity extends Activity {

    private static final int REQ_NOTIFICATIONS = 1001;

    private WebView web;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);      // enables localStorage used by the app
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        web.setWebViewClient(new WebViewClient()); // keep navigation inside the app
        web.addJavascriptInterface(new PermissionBridge(), "AndroidPerms");

        setContentView(web);
        web.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == REQ_NOTIFICATIONS) {
            notifyWeb(); // let the page refresh its status display
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        notifyWeb(); // returning from a Settings screen may have changed things
    }

    /** Tell the web layer that permission state may have changed. */
    private void notifyWeb() {
        if (web == null) return;
        web.post(new Runnable() {
            public void run() {
                web.evaluateJavascript(
                        "window.onAndroidPermsChanged && window.onAndroidPermsChanged();", null);
            }
        });
    }

    // ---- JS bridge ----------------------------------------------------------
    // NOTE: @JavascriptInterface methods are called on a background thread,
    // so anything touching the UI/activity is posted to the main thread.

    private class PermissionBridge {

        @JavascriptInterface
        public boolean hasNotifications() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                NotificationManager nm =
                        (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                return nm == null || nm.areNotificationsEnabled();
            }
            return checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED;
        }

        @JavascriptInterface
        public void requestNotifications() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                // Pre-Android 13: no runtime prompt, send them to app settings instead.
                openAppSettings();
                return;
            }
            runOnUiThread(new Runnable() {
                public void run() {
                    requestPermissions(
                            new String[]{android.Manifest.permission.POST_NOTIFICATIONS},
                            REQ_NOTIFICATIONS);
                }
            });
        }

        @JavascriptInterface
        public boolean isBatteryUnrestricted() {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm == null) return false;
            return pm.isIgnoringBatteryOptimizations(getPackageName());
        }

        /**
         * Opens the system dialog asking to exempt this app from battery
         * optimisation (Doze + App Standby). The user must accept it -- an app
         * can never grant this to itself.
         */
        @JavascriptInterface
        public void requestBatteryUnrestricted() {
            runOnUiThread(new Runnable() {
                public void run() {
                    try {
                        Intent i = new Intent(
                                Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                                Uri.parse("package:" + getPackageName()));
                        startActivity(i);
                    } catch (Exception e) {
                        // Some OEM builds block the direct dialog: fall back to the list.
                        try {
                            startActivity(new Intent(
                                    Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
                        } catch (Exception ignored) {
                            openAppSettings();
                        }
                    }
                }
            });
        }

        @JavascriptInterface
        public void startBackgroundService(boolean withWakeLock) {
            Intent i = new Intent(MainActivity.this, KeepAliveService.class);
            i.putExtra(KeepAliveService.EXTRA_WAKELOCK, withWakeLock);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(i);
            } else {
                startService(i);
            }
        }

        @JavascriptInterface
        public void stopBackgroundService() {
            stopService(new Intent(MainActivity.this, KeepAliveService.class));
        }

        /** Keep the screen on while the app is in front (screen-level wake lock). */
        @JavascriptInterface
        public void setKeepScreenOn(final boolean on) {
            runOnUiThread(new Runnable() {
                public void run() {
                    if (web != null) web.setKeepScreenOn(on);
                }
            });
        }

        @JavascriptInterface
        public void openAppSettings() {
            runOnUiThread(new Runnable() {
                public void run() {
                    Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                            Uri.parse("package:" + getPackageName()));
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(i);
                }
            });
        }
    }
}

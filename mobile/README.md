# RouteWeather Pro — phone app (Android + iPhone)

This folder wraps the web app (`../routeweather-pro.html`) into real phone apps using Capacitor.
Nothing here is built on your own computer: the build robots do it.

- Android: `.github/workflows/android.yml` (GitHub Actions) -> download the result from the Actions tab.
- iPhone: `codemagic.yaml` (Codemagic) -> goes to TestFlight.
- App icon + splash screen: made from `resources/` (replace `icon-only.png` etc. to change them).
- `scripts/prepare-web.js` copies the web app in; `scripts/configure-native.js` adds the
  `routeweather://` link that brings people back from the Strava login.

App ID: `com.roberpesca.routeweather`  ·  Name: RouteWeather Pro

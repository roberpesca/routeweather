// Copies the web app (one folder up) into mobile/www so Capacitor can pack it into the phone app.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = path.join(root, '..');            // the main RouteWeather Pro folder (or repo root)
const www = path.join(root, 'www');

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

// find the main page: routeweather-pro.html or index.html
const candidates = ['routeweather-pro.html', 'index.html'];
const page = candidates.find(f => fs.existsSync(path.join(src, f)));
if (!page) { console.error('Cannot find routeweather-pro.html next to the mobile folder'); process.exit(1); }
fs.copyFileSync(path.join(src, page), path.join(www, 'index.html'));

for (const f of ['manifest.json']) {
  if (fs.existsSync(path.join(src, f))) fs.copyFileSync(path.join(src, f), path.join(www, f));
}
if (fs.existsSync(path.join(src, 'icons'))) {
  fs.cpSync(path.join(src, 'icons'), path.join(www, 'icons'), { recursive: true });
}
// No service worker inside the phone app (the app already stores its files on the phone)
console.log('Web files copied to mobile/www (' + page + ' -> index.html)');

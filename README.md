# S1gns Patreon Navigator

This folder contains the user-ready S1gns Patreon Navigator website.

The easiest member experience is a hosted link. This folder can also be opened locally as a backup copy.

## How To Open It

Open `index.html` in your browser.

Keep all files and folders together. The guide expects these files to stay beside each other:

```text
index.html
styles.css
app.js
manifest.webmanifest
service-worker.js
pwa-register.js
library-content-validator.js
progress-import.js
data.js
library-content.json
README.md
assets/
local_cache/
```

Install/offline app features work when this folder is served from `https://` hosting or from `localhost`. Directly opening `index.html` still lets you use the guide, but browsers do not allow install/offline service-worker behavior from a plain file path.

If the page opens blank or your browser blocks local files, start a simple local web server from this folder:

```sh
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## What You Can Do

- Search and browse the S1gns Patreon library.
- Follow guided pathways.
- Mark resources complete.
- Save favorites.
- Add private notes.
- Export and import your progress JSON.
- Automatically load and cache the latest guide update when it is available.

Your progress, favorites, completed items, notes, and cached library updates stay local in your browser.

## Backing Up Progress

Use `Export progress JSON` to save a backup of your favorites, completed resources, notes, and recent items.

Use `Import progress JSON` to merge a previous backup into the current browser.

## Updating Library Content

When the guide opens, it automatically checks the public update feed for the latest published `library-content.json`.

This package also includes a `local_cache/` folder seeded from GitHub when the package was built.

If GitHub is available, the guide loads the latest library and saves a browser-local cache. If GitHub is unavailable later, the guide falls back to that browser cache. If this is your first time opening the guide and GitHub is unavailable, it falls back to the packaged `local_cache/` data.

The `Guide Updates / Library Status` section shows status only. You do not need to import, export, refresh, or reset library JSON inside the website.

## Troubleshooting

If resources, styling, or the logo do not appear, make sure the files in this folder were not moved apart.

If your saved notes or favorites are missing, check that you are using the same browser and browser profile. Browser storage is local to each browser profile.

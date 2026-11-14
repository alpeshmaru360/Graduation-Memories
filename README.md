# Graduation Memories

Graduation Memories is a Windows desktop photo wall with 100 fictional graduates and bundled synthetic portraits. The gallery, profiles, filters, slideshow, and imports use local files. Electron blocks web requests in the application session.

## Run from source

Install Node.js 22.12 or later and use PowerShell in the project folder. Dependency and installer-tool downloads need internet on the first setup.

```powershell
npm ci
npm run dev
```

`npm run dev` type-checks and builds the renderer, then opens Electron. Run it again after editing source files. `npm run build` produces the renderer in `dist`. `npm start` opens the existing build.

## Build the Windows installer

```powershell
npm run dist
```

Electron Builder writes an NSIS installer to `release`. Open it on Windows and launch **Graduation Memories** from the desktop shortcut or Start menu. The installer is unsigned.

## Build the macOS disk images

Copy the project source to a Mac and open Terminal in the project folder. With Node.js 22.12 or later installed, run:

```bash
npm ci
npm run dist:mac
```

The `release` folder will contain an `arm64.dmg` for Apple silicon Macs and an `x64.dmg` for Intel Macs. Open the appropriate disk image and drag **Graduation Memories** into **Applications**.

For distribution to other Macs, configure Electron Builder with a Developer ID Application certificate and Apple notarization credentials before building. A local build without those credentials may be blocked by Gatekeeper when shared.

## Replace the demo collection

1. Save a spreadsheet as **CSV UTF-8**. Start with [the sample CSV](examples/students.csv).
2. Include `studentId`, `name`, `degree`, `department`, and `graduationYear`. Each student ID must be unique. Optional columns are `honors`, `university`, and `photo`.
3. Put your JPG, PNG, or WebP portraits in one folder. Put each image's filename, including its extension, in the `photo` column. You can also name a file after the corresponding student ID, for example `GRAD2026-001.jpg`.
4. Open **Data management**, choose the CSV, and select **Match photo folder**. Review the rows and photo matches. Records without a matched photo show a placeholder with the student's initials.
5. Select **Replace gallery with this collection** to save. The CSV import replaces the full active collection. Keep a copy of the source CSV and photos if you need to restore or revise it.

The app stores `students.json`, `settings.json`, and imported media in its Electron user-data directory. The installed app normally uses `%APPDATA%\Graduation Memories`. Back up that directory to preserve an installation's collection and settings.

## Present the collection

- Select a photo to open a profile. Use **Previous**, **Next**, the arrow keys, or swipe. **Escape** returns to the gallery.
- Use the search button to show student search and department filtering. The year menu filters the class. The slideshow follows the current results.
- Use **Slideshow** to begin, and the play/pause button on the profile to control playback. Set a 5-, 10-, or 15-second interval in **Settings**.
- Press **F11** or select the fullscreen button. Enable kiosk mode in **Settings**, then use **Ctrl+Shift+K** to exit it.
- Change the university name, logo, default class, wide-screen column count, motion, and startup fullscreen preference in **Settings**.

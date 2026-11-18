# PosterBot

> Small printer. Bot-sized possibilities.

Turn a PDF page into a wall-sized print. PosterBot tiles the page across a grid of
ordinary printer sheets, adds overlap and cut guides, and hands back one print-ready
PDF you trim and tape together.

**By Nevel Labs.**

## Status

Transferred out of ChatGPT Codex hosting (`posterbot.mandarobin.chatgpt.site`) on
2026-11-18 and now maintained here. The transferred source is byte-identical to what
was being served, with three exceptions:

- the Cloudflare bot-detection `<script>` the old host injected before `</body>` was removed
- an inline SVG favicon was added (the old host served a 404 page for `/favicon.ico`)
- in `vendor/pdf-lib.min.js`, four literal `U+FFFD` characters inside pdf-lib's own
  string literals (its PDFDocEncoding table and its replacement-character constant)
  were rewritten as `�` escapes — exactly equivalent JavaScript, +12 bytes. Some
  publishing targets reject literal replacement characters. Verified: the library
  still exports the same 311 names, and exporting the built-in example poster
  produces a byte-for-byte identical 312,571-byte PDF before and after.

Also published as a private Claude Artifact:
<https://claude.ai/artifact/Apu5EYTaJpgfS7yjyiJ4es>. That copy is this repo's
`index.html` plus its five scripts and stylesheet, so re-publishing the same files
to that URL updates it in place.

## Architecture

Static, dependency-free, **100% client-side** — there is no backend, no build step,
no package manager, and no network call of any kind. Uploaded PDFs never leave the
browser. That is a product promise stated in the header ("Your files stay on your
device"); keep it true.

```
index.html              markup + all element IDs the scripts bind to
style.css               layout and theming, driven entirely by CSS custom properties
theme.js                4 brand palettes -> CSS custom properties, persisted to localStorage
app.js                  everything else: queue, preview render, tiling math, PDF export
vendor/pdf.min.js       PDF.js — reads and renders the source PDF
vendor/pdf.worker.min.js PDF.js worker (path is hardcoded in app.js line 1)
vendor/pdf-lib.min.js   pdf-lib — writes the tiled output PDF
```

### How the tiling works

All geometry is in PDF points (72 pt = 1 in). `config()` in `app.js` is the single
source of truth:

- `paperSizes` gives the sheet in points; orientation swaps width/height
- each sheet loses `margin` on all four sides, leaving a `tw × th` printable tile
- tiles overlap by `overlap`, so the assembled poster is
  `w = cols * tw - (cols - 1) * overlap` (and likewise for `h`)
- `placement()` scales the source page to fit inside `w × h` and centers it —
  **fit, never crop**

### Brand themes

`theme.js` holds four palettes — `nevel` (Nevel Labs / NevelOS), `books`
(Books, Bots & Brains), `robot`, `notions` (Nevels Notions). Each sets the same set
of CSS variables (`--bg`, `--surface`, `--ink`, `--primary`, `--accent`, `--soft`,
`--stage`, `--muted`, `--border`, `--focus`), so `style.css` never hardcodes a brand
color. Selection persists under the localStorage key `paperpatch-brandtheme` — note
the legacy name; changing it would silently reset everyone's saved theme.

## Running it

It is static files, so any static server works. Serving over `http://` rather than
opening `index.html` as a `file://` URL matters — the PDF.js worker will not load
from `file://`.

```powershell
python -m http.server 4178
```

Then open http://localhost:4178.

In Claude Code, `.claude/launch.json` defines a `posterbot` server that does the
same thing and opens the browser pane at it.

## Features

- **Single poster** — enlarge one page of one PDF
- **Bulk generator** — queue several PDFs, apply one layout to all, get one combined PDF
- "Enlarge every page" expands each PDF to one poster per page
- Presets 2×2 / 3×3 / 4×4, or custom up to 20 × 20 sheets
- US Letter / A4 / A3 / US Legal, portrait or landscape
- Overlap ¼ in / ½ in / none, margin ¼ in / ½ in / borderless
- 150 / 200 / 300 DPI
- Optional cut guides and `row · column` sheet labels
- Live preview with the sheet grid overlaid, and the assembled size in inches and cm

## Printing

Print the downloaded PDF at **Actual size / 100%** with "Fit to page" **off**, or the
sheets will not line up.

## Gotchas for future changes

- `app.js` binds by element ID via `$(id)`. Renaming or removing an ID in
  `index.html` breaks it silently — there are no tests and no type checking.
- `pdfjsLib.GlobalWorkerOptions.workerSrc` on line 1 of `app.js` is a relative path.
  It must stay correct relative to wherever `index.html` is served from.
- `setBusy()` disables **every** `input`, `select`, and `button` on the page, then
  re-enables them all. Any new control that should stay disabled needs special casing.
- Preview renders are cancellable and raced — `revision` / `ticket` guard against a
  stale render winning. Preserve that pattern when touching `update()`.
- The vendor files are minified third-party builds. Do not hand-edit them; replace
  them wholesale and re-test if you upgrade.

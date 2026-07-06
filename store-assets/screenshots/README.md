# Chrome Web Store Screenshots

Drop the store screenshots (and promo tiles) in this folder. It is **not** part of the
extension — exclude `store-assets/` when packaging the upload ZIP.

## Requirements

| Asset | Size | Format | Needed |
|-------|------|--------|--------|
| Screenshot(s) | **1280×800** (preferred) or 640×400 | PNG or JPEG (24-bit, no alpha) | At least 1, up to 5 |
| Small promo tile | 440×280 | PNG or JPEG | Recommended |
| Marquee promo tile | 1400×560 | PNG or JPEG | Optional |

- Use the same aspect ratio for every screenshot (all 1280×800 is cleanest).
- Show the extension **in action** on a real page — not just the popup on a blank tab.
- No misleading content, no device/phone mockups (this is a desktop Chrome extension).

## Suggested shots (matches CHROMEWEBSTORE.md)

1. `01-overview.png` — Popup open beside a real page, with red **X** markers on flagged
   images and the issue list showing the summary header (grade + counts) and filter tabs.
2. `02-issue-details.png` — The **Audit Report** modal open for one image, showing its
   thumbnail and the specific issues found.
3. `03-settings.png` — The **Settings** tab, showing the configurable limits and options.
4. `04-report.png` — An exported **HTML report** open in a browser tab (summary + per-image cards).
5. `05-help.png` — The bundled **Help** page (Definitions & Fixes), grouped by priority.

## Naming

Use `NN-short-name.png` (zero-padded) so they sort in display order, e.g. `01-overview.png`.

## Tips for capturing at 1280×800

- Set the browser window so the captured area is exactly 1280×800, or capture larger and
  crop/scale to 1280×800.
- Keep text legible — the store downscales thumbnails, so avoid tiny UI details as the focal point.
- After capturing, update the **Graphics & Assets** table in `CHROMEWEBSTORE.md` with each
  filename and mark it ✅ Ready.

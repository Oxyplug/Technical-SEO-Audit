# Chrome Web Store Listing — Oxyplug - Image Audit

> Last Updated: 2026-07-06

## Store Listing

**Extension Name** [REQUIRED]
Oxyplug - Image Audit

**Short Description** [REQUIRED]
<!-- Max 132 chars. Matches manifest.json __MSG_extensionDescription__ (117 chars). -->
Audit your page images for SEO & performance: alt text, dimensions, file size, next-gen formats, lazy loading and LCP.

**Detailed Description** [REQUIRED]
🚀 Oxyplug - Image Audit scans every image on the page you are viewing and flags the issues that hurt your SEO and page-speed scores, then marks each problem image directly on the page so you can see exactly what needs fixing. 🛠️

🔍 What it checks:
❌ Broken Images: Images that fail to load (404 or any non-200 status).
📄 Missing Source: Missing or empty src attributes.
🏷️ Alt Text Issues: Missing, empty, or overly long alt text (length limit is configurable).
📐 Layout Shifts: Missing width or height attributes.
📏 Incorrect Sizing: Rendered size that differs from the image's real dimensions.
🎞️ Distortion: Rendered aspect-ratio that differs from the original aspect-ratio.
💾 Heavy Files: File sizes larger than a limit you set.
🖥️ Retina Compatibility: Missing 2x/3x versions for high-DPR (retina) screens.
⚡ Modern Formats: Missing next-gen formats (WebP, AVIF).
💤 Faulty Lazy-Loading: Below-the-fold images that aren't lazy-loaded.
🎯 LCP Identification: Pinpoints exactly which image is the Largest Contentful Paint (LCP) image.
🏎️ Core Web Vitals: Flags LCP images that aren't loaded eagerly, preloaded, or decoded synchronously.

🕹️ How to use it:
🌐 Navigate to the page you want to audit.
🧩 Click the Oxyplug - Image Audit icon.
▶️ Press Start. The extension automatically scrolls the page to trigger lazy images, then lists every issue it finds.
🎯 Click any issue to jump directly to that image on the page. Use the filter tabs to focus on one issue type, exclude images you don't care about, or review your last 10 audits in History ⏳.
📊 Save or share your findings: Export a full HTML report, export a CSV for spreadsheets, or copy a text summary. Every check also has a built-in definition and fix in the Help tab 💡.

🔒 Privacy First
Your audit results and settings stay on your device. The extension does not collect, sell, or transmit your data to any server, and contains absolutely zero analytics or tracking.

Support:
Questions or feedback? Visit https://www.oxyplug.com/contact-us/

**Category** [REQUIRED]
Developer Tools

**Single Purpose** [REQUIRED]
Analyzes the images on the current web page and reports SEO and performance issues with them.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | assets/icons/128.png |
| Screenshot 1 [REQUIRED] | 1280×800 | ✅ Ready | store-assets/screenshots/01-overview.png |
| Screenshot 2 [RECOMMENDED] | 1280×800 | ✅ Ready | store-assets/screenshots/02-issue-details.png |
| Screenshot 3 [RECOMMENDED] | 1280×800 | ✅ Ready | store-assets/screenshots/03-settings.png |
| Screenshot 4 | 1280×800 | ✅ Ready | store-assets/screenshots/04-report.png |
| Screenshot 5 | 1280×800 | ✅ Ready | store-assets/screenshots/05-help.png |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | |

### Screenshot Notes
- **Screenshot 1** — The extension popup open beside a real web page, with red "X" markers overlaid on flagged images and the issue list showing counts per filter tab.
- **Screenshot 2** — A single issue's detail modal ("Audit Report") open on the page, showing the specific problems for one image.
- **Screenshot 3** — The Settings tab, showing the configurable limits (max file size, max alt length, max scrolling, colors).
- **Screenshot 4** — An exported HTML report open in a browser tab (summary/grade and per-image cards).
- **Screenshot 5** — The bundled Help page (Definitions & Fixes), grouped by priority.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| storage | permissions | Saves the user's settings (file-size/alt-length limits, colors, exclusions) and the last 10 audit results locally on the device so they persist between sessions. No data leaves the device. |
| webRequest | permissions | Observes image responses (`onHeadersReceived`) to read the `Content-Length` header and report each image's file size — a core audit metric. This must work for cross-origin/CDN images, which the Performance API cannot measure (it returns 0 without a Timing-Allow-Origin header), so broad host access is required. Observation only: no requests are blocked, redirected, or modified, and nothing is sent off the device. |
| host_permissions: http://*/* and https://*/* | host_permissions | Oxyplug - Image Audit is a technical-SEO tool that audits the images on whatever page the user chooses — which can be any website — so it cannot enumerate a fixed list of hosts. The content script needs host access to inspect the page's `<img>` elements, scroll to trigger lazy-loaded images, and overlay issue markers; the same broad access is what lets `webRequest` read cross-origin image file sizes. The extension only acts when the user explicitly clicks "Start" in the popup, and it never collects or transmits any data. |

<!-- REVIEW RISK: this permission set puts the listing in the strictest review tier.
     If you refactor to activeTab + chrome.scripting + Performance API for file sizes,
     you can drop webRequest and the broad host_permissions and update this table. -->

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

All settings and audit results are stored locally via `chrome.storage.local`. Nothing is
transmitted off-device. The extension performs no analytics and contacts no server. The only
outbound navigation is when the user clicks a "Learn More" link, which opens an oxyplug.com
documentation page in a new tab.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | — | No |
| Health info | No | No | — | No |
| Financial info | No | No | — | No |
| Authentication info | No | No | — | No |
| Personal communications | No | No | — | No |
| Location | No | No | — | No |
| Web history | No | No | — | No |
| User activity | No | No | — | No |
| Website content | No | No | — | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [REQUIRED]
https://www.oxyplug.com/docs/oxy-image-audit/privacy/
<!-- Confirm this page is published and live before submitting. Fallback (already live):
     https://github.com/Oxyplug/Oxyplug-Image-Audit/blob/main/PRIVACY_POLICY.md -->

## Distribution

**Visibility**: Public
**Regions**: All regions

## Developer Info

**Publisher Name** [REQUIRED]
Oxyplug

**Contact Email** [REQUIRED]
support@oxyplug.com

**Support URL / Email** [RECOMMENDED]
support@oxyplug.com

**Homepage URL** [RECOMMENDED]
https://www.oxyplug.com/

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-07-06 | Initial Chrome Web Store submission. Includes on-page issue markers, filterable results, exportable HTML/CSV reports, copy-summary, a bundled Help page, exclusions, and audit history. | Draft |

## Review Notes

### Known Issues / Limitations
- Broad host permissions (`http://*/*`, `https://*/*`) plus `webRequest` place this listing in
  the strictest review tier. Justifications above must be pasted into the dashboard verbatim.
- `webRequest` is used in observation mode only (`onHeadersReceived`, no blocking) — MV3-compliant.
- Content script runs on all http/https pages to allow auditing any site the user selects.

### Broad Host Permissions — reviewer note (expected in-depth review)
The Chrome Web Store flags this extension for an in-depth review because of the broad host
permissions. This is expected and the access is intrinsic to the product, not incidental:

- **Purpose:** it audits the images on *whatever page the user chooses*, which can be any
  website — there is no fixed set of hosts to enumerate.
- **`activeTab` is not sufficient:** the file-size audit relies on `webRequest`
  (`onHeadersReceived`) to read `Content-Length`, and `webRequest` requires broad host
  permissions. The Performance API cannot replace it because it reports 0 bytes for
  cross-origin (CDN) images without a `Timing-Allow-Origin` header.
- **Least privilege in practice:** the extension acts only on an explicit user gesture
  ("Start"), performs read-only observation (no requests blocked/redirected/modified), stores
  everything locally, and transmits nothing off the device.

If the reviewer requires it, the file-size feature could be dropped to move to `activeTab`, but
that would remove a core, user-visible audit metric.

### Rejection History
<!-- None yet. -->

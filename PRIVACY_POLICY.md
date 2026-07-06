# Privacy Policy — Oxyplug - Image Audit

_Last updated: 2026-07-06_

Oxyplug - Image Audit ("the extension") is a browser tool that analyzes the images on a web
page you choose and reports SEO and performance issues with them. This policy explains what the
extension does and does not do with your information.

## Summary

**The extension does not collect, store off your device, sell, or share any personal
information.** It has no analytics, no tracking, and no backend server.

## What the extension accesses

When you run an audit on a page, the extension reads:

- The `<img>` elements on that page and their attributes (such as `src`, `alt`, `width`,
  `height`, `loading`, `srcset`, and `decoding`).
- The `Content-Length` response header of images loading in the active tab, in order to report
  each image's file size.
- The page's URL and title, used to label your audit history and to build the list of images.

This information is processed **locally in your browser** while you run an audit.

## What the extension stores

The extension uses your browser's local extension storage (`chrome.storage.local`) to save:

- Your settings (for example: maximum file-size limit, maximum alt-text length, scrolling
  limits, marker colors, and image exclusion lists).
- The results of your most recent audits (up to the last 10), so you can review them later.

All of this data stays **on your device**. It is never uploaded, and it is removed if you
uninstall the extension or clear its data.

## What the extension does NOT do

- It does **not** transmit your browsing data, audit results, or settings to Oxyplug or any
  third party.
- It does **not** use `chrome.storage.sync` or any cloud sync.
- It does **not** include analytics, advertising, or tracking of any kind.
- It does **not** sell or share your data with anyone.

## External links

The extension shows "Learn More" links next to certain issues. If you click one, your browser
opens an Oxyplug documentation page (on oxyplug.com) in a new tab. These links include basic
non-personal parameters (the domain of the page you were auditing and a fixed campaign tag) so
Oxyplug can understand which documentation is useful. No personal data is included. Visiting
oxyplug.com is governed by the Oxyplug website's own privacy policy.

## Permissions

- **Host access to websites** — required so the extension can inspect and mark images on the
  page you choose to audit.
- **`webRequest`** — used only to observe image response headers (file sizes). No web requests
  are blocked or modified.
- **`storage`** — used to save your settings and audit history locally.

## Changes to this policy

If this policy changes, the "Last updated" date above will be revised.

## Contact

For questions about this policy, email support@oxyplug.com or visit https://www.oxyplug.com/.

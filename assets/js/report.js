class Report {
  // Issue types grouped by severity. Anything not listed is treated as `critical`.
  static warningIssues = ['nextGenFormatsIssue', 'lazyLoadIssue', 'preloadLcpIssue'];
  static infoIssues = ['lcpIssue', 'decodingIssue'];

  // Human-friendly labels for the camelCase issue type keys.
  static labels = {
    loadFailsIssue: 'Load fail',
    srcIssue: 'Missing/empty src',
    altIssue: 'Alt text',
    widthIssue: 'Missing width',
    heightIssue: 'Missing height',
    renderedSizeIssue: 'Rendered size',
    aspectRatioIssue: 'Aspect ratio',
    filesizeIssue: 'File size',
    nxIssue: 'No 2x',
    nextGenFormatsIssue: 'Next-gen format',
    lazyLoadIssue: 'Lazy loading',
    preloadLcpIssue: 'LCP preload',
    lcpIssue: 'LCP image',
    decodingIssue: 'Decoding',
  };

  /**
   * Severity bucket for a given issue type.
   * @param issueType
   * @returns {'info'|'warning'|'critical'}
   */
  static severityOf(issueType) {
    if (Report.infoIssues.includes(issueType)) return 'info';
    if (Report.warningIssues.includes(issueType)) return 'warning';
    return 'critical';
  }

  /**
   * Friendly label for an issue type.
   * @param issueType
   * @returns {string}
   */
  static labelOf(issueType) {
    return Report.labels[issueType] || issueType;
  }

  /**
   * Whether an issues object actually holds any flagged images.
   * @param issues
   * @returns {boolean}
   */
  static hasData(issues) {
    return Boolean(issues && issues.issues && Object.keys(issues.issues).length);
  }

  /**
   * Build a summary from an audit issues object.
   * @param issues
   * @returns {Promise<object>}
   */
  static async summarize(issues) {
    const items = (issues && issues.issues) ? issues.issues : {};
    const urls = new Set();
    let totalIssues = 0;
    let critical = 0, warning = 0, info = 0;
    let lcp = null;

    for (const item of Object.values(items)) {
      urls.add(item.url);
      (item.issueTypes || []).forEach((type) => {
        totalIssues++;
        const severity = Report.severityOf(type);
        if (severity === 'critical') critical++;
        else if (severity === 'warning') warning++;
        else info++;
        if (type === 'lcpIssue') lcp = item.url;
      });
    }

    // Measured weight of the flagged images (from the file sizes captured while browsing).
    const filesizes = (await Common.getLocalStorage('image_filesizes')) || {};
    let weightKB = 0;
    for (const url of urls) {
      if (filesizes[url]) weightKB += filesizes[url];
    }

    let grade;
    if (critical > 0) grade = 'Poor';
    else if (warning > 0) grade = 'Needs work';
    else if (info > 0) grade = 'Good';
    else grade = 'Perfect';

    return {
      page: issues && issues.audit ? issues.audit.page : '',
      date: issues && issues.audit ? issues.audit.date : '',
      imagesWithIssues: urls.size,
      totalIssues,
      critical,
      warning,
      info,
      weightKB: Math.round(weightKB),
      lcp,
      grade,
    };
  }

  /**
   * Escape a value for safe inclusion in HTML.
   * @param value
   * @returns {string}
   */
  static esc(value) {
    return String(value).replace(/[&<>"']/g, (c) => (
      {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]
    ));
  }

  /**
   * Escape a single CSV cell.
   * @param value
   * @returns {string}
   */
  static csvCell(value) {
    value = String(value);
    if (/[",\n\r]/.test(value)) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }

  /**
   * Build a CSV of every flagged image and issue.
   * @param issues
   * @returns {string}
   */
  static toCSV(issues) {
    const rows = [['#', 'Image URL', 'Issue Type', 'Severity', 'Message']];
    let i = 1;
    for (const item of Object.values(issues.issues || {})) {
      (item.messages || []).forEach((message, idx) => {
        const type = item.issueTypes[idx];
        rows.push([i, decodeURI(item.url), Report.labelOf(type), Report.severityOf(type), message]);
      });
      i++;
    }
    return rows.map((row) => row.map(Report.csvCell).join(',')).join('\r\n');
  }

  /**
   * Build a plain-text summary suitable for pasting into a ticket/email.
   * @param issues
   * @param summary
   * @returns {string}
   */
  static toText(issues, summary) {
    const lines = [];
    lines.push(`Oxyplug — Image Audit`);
    lines.push(`Page:  ${decodeURI(summary.page)}`);
    lines.push(`Date:  ${summary.date}`);
    lines.push(`Grade: ${summary.grade}`);
    lines.push(`Images with issues: ${summary.imagesWithIssues} | Issues: ${summary.totalIssues} (critical ${summary.critical}, warning ${summary.warning}, info ${summary.info})`);
    if (summary.weightKB) lines.push(`Measured image weight: ${summary.weightKB} KB`);
    if (summary.lcp) lines.push(`LCP image: ${decodeURI(summary.lcp)}`);
    lines.push('');

    let i = 1;
    for (const item of Object.values(issues.issues || {})) {
      lines.push(`${i}. ${decodeURI(item.url)}`);
      (item.messages || []).forEach((message) => lines.push(`   - ${message}`));
      i++;
    }
    return lines.join('\n');
  }

  /**
   * Build a self-contained HTML report (inline styles, no external assets).
   * @param issues
   * @param summary
   * @returns {string}
   */
  static toHTML(issues, summary) {
    const esc = Report.esc;
    const gradeClass = summary.grade.toLowerCase().replace(/\s+/g, '-');

    const card = (label, value, cls = '') =>
      `<div class="card ${cls}"><span class="num">${esc(value)}</span><span class="lbl">${esc(label)}</span></div>`;

    const summaryCards = [
      card('Images with issues', summary.imagesWithIssues),
      card('Total issues', summary.totalIssues),
      card('Critical', summary.critical, 'critical'),
      card('Warning', summary.warning, 'warning'),
      card('Info', summary.info, 'info'),
      summary.weightKB ? card('Image weight (KB)', summary.weightKB) : '',
    ].join('');

    let rows = '';
    let i = 1;
    for (const item of Object.values(issues.issues || {})) {
      const badges = (item.issueTypes || []).map((type) =>
        `<span class="badge ${Report.severityOf(type)}">${esc(Report.labelOf(type))}</span>`
      ).join(' ');
      const messages = (item.messages || []).map((m) => `<li>${esc(m)}</li>`).join('');
      const safeUrl = esc(item.url);
      const isImg = /^https?:|^data:image/i.test(item.url);
      const thumb = isImg
        ? `<img class="thumb" src="${safeUrl}" alt="" loading="lazy" onerror="this.style.display='none'">`
        : '';
      const link = isImg ? `<a href="${safeUrl}" target="_blank" rel="noopener">${esc(decodeURI(item.url))}</a>` : esc(item.url);

      rows += `
        <div class="item">
          <div class="thumb-wrap">${thumb}</div>
          <div class="detail">
            <div class="url">${i}. ${link}</div>
            <div class="badges">${badges}</div>
            <ul class="msgs">${messages}</ul>
          </div>
        </div>`;
      i++;
    }

    if (!rows) {
      rows = `<div class="all-clear">✓ No image issues found on this page.</div>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Oxyplug Image Audit — ${esc(summary.page)}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 24px; background: #f5f6f8; color: #1c1e21; }
  @media (prefers-color-scheme: dark) { body { background: #16181c; color: #e6e7e9; } .item, .card, header { background: #22252b !important; } }
  header { background: #fff; border-radius: 8px; padding: 20px 24px; box-shadow: 0 1px 4px rgba(0,0,0,.08); margin-bottom: 16px; }
  h1 { margin: 0 0 4px; font-size: 20px; }
  .meta { font-size: 13px; color: #6b7280; word-break: break-all; }
  .meta a { color: inherit; }
  .grade { display: inline-block; margin-top: 10px; padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 13px; }
  .grade.perfect, .grade.good { background: #def7ec; color: #03543f; }
  .grade.needs-work { background: #fdf6b2; color: #723b13; }
  .grade.poor { background: #fde8e8; color: #9b1c1c; }
  .cards { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
  .card { flex: 1 1 120px; background: #f0f2f5; border-radius: 8px; padding: 12px; text-align: center; }
  .card .num { display: block; font-size: 24px; font-weight: 800; }
  .card .lbl { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; }
  .card.critical .num { color: #e02424; }
  .card.warning .num { color: #c27803; }
  .card.info .num { color: #1a56db; }
  .item { display: flex; gap: 14px; background: #fff; border-radius: 8px; padding: 14px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  .thumb-wrap { flex: 0 0 96px; width: 96px; height: 96px; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: repeating-conic-gradient(#e5e7eb 0% 25%, #f3f4f6 0% 50%) 50% / 16px 16px; }
  .thumb { max-width: 96px; max-height: 96px; object-fit: contain; }
  .detail { flex: 1; min-width: 0; }
  .url { font-size: 13px; margin-bottom: 8px; word-break: break-all; }
  .url a { color: #1a56db; text-decoration: none; }
  .badges { margin-bottom: 6px; }
  .badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; margin: 0 4px 4px 0; }
  .badge.critical { background: #fde8e8; color: #9b1c1c; }
  .badge.warning { background: #fdf6b2; color: #723b13; }
  .badge.info { background: #e1effe; color: #1e429f; }
  .msgs { margin: 4px 0 0; padding-left: 18px; font-size: 13px; color: #374151; }
  @media (prefers-color-scheme: dark) { .msgs { color: #c4c6ca; } .card { background: #2c2f36; } }
  .all-clear { background: #def7ec; color: #03543f; padding: 20px; border-radius: 8px; text-align: center; font-weight: 700; }
  footer { margin-top: 20px; font-size: 12px; color: #9ca3af; text-align: center; }
  footer a { color: inherit; }
</style>
</head>
<body>
  <header>
    <h1>Oxyplug — Image Audit</h1>
    <div class="meta">Page: <a href="${esc(summary.page)}" target="_blank" rel="noopener">${esc(decodeURI(summary.page))}</a></div>
    <div class="meta">Generated: ${esc(summary.date)}</div>
    ${summary.lcp ? `<div class="meta">LCP image: ${esc(decodeURI(summary.lcp))}</div>` : ''}
    <div class="grade ${esc(gradeClass)}">${esc(summary.grade)}</div>
    <div class="cards">${summaryCards}</div>
  </header>
  <main>${rows}</main>
  <footer>Generated by Oxyplug — Image Audit · <a href="https://www.oxyplug.com/" target="_blank" rel="noopener">oxyplug.com</a></footer>
</body>
</html>`;
  }

  /**
   * Build a safe download filename.
   * @param summary
   * @param ext
   * @returns {string}
   */
  static filename(summary, ext) {
    let host = 'report';
    try {
      host = new URL(summary.page).hostname || host;
    } catch (error) {
      // Keep the fallback.
    }
    const date = (summary.date || '').replace(/[/:\s]/g, '-');
    return `oxyplug-image-audit-${host}-${date}.${ext}`;
  }

  /**
   * Trigger a file download from the popup via a blob URL (no downloads permission needed).
   * @param filename
   * @param content
   * @param mime
   * @returns {void}
   */
  static download(filename, content, mime) {
    const blob = new Blob([content], {type: mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /**
   * Copy text to the clipboard, with a legacy fallback.
   * @param text
   * @returns {Promise<boolean>}
   */
  static async copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        textarea.remove();
        return ok;
      } catch (fallbackError) {
        console.log(fallbackError);
        return false;
      }
    }
  }
}

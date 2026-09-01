import { PRINT_LAYOUTS } from './printLayouts'

function chunk(items, size) {
  const pages = []
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size))
  }
  return pages
}

// Builds a complete, self-contained HTML document (no dependency on this
// app's own stylesheet, fonts, or scripts — everything the popup window
// needs is inlined) that prints each selected word as its own clearly
// bordered card, several per page depending on the chosen layout, so they
// can be cut apart afterward.
export function buildPrintDocument(cardImageUrls, layoutId) {
  const config = PRINT_LAYOUTS.find((l) => l.id === layoutId) || PRINT_LAYOUTS[0]
  const pages = chunk(cardImageUrls, config.perPage)
  const pagesHtml = pages
    .map(
      (page) => `
      <div class="page layout-${config.id}">
        ${page.map((src) => `<div class="card"><img src="${src}" alt="" /></div>`).join('')}
      </div>`
    )
    .join('')
  // Only the single-card-per-page layout is meant to fill a whole page, for
  // which landscape makes better use of a typically wide illustration —
  // the other two stay portrait.
  const pageSize = config.id === 'full' ? 'landscape' : 'portrait'

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Impression — Totémots</title>
<style>
  @page { size: ${pageSize}; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: sans-serif; }
  .page {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 96vh;
    break-after: page;
    page-break-after: always;
  }
  .page:last-child { break-after: auto; page-break-after: auto; }

  /* Clearly delimited, dashed like a cut line, so each word can be cut out
     as its own card once printed. The image inside always keeps its own
     aspect ratio (max-width/max-height, not width/height), only ever
     scaling down to fit the card's box. */
  .card {
    border: 2px dashed #888;
    border-radius: 8px;
    padding: 6mm;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .card img { max-width: 100%; max-height: 100%; width: auto; height: auto; display: block; }

  /* full: the one card fills essentially the whole (landscape) page. */
  .layout-full .card { width: 100%; height: 100%; }

  /* two: stacked, each taking half the (portrait) page's height. */
  .layout-two { flex-direction: column; gap: 6mm; }
  .layout-two .card { width: 100%; height: 47%; }

  /* grid6: same card size originally used for 4-per-page, now spread
     evenly across a 2-column, 3-row grid instead of stacked/wrapped. */
  .layout-grid6 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 6mm;
    width: 100%;
  }
  .layout-grid6 .card { width: 100%; height: 100%; }
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`
}

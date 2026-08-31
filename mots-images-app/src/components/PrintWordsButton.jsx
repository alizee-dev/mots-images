import { useRef, useState } from 'react'
import WordCardsStaging from './WordCardsStaging'
import PrintIcon from './PrintIcon'
import { PRINT_LAYOUTS } from '../printLayouts'
import { buildPrintDocument } from '../printDocument'

// Every illustration image (letter stickers, crops, and an AI whole-word
// image alike — all stored the same way in zone.illustration.images) used
// by a set of words, as a flat list of data URLs.
function collectImageDataUrls(words) {
  const urls = []
  words.forEach((word) => {
    ;(word.zones || []).forEach((zone) => {
      ;(zone.illustration?.images || []).forEach((im) => {
        if (im.dataUrl) urls.push(im.dataUrl)
      })
    })
  })
  return urls
}

// Resolves once every image is loaded (or has failed — one broken image
// shouldn't block printing the rest forever).
function preloadImages(words) {
  const urls = collectImageDataUrls(words)
  return Promise.all(
    urls.map(
      (url) =>
        new Promise((resolve) => {
          const img = new window.Image()
          img.onload = resolve
          img.onerror = resolve
          img.src = url
        })
    )
  )
}

// A self-contained "Imprimer" action for any set of illustrated words —
// originally built for the word bank's selection, reused as-is anywhere
// else a parent needs to print a group of word cards (e.g. a whole
// entraînement's word list). Owns its own layout-choice dialog and hidden
// export staging; the caller only ever has to pass the words to print.
//
// Prints in a genuinely separate window rather than an inline section of
// the current page: each card is exported as a flat image (via Konva's own
// toDataURL, see WordCardsStaging) and handed to a self-contained popup
// document, sidestepping the "hide everything except .print-area" CSS
// trick that used to leave pages blank or misplaced.
export default function PrintWordsButton({ words, className = 'btn btn-secondary' }) {
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [printLayoutChoice, setPrintLayoutChoice] = useState(PRINT_LAYOUTS[0].id)
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState(null)
  // Only set while the hidden staging area (see WordCardsStaging) needs to
  // be mounted to export each selected card as an image — never rendered
  // as visible page content.
  const [exportLayout, setExportLayout] = useState(null)
  const [exportWords, setExportWords] = useState([])
  const stageRefs = useRef({})

  const handleConfirmPrint = async () => {
    setError(null)
    const layout = printLayoutChoice
    const wordsToExport = words
    if (wordsToExport.length === 0) return

    // Opened synchronously, right inside this click handler, before any
    // await — some browsers' popup blockers stop treating window.open() as
    // a direct response to the user's click once it happens after an
    // awaited gap, even from a real click like this one.
    const popup = window.open('', '_blank', 'width=1000,height=800')
    if (!popup) {
      setError("La fenêtre d'impression a été bloquée par le navigateur. Autorise les pop-ups pour ce site, puis réessaie.")
      return
    }
    popup.document.write('<p style="font-family:sans-serif;padding:24px;">Préparation de l’impression…</p>')

    setPrinting(true)
    setExportLayout(layout)
    setExportWords(wordsToExport)
    try {
      await preloadImages(wordsToExport)
      // Two frames so the hidden staging area (mounted by the state above)
      // has actually committed and Konva has painted onto each canvas —
      // reading toDataURL() before that exports a blank image.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

      const cardImageUrls = wordsToExport
        .map((word) => stageRefs.current[word.id]?.toDataURL({ pixelRatio: 2 }))
        .filter(Boolean)

      if (cardImageUrls.length === 0) {
        popup.close()
        setError("Impossible de préparer les cartes pour l'impression.")
        return
      }

      const html = buildPrintDocument(cardImageUrls, layout)
      popup.document.open()
      popup.document.write(html)
      popup.document.close()

      const waitForImages = () =>
        Promise.all(
          Array.from(popup.document.images).map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((resolve) => {
                  img.onload = resolve
                  img.onerror = resolve
                })
          )
        )
      await waitForImages()
      // window.print() doesn't report whether the user actually printed or
      // hit "Annuler" in the browser's own print dialog — afterprint fires
      // either way, right when that dialog is dismissed, so this popup
      // (whose only purpose was showing the cards to print) can close
      // itself immediately instead of being left behind as an extra window
      // the parent has to close by hand.
      popup.addEventListener('afterprint', () => popup.close())
      popup.focus()
      popup.print()
    } finally {
      setExportLayout(null)
      setExportWords([])
      setPrinting(false)
      setPrintDialogOpen(false)
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setPrintDialogOpen(true)} disabled={words.length === 0}>
        <PrintIcon size={18} />
        Imprimer
      </button>

      {printDialogOpen && (
        <div className="editor-overlay no-print" role="dialog" aria-modal="true">
          <div className="editor-panel">
            <button
              type="button"
              className="editor-close-btn"
              onClick={() => setPrintDialogOpen(false)}
              aria-label="Fermer"
            >
              ✕
            </button>
            <h3>Choisir la mise en page</h3>
            <div className="print-layout-options">
              {PRINT_LAYOUTS.map((opt) => (
                <label key={opt.id} className="print-layout-option">
                  <input
                    type="radio"
                    name="print-layout"
                    value={opt.id}
                    checked={printLayoutChoice === opt.id}
                    onChange={() => setPrintLayoutChoice(opt.id)}
                  />
                  <span className="print-layout-option-title">{opt.title}</span>
                  <span className="print-layout-option-desc">{opt.description}</span>
                </label>
              ))}
            </div>
            {/* The dialog overlay covers the rest of the page, so an error
                shown only down there would be invisible while this stays
                open. */}
            {error && <p className="form-error">{error}</p>}
            <button type="button" className="btn btn-toggle active" onClick={handleConfirmPrint} disabled={printing}>
              {printing ? (
                'Préparation…'
              ) : (
                <>
                  <PrintIcon size={18} />
                  Imprimer
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {exportLayout && <WordCardsStaging words={exportWords} layout={exportLayout} stageRefs={stageRefs} />}
    </>
  )
}

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { jsPDF } from 'jspdf'
import WordStage from './components/WordStage'
import IllustrationEditor from './components/IllustrationEditor'
import { loadWord, saveWord, CURRENT_WORD_ID } from './db'
import { measureWord } from './wordGeometry'
import './index.css'

const EXPORT_PIXEL_RATIO = 2
const EDIT_BASE_FONT_SIZE = 130
const PREVIEW_BASE_FONT_SIZE = 170
const MIN_FIT_FONT_SIZE = 20

// Scales a base fontSize down so the whole word (however long) always fits
// within the visible container width — no horizontal scrollbar, ever —
// instead of relying on scrolling, which is easy to miss or get stuck on.
function useFitFontSize(text, fontFamily, baseFontSize, containerRef) {
  const [fontSize, setFontSize] = useState(baseFontSize)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function update() {
      const available = el.clientWidth - 80
      const { totalWidth } = measureWord(text, fontFamily, baseFontSize)
      const natural = Math.max(totalWidth, baseFontSize)
      const next = natural > available ? Math.max(MIN_FIT_FONT_SIZE, baseFontSize * (available / natural)) : baseFontSize
      setFontSize(next)
    }
    update()
    // A plain "resize" listener isn't enough: this container mounts only
    // once the user switches into the mode that renders it (e.g. preview),
    // a transition "text"/"fontFamily"/"baseFontSize" don't capture. Using
    // containerRef.current itself as a dependency (below) makes the effect
    // re-run the moment the element actually appears; the ResizeObserver
    // then keeps it accurate afterwards, including window resizes.
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, fontFamily, baseFontSize, containerRef.current])
  return fontSize
}

function emptyWord() {
  return { id: CURRENT_WORD_ID, text: '', zones: [], letterColors: {} }
}

function emptyIllustration() {
  return { strokes: [], stickers: [], images: [] }
}

export default function App() {
  const [word, setWord] = useState(emptyWord())
  const [textDraft, setTextDraft] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [dyslexicFont, setDyslexicFont] = useState(false)
  const [theme, setTheme] = useState('light')
  const [mode, setMode] = useState('edit')
  const [activeZoneId, setActiveZoneId] = useState(null)
  const saveTimer = useRef(null)
  const previewStageRef = useRef(null)
  const previewContainerRef = useRef(null)
  const editContainerRef = useRef(null)

  useEffect(() => {
    loadWord(CURRENT_WORD_ID).then((saved) => {
      if (saved) {
        setWord({ letterColors: {}, ...saved })
        setTextDraft(saved.text)
      }
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveWord(word)
    }, 400)
    return () => clearTimeout(saveTimer.current)
  }, [word, loaded])

  const fontFamily = dyslexicFont ? 'OpenDyslexic' : 'system-ui'
  const editFontSize = useFitFontSize(word.text, fontFamily, EDIT_BASE_FONT_SIZE, editContainerRef)
  const previewFontSize = useFitFontSize(word.text, fontFamily, PREVIEW_BASE_FONT_SIZE, previewContainerRef)

  const applyTextChange = useCallback(() => {
    const next = textDraft.trim()
    if (next === word.text) return
    if (word.zones.length > 0 || Object.keys(word.letterColors || {}).length > 0) {
      const ok = window.confirm(
        'Changer le mot va effacer les zones illustrées et les couleurs de lettres déjà créées pour ce mot. Continuer ?'
      )
      if (!ok) {
        setTextDraft(word.text)
        return
      }
    }
    setWord({ ...word, text: next, zones: [], letterColors: {} })
    setActiveZoneId(null)
  }, [textDraft, word])

  const activeZone = word.zones.find((z) => z.id === activeZoneId) || null
  const activeLetterColor = activeZone ? (word.letterColors || {})[activeZone.letterIndex] : undefined

  const openLetterZone = useCallback(
    (letterIndex) => {
      const existing = word.zones.find((z) => z.letterIndex === letterIndex)
      if (existing) {
        setActiveZoneId(existing.id)
        return
      }
      const zone = { id: uuid(), letterIndex, illustration: emptyIllustration() }
      setWord((w) => ({ ...w, zones: [...w.zones, zone] }))
      setActiveZoneId(zone.id)
    },
    [word.zones]
  )

  const updateZoneIllustration = useCallback((zoneId, illustration) => {
    setWord((w) => ({
      ...w,
      zones: w.zones.map((z) => (z.id === zoneId ? { ...z, illustration } : z)),
    }))
  }, [])

  const deleteZone = useCallback((zoneId) => {
    setWord((w) => ({ ...w, zones: w.zones.filter((z) => z.id !== zoneId) }))
    setActiveZoneId(null)
  }, [])

  const setLetterColor = useCallback((index, color) => {
    setWord((w) => {
      const letterColors = { ...(w.letterColors || {}) }
      if (color === null || color === undefined) delete letterColors[index]
      else letterColors[index] = color
      return { ...w, letterColors }
    })
  }, [])

  const handleActiveLetterColorChange = useCallback(
    (color) => {
      if (!activeZone) return
      setLetterColor(activeZone.letterIndex, color)
    },
    [activeZone, setLetterColor]
  )

  const startNewWord = useCallback(() => {
    if (word.text || word.zones.length > 0) {
      const ok = window.confirm('Recommencer avec un nouveau mot ? Le mot actuel restera enregistré.')
      if (!ok) return
    }
    const fresh = emptyWord()
    setWord(fresh)
    setTextDraft('')
    setActiveZoneId(null)
    setMode('edit')
  }, [word])

  const handleDownloadPng = () => {
    const stage = previewStageRef.current
    if (!stage) return
    const dataUrl = stage.toDataURL({ pixelRatio: EXPORT_PIXEL_RATIO, mimeType: 'image/png' })
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `${word.text || 'mot'}-images.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const handleDownloadPdf = () => {
    const stage = previewStageRef.current
    if (!stage) return
    const dataUrl = stage.toDataURL({ pixelRatio: EXPORT_PIXEL_RATIO, mimeType: 'image/png' })
    const w = stage.width()
    const h = stage.height()
    const pdf = new jsPDF({
      orientation: w > h ? 'landscape' : 'portrait',
      unit: 'px',
      format: [w, h],
    })
    pdf.addImage(dataUrl, 'PNG', 0, 0, w, h)
    pdf.save(`${word.text || 'mot'}-images.pdf`)
  }

  const handlePrint = () => {
    window.print()
  }

  const zoneLabel = (zone) => {
    const char = Array.from(word.text)[zone.letterIndex] || '?'
    const count = zone.illustration.strokes.length + zone.illustration.stickers.length + zone.illustration.images.length
    return `Lettre "${char}"${count ? ' ✓' : ''}`
  }

  return (
    <div className={`app ${dyslexicFont ? 'font-dys' : ''}`}>
      <header className="app-header no-print">
        <h1>Mots-images</h1>
        <div className="app-header-actions">
          <button
            type="button"
            className={`btn btn-toggle ${dyslexicFont ? 'active' : ''}`}
            onClick={() => setDyslexicFont((v) => !v)}
          >
            🔤 Police DYS
          </button>
          <button
            type="button"
            className={`btn btn-toggle ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          >
            🌙 Mode sombre
          </button>
          <button type="button" className="btn btn-secondary" onClick={startNewWord}>
            ✨ Nouveau mot
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="word-input-row no-print">
          <label htmlFor="word-input" className="word-input-label">
            Mot à travailler
          </label>
          <input
            id="word-input"
            type="text"
            className="word-input"
            placeholder="Tape un mot, ex : poisson"
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            onBlur={applyTextChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.target.blur()
            }}
          />
        </div>

        {word.text && (
          <div className="mode-row no-print">
            <button
              type="button"
              className={`btn btn-tab ${mode === 'edit' ? 'active' : ''}`}
              onClick={() => setMode('edit')}
            >
              ✏️ Édition
            </button>
            <button
              type="button"
              className={`btn btn-tab ${mode === 'preview' ? 'active' : ''}`}
              onClick={() => setMode('preview')}
            >
              👁️ Aperçu final
            </button>
          </div>
        )}

        {!word.text && <p className="empty-hint no-print">Tape un mot ci-dessus pour commencer à l'illustrer.</p>}

        {word.text && mode === 'edit' && (
          <>
            <p className="edit-instructions no-print">
              👉 Clique sur une lettre pour l'illustrer et choisir sa couleur.
            </p>

            <div className="word-stage-fit" ref={editContainerRef}>
              <WordStage
                text={word.text}
                fontFamily={fontFamily}
                fontSize={editFontSize}
                zones={word.zones}
                letterColors={word.letterColors || {}}
                theme={theme}
                interactive
                onSelectLetter={openLetterZone}
              />
            </div>

            {word.zones.length > 0 && (
              <div className="zone-list no-print">
                {word.zones.map((zone) => (
                  <button key={zone.id} type="button" className="zone-chip" onClick={() => setActiveZoneId(zone.id)}>
                    {zoneLabel(zone)}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {word.text && mode === 'preview' && (
          <>
            <div className="export-bar no-print">
              <button type="button" className="btn btn-secondary" onClick={handleDownloadPng}>
                💾 Télécharger (PNG)
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleDownloadPdf}>
                📄 Télécharger (PDF)
              </button>
              <button type="button" className="btn btn-secondary" onClick={handlePrint}>
                🖨️ Imprimer
              </button>
            </div>
            <div className="preview-wrap print-area" ref={previewContainerRef}>
              <WordStage
                ref={previewStageRef}
                text={word.text}
                fontFamily={fontFamily}
                fontSize={previewFontSize}
                zones={word.zones}
                letterColors={word.letterColors || {}}
                theme={theme}
                interactive={false}
              />
            </div>
          </>
        )}
      </main>

      {activeZone && (
        <IllustrationEditor
          word={word}
          zone={activeZone}
          fontFamily={fontFamily}
          letterColor={activeLetterColor}
          onChange={updateZoneIllustration}
          onLetterColorChange={handleActiveLetterColorChange}
          onDeleteZone={deleteZone}
          onClose={() => setActiveZoneId(null)}
        />
      )}
    </div>
  )
}

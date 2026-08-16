import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import { jsPDF } from 'jspdf'
import WordStage from '../../components/WordStage'
import IllustrationEditor from '../../components/IllustrationEditor'
import { createWord, getWords, updateWord } from '../../api/words'
import { measureWord } from '../../wordGeometry'

const EXPORT_PIXEL_RATIO = 2
const EDIT_BASE_FONT_SIZE = 130
const PREVIEW_BASE_FONT_SIZE = 170
const MIN_FIT_FONT_SIZE = 20
const SAVE_DEBOUNCE_MS = 600

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
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, fontFamily, baseFontSize, containerRef.current])
  return fontSize
}

function emptyIllustration() {
  return { strokes: [], stickers: [], images: [] }
}

export default function WordEditorPage() {
  const { wordId } = useParams()
  const navigate = useNavigate()
  const { fontFamily, theme } = useOutletContext()
  const isNew = !wordId

  const [textDraft, setTextDraft] = useState('')
  const [sentenceDraft, setSentenceDraft] = useState('')
  const [creationError, setCreationError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [loading, setLoading] = useState(!isNew)
  const [loadError, setLoadError] = useState(null)
  const [wordText, setWordText] = useState('')
  const [sentence, setSentence] = useState('')
  const [zones, setZones] = useState([])
  const [saveStatus, setSaveStatus] = useState('idle')

  const [mode, setMode] = useState('edit')
  const [activeZoneId, setActiveZoneId] = useState(null)
  const loadedOnce = useRef(false)
  const saveTimer = useRef(null)
  const previewStageRef = useRef(null)
  const previewContainerRef = useRef(null)
  const editContainerRef = useRef(null)

  useEffect(() => {
    if (isNew) return
    setLoading(true)
    setLoadError(null)
    loadedOnce.current = false
    getWords()
      .then((words) => {
        const found = words.find((w) => String(w.id) === wordId)
        if (!found) {
          setLoadError("Ce mot n'existe pas ou ne t'appartient pas.")
          return
        }
        setWordText(found.text)
        setSentence(found.sentence || '')
        setZones(found.zones || [])
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => {
        setLoading(false)
        loadedOnce.current = true
      })
  }, [wordId, isNew])

  useEffect(() => {
    if (isNew || !loadedOnce.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('pending')
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await updateWord(wordId, sentence, zones)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, SAVE_DEBOUNCE_MS)
    return () => clearTimeout(saveTimer.current)
  }, [wordId, sentence, zones, isNew])

  const editFontSize = useFitFontSize(wordText, fontFamily, EDIT_BASE_FONT_SIZE, editContainerRef)
  const previewFontSize = useFitFontSize(wordText, fontFamily, PREVIEW_BASE_FONT_SIZE, previewContainerRef)

  const letterColors = useMemo(() => {
    const map = {}
    zones.forEach((z) => {
      if (z.letterColor) map[z.letterIndex] = z.letterColor
    })
    return map
  }, [zones])

  const handleCreate = async (e) => {
    e.preventDefault()
    const text = textDraft.trim()
    const sentenceValue = sentenceDraft.trim()
    if (!text || !sentenceValue) return
    setSubmitting(true)
    setCreationError(null)
    try {
      const word = await createWord(text, sentenceValue)
      navigate(`/words/${word.id}`, { replace: true })
    } catch (err) {
      setCreationError(err.message)
      setSubmitting(false)
    }
  }

  const activeZone = zones.find((z) => z.id === activeZoneId) || null
  const activeLetterColor = activeZone ? activeZone.letterColor : undefined

  const openLetterZone = useCallback(
    (letterIndex) => {
      const existing = zones.find((z) => z.letterIndex === letterIndex)
      if (existing) {
        setActiveZoneId(existing.id)
        return
      }
      const zone = { id: uuid(), letterIndex, letterColor: null, illustration: emptyIllustration() }
      setZones((zs) => [...zs, zone])
      setActiveZoneId(zone.id)
    },
    [zones]
  )

  const updateZoneIllustration = useCallback((zoneId, illustration) => {
    setZones((zs) => zs.map((z) => (z.id === zoneId ? { ...z, illustration } : z)))
  }, [])

  const deleteZone = useCallback((zoneId) => {
    setZones((zs) => zs.filter((z) => z.id !== zoneId))
    setActiveZoneId(null)
  }, [])

  const handleActiveLetterColorChange = useCallback(
    (color) => {
      if (!activeZone) return
      setZones((zs) => zs.map((z) => (z.id === activeZone.id ? { ...z, letterColor: color || null } : z)))
    },
    [activeZone]
  )

  const handleDownloadPng = () => {
    const stage = previewStageRef.current
    if (!stage) return
    const dataUrl = stage.toDataURL({ pixelRatio: EXPORT_PIXEL_RATIO, mimeType: 'image/png' })
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `${wordText || 'mot'}-images.png`
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
    pdf.save(`${wordText || 'mot'}-images.pdf`)
  }

  const handlePrint = () => {
    window.print()
  }

  const zoneLabel = (zone) => {
    const char = Array.from(wordText)[zone.letterIndex] || '?'
    const count = zone.illustration.strokes.length + zone.illustration.stickers.length + zone.illustration.images.length
    return `Lettre "${char}"${count ? ' ✓' : ''}`
  }

  if (isNew) {
    return (
      <div className="page">
        <h2>Nouveau mot</h2>
        <form className="word-create-form" onSubmit={handleCreate}>
          <label htmlFor="new-word-text" className="word-input-label">
            Mot
          </label>
          <input
            id="new-word-text"
            type="text"
            className="word-input"
            placeholder="ex : poisson"
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            required
          />

          <label htmlFor="new-word-sentence" className="word-input-label">
            Phrase à trous
          </label>
          <input
            id="new-word-sentence"
            type="text"
            className="word-input"
            placeholder="ex : Le ___ nage dans l'aquarium."
            value={sentenceDraft}
            onChange={(e) => setSentenceDraft(e.target.value)}
            required
          />

          {creationError && <p className="form-error">{creationError}</p>}

          <button type="submit" className="btn btn-toggle active" disabled={submitting}>
            {submitting ? 'Création…' : "Créer et illustrer"}
          </button>
        </form>
      </div>
    )
  }

  if (loading) return <div className="page">Chargement…</div>
  if (loadError) return <div className="page form-error">{loadError}</div>

  return (
    <div className="page">
      <div className="page-header-row">
        <h2>{wordText}</h2>
        <span className={`save-status save-status-${saveStatus}`}>
          {saveStatus === 'saving' && 'Enregistrement…'}
          {saveStatus === 'saved' && 'Enregistré ✓'}
          {saveStatus === 'error' && "Erreur d'enregistrement"}
        </span>
      </div>

      <label htmlFor="word-sentence" className="word-input-label">
        Phrase à trous
      </label>
      <input
        id="word-sentence"
        type="text"
        className="word-input"
        value={sentence}
        onChange={(e) => setSentence(e.target.value)}
      />

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

      {mode === 'edit' && (
        <>
          <p className="edit-instructions no-print">👉 Clique sur une lettre pour l’illustrer et choisir sa couleur.</p>

          <div className="word-stage-fit" ref={editContainerRef}>
            <WordStage
              text={wordText}
              fontFamily={fontFamily}
              fontSize={editFontSize}
              zones={zones}
              letterColors={letterColors}
              theme={theme}
              interactive
              onSelectLetter={openLetterZone}
            />
          </div>

          {zones.length > 0 && (
            <div className="zone-list no-print">
              {zones.map((zone) => (
                <button key={zone.id} type="button" className="zone-chip" onClick={() => setActiveZoneId(zone.id)}>
                  {zoneLabel(zone)}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {mode === 'preview' && (
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
              text={wordText}
              fontFamily={fontFamily}
              fontSize={previewFontSize}
              zones={zones}
              letterColors={letterColors}
              theme={theme}
              interactive={false}
            />
          </div>
        </>
      )}

      {activeZone && (
        <IllustrationEditor
          word={{ text: wordText }}
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

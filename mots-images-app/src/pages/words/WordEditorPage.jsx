import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import WordStage from '../../components/WordStage'
import IllustrationEditor from '../../components/IllustrationEditor'
import { createWord, getWords, updateWord } from '../../api/words'
import { measureWord } from '../../wordGeometry'

const FONT_FAMILY = 'OpenDyslexic'
const EDIT_BASE_FONT_SIZE = 130
const PREVIEW_BASE_FONT_SIZE = 170
const MIN_FIT_FONT_SIZE = 20

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
  const [searchParams] = useSearchParams()
  const isNew = !wordId
  const fromSeriesId = searchParams.get('fromSeriesId')
  const fromSeries = fromSeriesId
    ? { seriesId: fromSeriesId, title: searchParams.get('fromSeriesTitle') || null }
    : null

  const [textDraft, setTextDraft] = useState('')
  const [creationError, setCreationError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Same component-reuse concern as the load effect below: navigating from
  // an existing word straight to "Nouveau mot" doesn't remount this page,
  // so the previous creation attempt's leftover text has to be cleared here.
  useEffect(() => {
    if (isNew) {
      setTextDraft('')
      setCreationError(null)
      // `submitting` otherwise stays stuck at true forever after a
      // successful creation, since the success path only navigates away
      // rather than resetting it — leaving the button permanently
      // disabled the next time this same page instance shows the
      // creation form (e.g. via "Nouveau mot" from an existing word).
      setSubmitting(false)
    }
  }, [isNew])

  const [loading, setLoading] = useState(!isNew)
  const [loadError, setLoadError] = useState(null)
  const [wordText, setWordText] = useState('')
  const [sentence, setSentence] = useState('')
  const [zones, setZones] = useState([])
  // The last known persisted state, so the "Enregistrer" button can tell
  // whether there's anything new to save. Saving is explicit — nothing
  // here writes to the backend on its own.
  const [savedSnapshot, setSavedSnapshot] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Local to this page: the only place a card's dark/light background
  // actually matters is the one you're about to print or hand to a child,
  // not a global site-wide setting.
  const [theme, setTheme] = useState('light')

  const [mode, setMode] = useState('edit')
  const [activeZoneId, setActiveZoneId] = useState(null)
  const [draftNewZone, setDraftNewZone] = useState(null)
  const [clipboard, setClipboard] = useState(null)
  const loadedOnce = useRef(false)
  const previewContainerRef = useRef(null)
  const editContainerRef = useRef(null)

  useEffect(() => {
    if (isNew) return
    setLoading(true)
    setLoadError(null)
    setSaveError(null)
    loadedOnce.current = false
    // Navigating from one word's edit page straight to another (e.g. via
    // "Nouveau mot") reuses this same component instance rather than
    // remounting it, so state left over from the previous word — which
    // preview/edit mode was active, an open zone editor, the copy/paste
    // clipboard — has to be reset explicitly here rather than relying on
    // useState's initial value.
    setMode('edit')
    setActiveZoneId(null)
    setDraftNewZone(null)
    setClipboard(null)
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
        setSavedSnapshot({ sentence: found.sentence || '', zones: found.zones || [] })
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => {
        setLoading(false)
        loadedOnce.current = true
      })
  }, [wordId, isNew])

  const hasUnsavedChanges = Boolean(
    savedSnapshot &&
      (sentence !== savedSnapshot.sentence || JSON.stringify(zones) !== JSON.stringify(savedSnapshot.zones))
  )

  // Saving always ends by taking the teacher back to the word bank, where
  // the word they were just working on is right there — there's nothing
  // else to do on this page once it's saved. If there's nothing new to
  // persist, it skips the network round trip and just navigates.
  const handleSaveWord = async () => {
    if (!hasUnsavedChanges) {
      navigate('/words')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await updateWord(wordId, sentence, zones)
      navigate('/words')
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const editFontSize = useFitFontSize(wordText, FONT_FAMILY, EDIT_BASE_FONT_SIZE, editContainerRef)
  const previewFontSize = useFitFontSize(wordText, FONT_FAMILY, PREVIEW_BASE_FONT_SIZE, previewContainerRef)

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
    if (!text) return
    setSubmitting(true)
    setCreationError(null)
    try {
      const word = await createWord(text, '')
      navigate(`/words/${word.id}`, { replace: true })
    } catch (err) {
      setCreationError(err.message)
      setSubmitting(false)
    }
  }

  const activeZone = zones.find((z) => z.id === activeZoneId) || draftNewZone
  const activeLetterColor = activeZone ? activeZone.letterColor : undefined

  const openLetterZone = useCallback(
    (letterIndex) => {
      const existing = zones.find((z) => z.letterIndex === letterIndex)
      if (existing) {
        setDraftNewZone(null)
        setActiveZoneId(existing.id)
        return
      }
      const zone = { id: uuid(), letterIndex, letterColor: null, illustration: emptyIllustration() }
      setDraftNewZone(zone)
      setActiveZoneId(zone.id)
    },
    [zones]
  )

  const closeEditor = useCallback(() => {
    setDraftNewZone(null)
    setActiveZoneId(null)
  }, [])

  const saveZone = useCallback(
    (illustration, letterColor) => {
      if (!activeZone) return
      // A zone with nothing drawn on it and no letter color isn't a real
      // customization — keeping it around as an empty object was leaving
      // the letter permanently highlighted as "modified" in WordStage
      // (which only checks whether a zone exists for that letter, not
      // whether it has any content) even after every stroke/sticker/image
      // in it had been removed.
      const isEmpty =
        illustration.strokes.length === 0 &&
        illustration.stickers.length === 0 &&
        illustration.images.length === 0 &&
        !letterColor
      setZones((zs) => {
        if (isEmpty) return zs.filter((z) => z.id !== activeZone.id)
        const exists = zs.some((z) => z.id === activeZone.id)
        if (exists) {
          return zs.map((z) =>
            z.id === activeZone.id ? { ...z, illustration, letterColor: letterColor || null } : z
          )
        }
        return [...zs, { id: activeZone.id, letterIndex: activeZone.letterIndex, illustration, letterColor: letterColor || null }]
      })
      setDraftNewZone(null)
      setActiveZoneId(null)
    },
    [activeZone]
  )

  const deleteZone = useCallback((zoneId) => {
    setZones((zs) => zs.filter((z) => z.id !== zoneId))
    setDraftNewZone(null)
    setActiveZoneId(null)
  }, [])

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
            autoFocus
            required
          />

          {creationError && <p className="form-error">{creationError}</p>}

          <button type="submit" className="btn btn-toggle active" disabled={submitting || !textDraft.trim()}>
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
      {fromSeries ? (
        <p className="breadcrumb">
          <Link to={`/series/${fromSeries.seriesId}`} state={{ title: fromSeries.title }}>
            ← Retour à {fromSeries.title ? `« ${fromSeries.title} »` : 'la série'}
          </Link>
        </p>
      ) : (
        <p className="breadcrumb">
          <Link to="/words">← Retour à la banque de mots</Link>
        </p>
      )}
      <div className="page-header-row">
        <h2>{wordText}</h2>
        <div className="app-header-actions">
          {saveError && <span className="form-error">{saveError}</span>}
          <button type="button" className="btn btn-toggle active" onClick={handleSaveWord} disabled={saving}>
            {saving ? 'Enregistrement…' : '💾 Enregistrer'}
          </button>
        </div>
      </div>

      {mode === 'edit' && (
        <>
          <p className="edit-instructions no-print">👉 Clique sur une lettre pour l’illustrer et choisir sa couleur.</p>

          <div className="word-stage-fit" ref={editContainerRef}>
            <WordStage
              text={wordText}
              fontSize={editFontSize}
              zones={zones}
              letterColors={letterColors}
              theme={theme}
              interactive
              onSelectLetter={openLetterZone}
            />
          </div>

          <label htmlFor="word-sentence" className="word-input-label">
            Phrase à trous (facultatif)
          </label>
          <input
            id="word-sentence"
            type="text"
            className="word-input"
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
          />

          {zones.length > 0 && (
            <div className="zone-list no-print">
              {zones.map((zone) => (
                <button key={zone.id} type="button" className="zone-chip" onClick={() => setActiveZoneId(zone.id)}>
                  {zoneLabel(zone)}
                </button>
              ))}
            </div>
          )}

          <button type="button" className="text-link-btn no-print" onClick={() => setMode('preview')}>
            Aperçu final →
          </button>
        </>
      )}

      {mode === 'preview' && (
        <>
          <div className="export-bar no-print">
            <button type="button" className="text-link-btn" onClick={() => setMode('edit')}>
              ← Retour à l’édition
            </button>
            <button
              type="button"
              className="btn btn-chip"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? '☀️ Clair' : '🌙 Sombre'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handlePrint}>
              🖨️ Imprimer
            </button>
          </div>
          <div className="preview-wrap print-area" ref={previewContainerRef}>
            <WordStage
              text={wordText}
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
          fontFamily={FONT_FAMILY}
          letterColor={activeLetterColor}
          clipboard={clipboard}
          onCopy={setClipboard}
          onSave={saveZone}
          onDeleteZone={deleteZone}
          onClose={closeEditor}
        />
      )}
    </div>
  )
}

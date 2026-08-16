import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createWord, getWords, updateWord } from '../../api/words'
import { addWordsToSeries, createSeries } from '../../api/series'

export default function NewSeriesPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('title')
  const [title, setTitle] = useState('')
  const [seriesId, setSeriesId] = useState(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [words, setWords] = useState([])
  const [wordsLoading, setWordsLoading] = useState(false)
  const [selected, setSelected] = useState([])
  const [search, setSearch] = useState('')
  const [quickWordText, setQuickWordText] = useState('')
  const [quickWordSubmitting, setQuickWordSubmitting] = useState(false)
  // Ids of selected words for which the inline "phrase à trous" field is
  // shown — any word (bank-picked or quick-added) that had no sentence at
  // the moment it was selected, so a series never quietly ends up with a
  // word missing its phrase. Once shown for a word it stays shown for the
  // rest of this session, even after a sentence is typed in, so the field
  // doesn't disappear out from under the teacher mid-edit.
  const [sentenceFieldIds, setSentenceFieldIds] = useState(() => new Set())

  useEffect(() => {
    if (step !== 'words') return
    setWordsLoading(true)
    getWords()
      .then(setWords)
      .catch((err) => setError(err.message))
      .finally(() => setWordsLoading(false))
  }, [step])

  const handleCreateTitle = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const series = await createSeries(title.trim())
      setSeriesId(series.id)
      setStep('words')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const addWord = (word) => {
    if (selected.some((w) => w.id === word.id)) return
    setSelected((prev) => [...prev, word])
    if (!word.sentence) {
      setSentenceFieldIds((prev) => new Set(prev).add(word.id))
    }
  }

  const removeWord = (wordId) => {
    setSelected((prev) => prev.filter((w) => w.id !== wordId))
  }

  const handleQuickAddWord = async (e) => {
    e.preventDefault()
    const text = quickWordText.trim()
    if (!text) return
    setQuickWordSubmitting(true)
    setError(null)
    try {
      const word = await createWord(text, '')
      setSelected((prev) => [...prev, word])
      setSentenceFieldIds((prev) => new Set(prev).add(word.id))
      setQuickWordText('')
    } catch (err) {
      setError(err.message)
    } finally {
      setQuickWordSubmitting(false)
    }
  }

  const updateSelectedSentence = (wordId, sentence) => {
    setSelected((prev) => prev.map((w) => (w.id === wordId ? { ...w, sentence } : w)))
  }

  const saveSelectedSentence = async (word) => {
    try {
      await updateWord(word.id, word.sentence || '', word.zones || [])
    } catch (err) {
      setError(err.message)
    }
  }

  const moveWord = (index, direction) => {
    setSelected((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const handleFinish = async () => {
    setSubmitting(true)
    setError(null)
    try {
      if (selected.length > 0) {
        await addWordsToSeries(
          seriesId,
          selected.map((w) => w.id)
        )
      }
      navigate(`/series/${seriesId}`, { state: { title } })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  const availableWords = words.filter(
    (w) => !selected.some((s) => s.id === w.id) && w.text.toLowerCase().includes(search.toLowerCase())
  )

  if (step === 'title') {
    return (
      <div className="page">
        <h2>Nouvelle série</h2>
        <form className="word-create-form" onSubmit={handleCreateTitle}>
          <label htmlFor="series-title" className="word-input-label">
            Titre de la série
          </label>
          <input
            id="series-title"
            type="text"
            className="word-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-toggle active" disabled={submitting}>
            {submitting ? 'Création…' : 'Créer et choisir les mots'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="page">
      <h2>{title}</h2>
      <p className="page-subtitle">Choisis les mots à ajouter à cette série, dans l’ordre souhaité.</p>

      {error && <p className="form-error">{error}</p>}

      <form className="inline-form" onSubmit={handleQuickAddWord}>
        <input
          type="text"
          className="word-input"
          placeholder="Mot sans illustration (ex : pour une simple dictée)"
          value={quickWordText}
          onChange={(e) => setQuickWordText(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary" disabled={quickWordSubmitting}>
          {quickWordSubmitting ? 'Ajout…' : '➕ Ajouter sans illustration'}
        </button>
      </form>

      <div className="word-picker">
        <div className="word-picker-col">
          <h3>Banque de mots</h3>
          <input
            type="text"
            className="word-input"
            placeholder="Rechercher un mot…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {wordsLoading && <p>Chargement…</p>}
          <ul className="picker-list">
            {availableWords.map((word) => (
              <li key={word.id}>
                <button type="button" className="picker-item" onClick={() => addWord(word)}>
                  ➕ {word.text}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="word-picker-col">
          <h3>Mots sélectionnés ({selected.length})</h3>
          {selected.length === 0 && <p className="empty-hint">Aucun mot choisi pour l’instant.</p>}
          <ul className="picker-list">
            {selected.map((word, i) => (
              <li key={word.id} className="picker-item picker-item-selected">
                <div className="picker-item-row">
                  <span className="picker-order">{i + 1}</span>
                  <span className="picker-text">{word.text}</span>
                  <span className="picker-actions">
                    <button type="button" className="btn btn-chip" onClick={() => moveWord(i, -1)} disabled={i === 0}>
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn-chip"
                      onClick={() => moveWord(i, 1)}
                      disabled={i === selected.length - 1}
                    >
                      ↓
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => removeWord(word.id)}>
                      ✖️
                    </button>
                  </span>
                </div>
                {sentenceFieldIds.has(word.id) && (
                  <label className="quick-word-sentence-label">
                    ⚠️ Aucune phrase pour ce mot — la passation de test affichera juste « Écris le mot : » sans elle
                    <input
                      type="text"
                      className="quick-word-sentence-input"
                      placeholder="ex : La ___ est posée sur la table."
                      value={word.sentence || ''}
                      onChange={(e) => updateSelectedSentence(word.id, e.target.value)}
                      onBlur={() => saveSelectedSentence(word)}
                    />
                  </label>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button type="button" className="btn btn-toggle active" onClick={handleFinish} disabled={submitting}>
        {submitting ? 'Enregistrement…' : '✅ Valider la série'}
      </button>
    </div>
  )
}

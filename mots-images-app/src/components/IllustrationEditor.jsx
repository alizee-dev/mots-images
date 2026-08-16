import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Text, Rect, Line, Image as KonvaImage, Transformer, Group } from 'react-konva'
import { v4 as uuid } from 'uuid'
import {
  measureWord,
  getZoneFrame,
  computeZoneRect,
  LETTER_BOX_RATIO,
  getClipProps,
  measureGlyphBox,
  DEFAULT_CROP,
} from '../wordGeometry'
import EmojiPicker from './EmojiPicker'

const DISPLAY_SIZE_MAX = 460
const DISPLAY_SIZE_MIN = 260
const EDITOR_FONT_SIZE = 260
const PEN_COLORS = [
  '#e63946', // rouge
  '#f3722c', // orange
  '#f4a300', // jaune
  '#2a9d8f', // vert
  '#4cc9f0', // bleu ciel
  '#1d3557', // bleu marine
  '#7b2cbf', // violet
  '#f72585', // rose
  '#7f4f24', // marron
  '#111111', // noir
  '#9aa5b1', // gris clair (différent du gris des lettres)
]
const PEN_SIZES = [
  { label: 'Fin', value: 0.012 },
  { label: 'Moyen', value: 0.022 },
  { label: 'Épais', value: 0.038 },
]
const LETTER_COLOR_PALETTE = [
  { color: '#e63946', label: 'rouge' },
  { color: '#1d3557', label: 'bleu' },
  { color: '#2a9d8f', label: 'vert' },
  { color: '#f3722c', label: 'orange' },
  { color: '#7b2cbf', label: 'violet' },
]

function useResponsiveSize() {
  const [size, setSize] = useState(DISPLAY_SIZE_MAX)
  useEffect(() => {
    function update() {
      const available = Math.min(window.innerWidth - 420, window.innerHeight - 260)
      setSize(Math.max(DISPLAY_SIZE_MIN, Math.min(DISPLAY_SIZE_MAX, available)))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return size
}

function useHtmlImage(src) {
  const [img, setImg] = useState(null)
  useEffect(() => {
    if (!src) {
      setImg(null)
      return
    }
    const image = new window.Image()
    image.onload = () => setImg(image)
    image.src = src
    return () => {
      image.onload = null
    }
  }, [src])
  return img
}

// For stickers, "full box" is the emoji glyph's actually-measured bounding
// box at the requested font size (see measureGlyphBox) — not an assumed
// fontSize×fontSize square, which rarely matches real glyph metrics and
// would make the crop clip cut into the glyph. `fontSize` is the value to
// still pass to the Text node itself, since that's what sizes the glyph.
function itemBoxSize(item, kind, displaySize) {
  if (kind === 'sticker') {
    const fontSize = item.sizeFrac * displaySize
    const box = measureGlyphBox(item.emoji, fontSize)
    return { fullW: box.width, fullH: box.height, fontSize }
  }
  const fullW = item.widthFrac * displaySize
  const fullH = fullW * (item.aspect || 1)
  return { fullW, fullH, fontSize: null }
}

function EditableSticker({ sticker, displaySize, selected, editable, onSelect, onChange }) {
  const groupRef = useRef(null)
  const trRef = useRef(null)

  useEffect(() => {
    if (selected && editable && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current])
      trRef.current.getLayer().batchDraw()
    }
  }, [selected, editable])

  const size = sticker.sizeFrac * displaySize
  const box = measureGlyphBox(sticker.emoji, size)
  const clipProps = getClipProps(sticker, box.width, box.height)

  return (
    <>
      <Group
        ref={groupRef}
        x={sticker.xFrac * displaySize}
        y={sticker.yFrac * displaySize}
        rotation={sticker.rotation || 0}
        opacity={sticker.opacity ?? 1}
        {...clipProps}
        draggable={editable}
        listening={editable}
        onClick={() => onSelect(sticker.id)}
        onTap={() => onSelect(sticker.id)}
        onDragEnd={(e) => {
          onChange({ ...sticker, xFrac: e.target.x() / displaySize, yFrac: e.target.y() / displaySize })
        }}
        onTransformEnd={(e) => {
          const node = e.target
          const scale = node.scaleX()
          node.scaleX(1)
          node.scaleY(1)
          onChange({
            ...sticker,
            xFrac: node.x() / displaySize,
            yFrac: node.y() / displaySize,
            sizeFrac: Math.max(0.02, sticker.sizeFrac * scale),
            rotation: node.rotation(),
          })
        }}
      >
        <Text text={sticker.emoji} fontSize={size} offsetX={box.width / 2} offsetY={box.height / 2} />
      </Group>
      {selected && editable && (
        <Transformer
          ref={trRef}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          rotateEnabled
          keepRatio
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 16 || newBox.height < 16 ? oldBox : newBox)}
        />
      )}
    </>
  )
}

function EditableImage({ image, displaySize, selected, editable, onSelect, onChange }) {
  const img = useHtmlImage(image.dataUrl)
  const groupRef = useRef(null)
  const trRef = useRef(null)

  // The Group must always mount (even before the image has finished loading)
  // so groupRef is already attached the moment this item becomes selected —
  // e.g. right after upload, when it's auto-selected on its very first
  // render. If the Group were gated behind `img` being loaded, this effect's
  // deps ([selected, editable]) wouldn't change once the image loads a beat
  // later, so it would never re-run and the Transformer would never attach.
  useEffect(() => {
    if (selected && editable && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current])
      trRef.current.getLayer().batchDraw()
    }
  }, [selected, editable])

  const width = image.widthFrac * displaySize
  const height = width * (image.aspect || 1)
  const clipProps = getClipProps(image, width, height)

  return (
    <>
      <Group
        ref={groupRef}
        x={image.xFrac * displaySize}
        y={image.yFrac * displaySize}
        rotation={image.rotation || 0}
        opacity={image.opacity ?? 1}
        {...clipProps}
        draggable={editable}
        listening={editable}
        onClick={() => onSelect(image.id)}
        onTap={() => onSelect(image.id)}
        onDragEnd={(e) => {
          onChange({ ...image, xFrac: e.target.x() / displaySize, yFrac: e.target.y() / displaySize })
        }}
        onTransformEnd={(e) => {
          const node = e.target
          const scale = node.scaleX()
          node.scaleX(1)
          node.scaleY(1)
          onChange({
            ...image,
            xFrac: node.x() / displaySize,
            yFrac: node.y() / displaySize,
            widthFrac: Math.max(0.02, image.widthFrac * scale),
            rotation: node.rotation(),
          })
        }}
      >
        {img && <KonvaImage image={img} width={width} height={height} offsetX={width / 2} offsetY={height / 2} />}
      </Group>
      {selected && editable && (
        <Transformer
          ref={trRef}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          rotateEnabled
          keepRatio
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 16 || newBox.height < 16 ? oldBox : newBox)}
        />
      )}
    </>
  )
}

// Lets the user isolate part of the full, uncropped sticker/image — either by
// dragging a resizable rectangle, or by drawing a freehand lasso — so only
// that part survives in the final illustration.
function CropOverlay({ item, kind, displaySize, mode, rect, onRectChange, path, onPathChange }) {
  const img = kind === 'image' ? useHtmlImage(item.dataUrl) : null
  const { fullW, fullH, fontSize: glyphFontSize } = itemBoxSize(item, kind, displaySize)
  const rectRef = useRef(null)
  const trRef = useRef(null)
  const captureRef = useRef(null)
  const groupRef = useRef(null)
  const lassoing = useRef(false)

  useEffect(() => {
    if (mode === 'rect' && trRef.current && rectRef.current) {
      trRef.current.nodes([rectRef.current])
      trRef.current.getLayer().batchDraw()
    }
  }, [mode])

  const clampRect = (r) => {
    const width = Math.max(16, Math.min(r.width, fullW))
    const height = Math.max(16, Math.min(r.height, fullH))
    const x = Math.max(-fullW / 2, Math.min(r.x, fullW / 2 - width))
    const y = Math.max(-fullH / 2, Math.min(r.y, fullH / 2 - height))
    return { x, y, width, height }
  }

  const x = item.xFrac * displaySize
  const y = item.yFrac * displaySize

  // Measured relative to the outer Group (not the capture rect, which is
  // itself offset by -fullW/2,-fullH/2 inside that group) so the recorded
  // points line up with every other coordinate in this overlay — rect, path,
  // asset — which are all expressed in the group's own centered space.
  const startLasso = () => {
    lassoing.current = true
    const pos = groupRef.current.getRelativePointerPosition()
    onPathChange([pos])
  }
  const moveLasso = () => {
    if (!lassoing.current) return
    const pos = groupRef.current.getRelativePointerPosition()
    onPathChange((prev) => [...(prev || []), pos])
  }
  const endLasso = () => {
    lassoing.current = false
  }

  return (
    <Group ref={groupRef} x={x} y={y} rotation={item.rotation || 0}>
      {kind === 'sticker' ? (
        <Text
          text={item.emoji}
          fontSize={glyphFontSize}
          offsetX={fullW / 2}
          offsetY={fullH / 2}
          opacity={0.75}
          listening={false}
        />
      ) : (
        img && (
          <KonvaImage
            image={img}
            width={fullW}
            height={fullH}
            offsetX={fullW / 2}
            offsetY={fullH / 2}
            opacity={0.75}
            listening={false}
          />
        )
      )}
      <Rect x={-fullW / 2} y={-fullH / 2} width={fullW} height={fullH} fill="rgba(20,28,40,0.35)" listening={false} />

      {mode === 'rect' && (
        <>
          <Rect
            ref={rectRef}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            stroke="#2a6df4"
            strokeWidth={2}
            dash={[6, 4]}
            fill="rgba(255,255,255,0.001)"
            draggable
            onDragEnd={(e) => {
              const node = e.target
              onRectChange(clampRect({ x: node.x(), y: node.y(), width: rect.width, height: rect.height }))
            }}
            onTransformEnd={(e) => {
              const node = e.target
              const scaleX = node.scaleX()
              const scaleY = node.scaleY()
              node.scaleX(1)
              node.scaleY(1)
              onRectChange(
                clampRect({ x: node.x(), y: node.y(), width: rect.width * scaleX, height: rect.height * scaleY })
              )
            }}
          />
          <Transformer
            ref={trRef}
            enabledAnchors={[
              'top-left',
              'top-center',
              'top-right',
              'middle-right',
              'bottom-right',
              'bottom-center',
              'bottom-left',
              'middle-left',
            ]}
            rotateEnabled={false}
            keepRatio={false}
            boundBoxFunc={(oldBox, newBox) => (newBox.width < 16 || newBox.height < 16 ? oldBox : newBox)}
          />
        </>
      )}

      {mode === 'lasso' && (
        <>
          <Rect
            ref={captureRef}
            x={-fullW / 2}
            y={-fullH / 2}
            width={fullW}
            height={fullH}
            fill="rgba(255,255,255,0.001)"
            onMouseDown={startLasso}
            onMouseMove={moveLasso}
            onMouseUp={endLasso}
            onTouchStart={startLasso}
            onTouchMove={moveLasso}
            onTouchEnd={endLasso}
          />
          {path && path.length > 1 && (
            <Line
              points={path.flatMap((p) => [p.x, p.y])}
              closed
              stroke="#2a6df4"
              strokeWidth={2}
              dash={[6, 4]}
              fill="rgba(42,109,244,0.18)"
              lineJoin="round"
              listening={false}
            />
          )}
        </>
      )}
    </Group>
  )
}

export default function IllustrationEditor({
  word,
  zone,
  fontFamily,
  letterColor: initialLetterColor,
  clipboard,
  onCopy,
  onSave,
  onDeleteZone,
  onClose,
}) {
  const displaySize = useResponsiveSize()
  const { letters } = useMemo(
    () => measureWord(word.text, fontFamily, EDITOR_FONT_SIZE),
    [word.text, fontFamily]
  )
  const rect = useMemo(() => computeZoneRect(zone, letters, EDITOR_FONT_SIZE), [zone, letters])
  const frame = useMemo(() => (rect ? getZoneFrame(rect) : null), [rect])

  const [illustration, setIllustration] = useState(zone.illustration)
  const [letterColor, setLetterColor] = useState(initialLetterColor)
  const [tool, setTool] = useState('select')
  const [penColor, setPenColor] = useState(PEN_COLORS[0])
  const [penSize, setPenSize] = useState(PEN_SIZES[1].value)
  const [penOpacity, setPenOpacity] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const [cropTargetId, setCropTargetId] = useState(null)
  const [cropMode, setCropMode] = useState('rect')
  const [cropDraft, setCropDraft] = useState(null)
  const [cropPath, setCropPath] = useState(null)
  const [history, setHistory] = useState([])
  const drawingRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setIllustration(zone.illustration)
    setLetterColor(initialLetterColor)
    setSelectedId(null)
    setCropTargetId(null)
    setCropDraft(null)
    setCropPath(null)
    setHistory([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone.id])

  // Every change made in this editor — strokes, stickers, images, crops,
  // opacity, and the letter's own color — goes through one of these two
  // functions, so a single history stack covers "undo" for all of them.
  // Nothing here reaches the parent yet: it all stays local until the
  // teacher explicitly clicks "Enregistrer", so closing without saving
  // truly discards everything done in this session.
  const commit = useCallback(
    (next) => {
      setHistory((h) => [...h, { illustration, letterColor }])
      setIllustration(next)
    },
    [illustration, letterColor]
  )

  const changeLetterColor = useCallback(
    (color) => {
      setHistory((h) => [...h, { illustration, letterColor }])
      setLetterColor(color)
    },
    [illustration, letterColor]
  )

  const undo = useCallback(() => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setIllustration(prev.illustration)
    setLetterColor(prev.letterColor ?? null)
  }, [history])

  const findItem = (id) => {
    const stroke = illustration.strokes.find((s) => s.id === id)
    if (stroke) return { item: stroke, kind: 'stroke' }
    const sticker = illustration.stickers.find((s) => s.id === id)
    if (sticker) return { item: sticker, kind: 'sticker' }
    const image = illustration.images.find((im) => im.id === id)
    if (image) return { item: image, kind: 'image' }
    return null
  }

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    commit({
      ...illustration,
      strokes: illustration.strokes.filter((s) => s.id !== selectedId),
      stickers: illustration.stickers.filter((s) => s.id !== selectedId),
      images: illustration.images.filter((im) => im.id !== selectedId),
    })
    setSelectedId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, illustration])

  // Copy/paste works on a single selected sticker or image (crop and size
  // travel with it, since those live on the item itself) rather than the
  // whole illustration — driven entirely by Ctrl/Cmd+C / Ctrl/Cmd+V below,
  // no dedicated buttons. The clipboard is handed up to the parent so it
  // survives switching to another letter of the same word.
  const copySelected = useCallback(() => {
    const found = findItem(selectedId)
    if (!found) return
    onCopy({ kind: found.kind, item: JSON.parse(JSON.stringify(found.item)) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, illustration, onCopy])

  const pasteElement = useCallback(() => {
    if (!clipboard) return
    const pasted = { ...clipboard.item, id: uuid() }
    if (clipboard.kind === 'sticker') {
      commit({ ...illustration, stickers: [...illustration.stickers, pasted] })
    } else if (clipboard.kind === 'image') {
      commit({ ...illustration, images: [...illustration.images, pasted] })
    } else {
      commit({ ...illustration, strokes: [...illustration.strokes, pasted] })
    }
    setSelectedId(pasted.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipboard, illustration])

  // Keyboard shortcuts stand in for buttons this editor deliberately
  // doesn't have: Ctrl/Cmd+Z undoes, Delete/Backspace removes the selected
  // element, Ctrl/Cmd+C and +V copy and paste it. Undo works in any tool
  // (you may want to undo a stroke right after drawing it, without first
  // switching back to "select"); the rest are select-mode-only, and all of
  // them are disabled while a text input elsewhere in the editor has focus,
  // so e.g. the emoji search box can still use these same keys normally.
  useEffect(() => {
    function handleKeyDown(e) {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return
      const meta = e.ctrlKey || e.metaKey
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
        return
      }
      // Escape bails out of a stroke that's going wrong while it's still
      // being drawn (pointer still down) — the stroke never gets committed
      // to history at all, so there's nothing to undo afterward.
      if (e.key === 'Escape' && tool === 'pen' && drawingRef.current) {
        e.preventDefault()
        drawingRef.current = null
        setIllustration((prev) => ({ ...prev }))
        return
      }
      if (tool !== 'select' || cropTargetId) return
      if (meta && e.key.toLowerCase() === 'c') {
        if (!selectedId) return
        e.preventDefault()
        copySelected()
      } else if (meta && e.key.toLowerCase() === 'v') {
        if (!clipboard) return
        e.preventDefault()
        pasteElement()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!selectedId) return
        e.preventDefault()
        deleteSelected()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tool, cropTargetId, selectedId, clipboard, copySelected, pasteElement, deleteSelected, undo])

  const toFrac = (stagePos) => ({ x: stagePos.x / displaySize, y: stagePos.y / displaySize })

  const handlePointerDown = (e) => {
    if (tool !== 'pen') {
      const target = e.target
      if (target === target.getStage() || target.name() === 'bg') setSelectedId(null)
      return
    }
    const pos = e.target.getStage().getPointerPosition()
    const f = toFrac(pos)
    drawingRef.current = { id: uuid(), color: penColor, strokeWidth: penSize, opacity: penOpacity, points: [f.x, f.y] }
  }

  const handlePointerMove = (e) => {
    if (tool !== 'pen' || !drawingRef.current) return
    const pos = e.target.getStage().getPointerPosition()
    const f = toFrac(pos)
    drawingRef.current.points.push(f.x, f.y)
    setIllustration((prev) => ({ ...prev }))
  }

  const handlePointerUp = () => {
    if (tool !== 'pen' || !drawingRef.current) return
    const stroke = drawingRef.current
    drawingRef.current = null
    if (stroke.points.length >= 4) {
      commit({ ...illustration, strokes: [...illustration.strokes, stroke] })
    }
  }

  if (!frame) return null

  const addSticker = (emoji) => {
    const sticker = {
      id: uuid(),
      type: 'emoji',
      emoji,
      xFrac: 0.5,
      yFrac: 0.5,
      sizeFrac: 0.32,
      rotation: 0,
      opacity: 1,
      cropRect: DEFAULT_CROP,
      cropPath: null,
    }
    commit({ ...illustration, stickers: [...illustration.stickers, sticker] })
    setSelectedId(sticker.id)
    setTool('select')
  }

  const updateStroke = (updated) => {
    commit({ ...illustration, strokes: illustration.strokes.map((s) => (s.id === updated.id ? updated : s)) })
  }

  const updateSticker = (updated) => {
    commit({ ...illustration, stickers: illustration.stickers.map((s) => (s.id === updated.id ? updated : s)) })
  }

  const updateImage = (updated) => {
    commit({ ...illustration, images: illustration.images.map((im) => (im.id === updated.id ? updated : im)) })
  }

  const handleUpload = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      const probe = new window.Image()
      probe.onload = () => {
        const image = {
          id: uuid(),
          type: 'image',
          dataUrl,
          aspect: probe.height / probe.width,
          xFrac: 0.5,
          yFrac: 0.5,
          widthFrac: 0.45,
          rotation: 0,
          opacity: 1,
          cropRect: DEFAULT_CROP,
          cropPath: null,
        }
        commit({ ...illustration, images: [...illustration.images, image] })
        setSelectedId(image.id)
        setTool('select')
      }
      probe.src = dataUrl
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const updateOpacity = (value) => {
    const found = findItem(selectedId)
    if (!found) return
    if (found.kind === 'sticker') updateSticker({ ...found.item, opacity: value })
    else if (found.kind === 'image') updateImage({ ...found.item, opacity: value })
    else updateStroke({ ...found.item, opacity: value })
  }

  const clearZone = () => {
    if (!window.confirm('Effacer tout le dessin de cette zone ?')) return
    commit({ strokes: [], stickers: [], images: [] })
    setSelectedId(null)
  }

  const removeZone = () => {
    if (!window.confirm('Supprimer cette zone et son illustration ?')) return
    onDeleteZone(zone.id)
  }

  const startCrop = (id) => {
    const found = findItem(id)
    if (!found) return
    const { item, kind } = found
    const { fullW, fullH } = itemBoxSize(item, kind, displaySize)
    const crop = item.cropRect || DEFAULT_CROP
    setCropDraft({
      x: -fullW / 2 + crop.x * fullW,
      y: -fullH / 2 + crop.y * fullH,
      width: crop.width * fullW,
      height: crop.height * fullH,
    })
    if (item.cropPath && item.cropPath.length >= 3) {
      setCropPath(item.cropPath.map(([px, py]) => ({ x: -fullW / 2 + px * fullW, y: -fullH / 2 + py * fullH })))
      setCropMode('lasso')
    } else {
      setCropPath(null)
      setCropMode('rect')
    }
    setCropTargetId(id)
  }

  const confirmCrop = () => {
    const found = findItem(cropTargetId)
    if (!found) {
      setCropTargetId(null)
      setCropDraft(null)
      setCropPath(null)
      return
    }
    const { item, kind } = found
    const { fullW, fullH } = itemBoxSize(item, kind, displaySize)
    let patch
    if (cropMode === 'lasso') {
      if (!cropPath || cropPath.length < 3) {
        setCropTargetId(null)
        setCropDraft(null)
        setCropPath(null)
        return
      }
      patch = {
        cropPath: cropPath.map((p) => [(p.x + fullW / 2) / fullW, (p.y + fullH / 2) / fullH]),
        cropRect: DEFAULT_CROP,
      }
    } else {
      if (!cropDraft) {
        setCropTargetId(null)
        return
      }
      patch = {
        cropRect: {
          x: (cropDraft.x + fullW / 2) / fullW,
          y: (cropDraft.y + fullH / 2) / fullH,
          width: cropDraft.width / fullW,
          height: cropDraft.height / fullH,
        },
        cropPath: null,
      }
    }
    if (kind === 'sticker') updateSticker({ ...item, ...patch })
    else updateImage({ ...item, ...patch })
    setCropTargetId(null)
    setCropDraft(null)
    setCropPath(null)
  }

  const cancelCrop = () => {
    setCropTargetId(null)
    setCropDraft(null)
    setCropPath(null)
  }

  const resetCrop = () => {
    const found = findItem(cropTargetId)
    if (found) {
      const patch = { cropRect: DEFAULT_CROP, cropPath: null }
      if (found.kind === 'sticker') updateSticker({ ...found.item, ...patch })
      else updateImage({ ...found.item, ...patch })
    }
    setCropTargetId(null)
    setCropDraft(null)
    setCropPath(null)
  }

  const liveStrokes =
    drawingRef.current && tool === 'pen' ? [...illustration.strokes, drawingRef.current] : illustration.strokes

  const zoneLabel = `lettre "${letters[zone.letterIndex]?.char ?? ''}"`
  const cropFound = cropTargetId ? findItem(cropTargetId) : null
  const editableItems = tool === 'select' && !cropTargetId
  const selectedFound = selectedId ? findItem(selectedId) : null

  return (
    <div className="editor-overlay" role="dialog" aria-modal="true">
      <div className="editor-panel">
        <button type="button" className="editor-close-btn" onClick={onClose} aria-label="Fermer sans enregistrer">
          ✕
        </button>
        <div className="editor-header">
          <h2>Illustrer la {zoneLabel}</h2>
          <div className="editor-header-actions">
            <button
              type="button"
              className="btn btn-toggle active"
              onClick={() => onSave(illustration, letterColor)}
            >
              💾 Enregistrer
            </button>
          </div>
        </div>

        <div className="editor-body">
          <div className="editor-canvas-col">
            <div className="editor-stage-wrap" style={{ width: displaySize, height: displaySize }}>
              <Stage
                width={displaySize}
                height={displaySize}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
              >
                <Layer>
                  <Rect name="bg" x={0} y={0} width={displaySize} height={displaySize} fill="#fbfbf7" />

                  <Group listening={false}>
                    {letters.map((letter, i) => {
                      const lx = ((letter.x - frame.x) / frame.size) * displaySize
                      const ly = ((0 - frame.y) / frame.size) * displaySize
                      const lw = (letter.width / frame.size) * displaySize
                      const lh = ((EDITOR_FONT_SIZE * LETTER_BOX_RATIO) / frame.size) * displaySize
                      const isTarget = zone.letterIndex === i
                      return (
                        <Text
                          key={i}
                          text={letter.char}
                          x={lx}
                          y={ly}
                          width={lw}
                          height={lh}
                          fontSize={(EDITOR_FONT_SIZE / frame.size) * displaySize}
                          fontFamily={fontFamily}
                          fontStyle="700"
                          fill="#22303f"
                          opacity={isTarget ? 0.55 : 0.22}
                          align="center"
                          verticalAlign="middle"
                        />
                      )
                    })}
                  </Group>

                  {liveStrokes.map((s) => (
                    <Group key={s.id}>
                      {selectedId === s.id && (
                        <Line
                          points={s.points.map((v) => v * displaySize)}
                          stroke="#2a6df4"
                          strokeWidth={s.strokeWidth * displaySize + 14}
                          opacity={0.35}
                          lineCap="round"
                          lineJoin="round"
                          tension={0.35}
                          listening={false}
                        />
                      )}
                      <Line
                        points={s.points.map((v) => v * displaySize)}
                        stroke={s.color}
                        strokeWidth={s.strokeWidth * displaySize}
                        opacity={s.opacity ?? 1}
                        lineCap="round"
                        lineJoin="round"
                        tension={0.35}
                        hitStrokeWidth={Math.max(s.strokeWidth * displaySize, 24)}
                        listening={editableItems}
                        onClick={() => setSelectedId(s.id)}
                        onTap={() => setSelectedId(s.id)}
                      />
                    </Group>
                  ))}

                  {illustration.images
                    .filter((im) => im.id !== cropTargetId)
                    .map((im) => (
                      <EditableImage
                        key={im.id}
                        image={im}
                        displaySize={displaySize}
                        selected={selectedId === im.id}
                        editable={editableItems}
                        onSelect={setSelectedId}
                        onChange={updateImage}
                      />
                    ))}
                  {illustration.stickers
                    .filter((s) => s.id !== cropTargetId)
                    .map((s) => (
                      <EditableSticker
                        key={s.id}
                        sticker={s}
                        displaySize={displaySize}
                        selected={selectedId === s.id}
                        editable={editableItems}
                        onSelect={setSelectedId}
                        onChange={updateSticker}
                      />
                    ))}

                  {cropFound && (cropDraft || cropPath) && (
                    <CropOverlay
                      item={cropFound.item}
                      kind={cropFound.kind}
                      displaySize={displaySize}
                      mode={cropMode}
                      rect={cropDraft}
                      onRectChange={setCropDraft}
                      path={cropPath}
                      onPathChange={setCropPath}
                    />
                  )}
                </Layer>
              </Stage>
              {history.length > 0 && (
                <button
                  type="button"
                  className="canvas-undo-btn"
                  onClick={undo}
                  aria-label="Annuler la dernière action"
                  title="Annuler la dernière action"
                >
                  ↩️
                </button>
              )}
              {editableItems && selectedId && (
                <button
                  type="button"
                  className="canvas-delete-btn"
                  onClick={deleteSelected}
                  aria-label="Supprimer l’élément sélectionné"
                  title="Supprimer l’élément sélectionné"
                >
                  🗑️
                </button>
              )}
            </div>
            <p className="editor-hint">
              {cropTargetId
                ? cropMode === 'lasso'
                  ? 'Dessine un contour fermé autour de la partie à garder.'
                  : 'Fais glisser les coins pour ne garder que cette partie de l’image.'
                : tool === 'select' && selectedId
                  ? 'Glisse l’élément pour le déplacer. Ctrl/Cmd+C puis Ctrl/Cmd+V pour le dupliquer (y compris sur une autre lettre), Suppr pour le retirer, Ctrl/Cmd+Z pour annuler.'
                  : tool === 'select'
                    ? 'Clique sur un trait, un sticker ou une image pour le sélectionner (et le retirer avec Suppr). Ctrl/Cmd+Z pour annuler la dernière action.'
                    : 'La lettre reste toujours visible en filigrane : dessine ou pose les images autour, sans la cacher complètement. Échap annule le trait en cours de dessin, Ctrl/Cmd+Z annule la dernière action.'}
            </p>
          </div>

          <div className="editor-tools-col">
            {cropTargetId ? (
              <div className="editor-tool-group">
                <p className="editor-tool-label">Recadrage</p>
                <div className="editor-tabs">
                  <button
                    type="button"
                    className={`btn btn-tab ${cropMode === 'rect' ? 'active' : ''}`}
                    onClick={() => setCropMode('rect')}
                  >
                    ▭ Rectangle
                  </button>
                  <button
                    type="button"
                    className={`btn btn-tab ${cropMode === 'lasso' ? 'active' : ''}`}
                    onClick={() => {
                      setCropMode('lasso')
                      if (!cropPath) setCropPath([])
                    }}
                  >
                    🖊️ Lasso
                  </button>
                </div>
                {cropMode === 'lasso' && (
                  <button type="button" className="btn btn-secondary" onClick={() => setCropPath([])}>
                    ↩️ Recommencer le tracé
                  </button>
                )}
                <button type="button" className="btn btn-toggle active" onClick={confirmCrop}>
                  ✅ Valider le recadrage
                </button>
                <button type="button" className="btn btn-ghost" onClick={resetCrop}>
                  Retirer le recadrage
                </button>
                <button type="button" className="btn btn-ghost" onClick={cancelCrop}>
                  ✖️ Annuler
                </button>
              </div>
            ) : (
              <>
                <div className="editor-tool-group">
                  <p className="editor-tool-label">Couleur de la lettre</p>
                  <div className="pen-swatches">
                    {LETTER_COLOR_PALETTE.map(({ color, label }) => (
                      <button
                        key={color}
                        type="button"
                        className={`pen-swatch ${letterColor === color ? 'active' : ''}`}
                        style={{ background: color }}
                        aria-label={label}
                        onClick={() => changeLetterColor(color)}
                      />
                    ))}
                    <button type="button" className="btn btn-chip" onClick={() => changeLetterColor(null)}>
                      Réinitialiser
                    </button>
                  </div>
                </div>

                <div className="editor-tool-group">
                  <button
                    type="button"
                    className="btn btn-tab active"
                    onClick={() => {
                      if (tool === 'pen') {
                        setTool('select')
                      } else {
                        setTool('pen')
                        setSelectedId(null)
                      }
                    }}
                  >
                    {tool === 'pen' ? '🖐️ Terminer le dessin' : '✏️ Dessiner'}
                  </button>
                </div>

                {tool === 'pen' && (
                  <div className="editor-tool-group">
                    <p className="editor-tool-label">Couleur</p>
                    <div className="pen-swatches">
                      {PEN_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`pen-swatch ${penColor === c ? 'active' : ''}`}
                          style={{ background: c }}
                          onClick={() => setPenColor(c)}
                          aria-label={c}
                        />
                      ))}
                    </div>
                    <p className="editor-tool-label">Épaisseur</p>
                    <div className="pen-sizes">
                      {PEN_SIZES.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          className={`btn btn-chip ${penSize === p.value ? 'active' : ''}`}
                          onClick={() => setPenSize(p.value)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <p className="editor-tool-label">Transparence du trait : {Math.round(penOpacity * 100)}%</p>
                    <input
                      type="range"
                      className="opacity-slider"
                      min="0.15"
                      max="1"
                      step="0.05"
                      value={penOpacity}
                      onChange={(e) => setPenOpacity(parseFloat(e.target.value))}
                    />
                  </div>
                )}

                {tool === 'select' && selectedFound && (
                  <div className="editor-tool-group">
                    <p className="editor-tool-label">
                      Transparence {selectedFound.kind === 'stroke' ? 'du trait' : "de l'image"} :{' '}
                      {Math.round((selectedFound.item.opacity ?? 1) * 100)}%
                    </p>
                    <input
                      type="range"
                      className="opacity-slider"
                      min="0.15"
                      max="1"
                      step="0.05"
                      value={selectedFound.item.opacity ?? 1}
                      onChange={(e) => updateOpacity(parseFloat(e.target.value))}
                    />
                    {selectedFound.kind !== 'stroke' && (
                      <button type="button" className="btn btn-secondary" onClick={() => startCrop(selectedId)}>
                        ✂️ Recadrer
                      </button>
                    )}
                  </div>
                )}

                <div className="editor-tool-group">
                  <p className="editor-tool-label">Banque d'images</p>
                  <EmojiPicker onPick={addSticker} />
                </div>

                <div className="editor-tool-group">
                  <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                    📁 Importer une image
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleUpload}
                  />
                </div>

                <div className="editor-tool-group editor-tool-group-bottom">
                  <button type="button" className="btn btn-ghost" onClick={clearZone}>
                    Vider la zone
                  </button>
                  <button type="button" className="btn btn-danger" onClick={removeZone}>
                    Supprimer la zone
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

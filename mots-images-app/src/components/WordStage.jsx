import React, { useEffect, useMemo, useState, forwardRef } from 'react'
import { Stage, Layer, Text, Rect, Line, Group, Image as KonvaImage } from 'react-konva'
import {
  measureWord,
  getZoneFrame,
  computeZoneRect,
  getAiWholeWordImage,
  LETTER_BOX_RATIO,
  LETTER_GAP_RATIO,
  getClipProps,
  measureGlyphBox,
} from '../wordGeometry'

const THEME = {
  light: { background: '#ffffff', letter: '#22303f' },
  dark: { background: '#181c24', letter: '#f5f7fa' },
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

function StickerImage({ image, x, y, size, rotation }) {
  const img = useHtmlImage(image.dataUrl)
  if (!img) return null
  const height = size * (image.aspect || 1)
  const clipProps = getClipProps(image, size, height)
  return (
    <Group x={x} y={y} rotation={rotation || 0} opacity={image.opacity ?? 1} listening={false} {...clipProps}>
      <KonvaImage image={img} width={size} height={height} offsetX={size / 2} offsetY={height / 2} />
    </Group>
  )
}

// `behind` selects which of this zone's own elements to draw — each stroke,
// sticker, and image carries its own front/behind flag, so a single letter's
// illustration can straddle the letters (e.g. part of it drawn under, part
// drawn over) rather than the whole zone moving as one block.
function ZoneIllustration({ zone, frame, behind }) {
  const illu = zone.illustration
  const matches = (el) => !!el.behind === behind
  return (
    <Group listening={false}>
      {illu.strokes.filter(matches).map((s) => (
        <Line
          key={s.id}
          points={s.points.map((v, i) => (i % 2 === 0 ? frame.x + v * frame.size : frame.y + v * frame.size))}
          stroke={s.color}
          strokeWidth={s.strokeWidth * frame.size}
          opacity={s.opacity ?? 1}
          lineCap="round"
          lineJoin="round"
          tension={0.35}
        />
      ))}
      {illu.stickers.filter(matches).map((s) => {
        const size = s.sizeFrac * frame.size
        const box = measureGlyphBox(s.emoji, size)
        const clipProps = getClipProps(s, box.width, box.height)
        return (
          <Group
            key={s.id}
            x={frame.x + s.xFrac * frame.size}
            y={frame.y + s.yFrac * frame.size}
            rotation={s.rotation || 0}
            opacity={s.opacity ?? 1}
            {...clipProps}
          >
            <Text text={s.emoji} fontSize={size} offsetX={box.width / 2} offsetY={box.height / 2} />
          </Group>
        )
      })}
      {illu.images.filter(matches).map((im) => (
        <StickerImage
          key={im.id}
          image={im}
          x={frame.x + im.xFrac * frame.size}
          y={frame.y + im.yFrac * frame.size}
          size={im.widthFrac * frame.size}
          rotation={im.rotation || 0}
        />
      ))}
    </Group>
  )
}

const WordStage = forwardRef(function WordStage(
  {
    text,
    fontFamily = 'OpenDyslexic',
    fontSize = 130,
    zones,
    letterColors = {},
    theme = 'light',
    showIllustrations = true,
    interactive = false,
    onSelectLetter,
    onGapChange,
    // AI-illustration letter picking (see WordEditorPage): a distinct visual
    // mode from the normal "click a letter to open its illustration editor"
    // one, so the two never get visually confused with each other.
    selectionMode = false,
    selectedIndices = [],
    selectableIndices = null,
    margin = 40,
  },
  ref
) {
  // An AI-generated illustration (see WordEditorPage) is one complete
  // picture of the whole word, not a decoration for a single letter's box —
  // when a word has one, it replaces the entire letter row below rather
  // than being composited with it (which used to render the real letters
  // and the AI picture's own baked-in text on top of each other).
  const aiWholeWordImage = useMemo(() => getAiWholeWordImage(zones), [zones])
  const aiImg = useHtmlImage(aiWholeWordImage?.dataUrl)

  const { letters, totalWidth } = useMemo(
    () => measureWord(text, fontFamily, fontSize, zones),
    [text, fontFamily, fontSize, zones]
  )
  const boxHeight = fontSize * LETTER_BOX_RATIO
  const wordWidth = Math.max(totalWidth, fontSize)
  const palette = THEME[theme] || THEME.light

  // The visible canvas must be large enough to contain every zone's
  // illustration frame, not just the letters row — otherwise anything an
  // illustration draws above/below/beside the letters gets clipped by the
  // canvas edge.
  const bounds = useMemo(() => {
    if (aiWholeWordImage) {
      // Matches the footprint a manually-illustrated word of this length
      // would occupy (the same full letter-row width) rather than shrinking
      // to a single letter box; the image's own aspect ratio sets its height.
      const width = wordWidth
      const height = width * (aiWholeWordImage.aspect || 1)
      return { minX: 0, maxX: width, minY: 0, maxY: height }
    }
    let minX = 0
    let maxX = wordWidth
    let minY = 0
    let maxY = boxHeight
    zones.forEach((zone) => {
      const rect = computeZoneRect(zone, letters, fontSize)
      if (!rect) return
      const frame = getZoneFrame(rect)
      minX = Math.min(minX, frame.x)
      maxX = Math.max(maxX, frame.x + frame.size)
      minY = Math.min(minY, frame.y)
      maxY = Math.max(maxY, frame.y + frame.size)
    })
    return { minX, maxX, minY, maxY }
  }, [zones, letters, fontSize, wordWidth, boxHeight, aiWholeWordImage])

  const offsetX = margin - bounds.minX
  const offsetY = margin - bounds.minY
  const stageWidth = bounds.maxX - bounds.minX + margin * 2
  const stageHeight = bounds.maxY - bounds.minY + margin * 2

  return (
    <div className="word-stage-wrap">
      <Stage ref={ref} width={stageWidth} height={stageHeight}>
        <Layer x={offsetX} y={offsetY}>
          <Rect x={-offsetX} y={-offsetY} width={stageWidth} height={stageHeight} fill={palette.background} listening={false} />

          {aiWholeWordImage ? (
            aiImg && (
              <KonvaImage
                image={aiImg}
                x={0}
                y={0}
                width={bounds.maxX - bounds.minX}
                height={bounds.maxY - bounds.minY}
              />
            )
          ) : (
            <>
          {showIllustrations &&
            zones.map((zone) => {
              const rect = computeZoneRect(zone, letters, fontSize)
              if (!rect) return null
              const frame = getZoneFrame(rect)
              return <ZoneIllustration key={`${zone.id}-behind`} zone={zone} frame={frame} behind />
            })}

          {letters.map((letter, i) => {
            const zone = zones.find((z) => z.letterIndex === i)
            const prevLetter = letters[i - 1]
            // Only a letter with a predecessor can be dragged closer — there's
            // nothing before the first letter to close a gap against. It can
            // slide left far enough to fully overlap the previous glyph (not
            // just touch it), but no further — past that it would start
            // climbing onto the letter before that one, which stops making
            // sense as "closer to the previous letter". It can never open a
            // wider-than-default gap either (only closing gaps, not widening
            // them).
            const draggable = interactive && !selectionMode && i > 0 && !!onGapChange
            const isSelected = selectionMode && selectedIndices.includes(i)
            const isSelectable = !selectionMode || isSelected || !selectableIndices || selectableIndices.has(i)
            const touchX = prevLetter ? prevLetter.x + prevLetter.width : letter.x
            const dragMinX = prevLetter ? prevLetter.x : letter.x
            // Always the true default position for this letter-pair, computed
            // from the previous letter's actual (possibly itself adjusted)
            // position plus the standard gap — not letter.x itself, which
            // already reflects this letter's own current override and would
            // make the draggable range collapse to wherever it last stopped,
            // permanently losing the ability to drag it back out again.
            const dragMaxX = touchX + fontSize * LETTER_GAP_RATIO
            return (
              <Group
                key={i}
                x={letter.x}
                y={0}
                opacity={selectionMode && !isSelectable ? 0.35 : 1}
                draggable={draggable}
                // dragBoundFunc works in the Stage's absolute pixel space,
                // not this Group's local (Layer-relative) coordinates — the
                // Layer itself is shifted by (offsetX, offsetY) to fit every
                // zone illustration on-canvas, so the bounds must be
                // translated by that same offset here, or the clamp compares
                // against the wrong numbers and the letter snaps miles away
                // from the row on the very first pointer move.
                dragBoundFunc={(pos) => ({
                  x: Math.min(offsetX + dragMaxX, Math.max(offsetX + dragMinX, pos.x)),
                  y: offsetY,
                })}
                onDragEnd={(e) => {
                  const gapPx = e.target.x() - touchX
                  const minGapFrac = (dragMinX - touchX) / fontSize
                  const gapFrac = Math.min(LETTER_GAP_RATIO, Math.max(minGapFrac, gapPx / fontSize))
                  onGapChange(i, gapFrac)
                }}
              >
                <Rect
                  x={0}
                  y={0}
                  width={letter.width}
                  height={boxHeight}
                  fill={selectionMode ? (isSelected ? '#e3f1ed' : 'transparent') : interactive && zone ? '#fff3cf' : 'transparent'}
                  stroke={selectionMode ? (isSelected ? '#35665c' : '#dbe1e8') : interactive ? '#dbe1e8' : 'transparent'}
                  strokeWidth={isSelected ? 3 : 2}
                  cornerRadius={12}
                  onClick={() => interactive && isSelectable && onSelectLetter && onSelectLetter(i)}
                  onTap={() => interactive && isSelectable && onSelectLetter && onSelectLetter(i)}
                  listening={interactive && isSelectable}
                />
                <Text
                  text={letter.char}
                  x={0}
                  y={0}
                  width={letter.width}
                  height={boxHeight}
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  fontStyle="700"
                  fill={letterColors[i] || palette.letter}
                  align="center"
                  verticalAlign="middle"
                  listening={false}
                />
              </Group>
            )
          })}

          {showIllustrations &&
            zones.map((zone) => {
              const rect = computeZoneRect(zone, letters, fontSize)
              if (!rect) return null
              const frame = getZoneFrame(rect)
              return <ZoneIllustration key={`${zone.id}-front`} zone={zone} frame={frame} behind={false} />
            })}
            </>
          )}
        </Layer>
      </Stage>
    </div>
  )
})

export default WordStage

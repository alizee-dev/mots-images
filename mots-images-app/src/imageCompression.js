// Measured empirically against the real backend (binary search on PUT
// /words/:id): the whole request body is rejected with a 413 past exactly
// 102400 bytes (100 KiB) — the standard Express body-parser default. This
// budget is for the *entire* PUT body (sentence + every zone's illustration
// data), not per image, so images have to share whatever room is left once
// everything else in the word is accounted for.
const BODY_LIMIT_BYTES = 102400
const SAFETY_MARGIN_BYTES = 2000
const MIN_IMAGE_BUDGET_BYTES = 5000

const DIMENSION_STEPS = [900, 700, 500, 350, 250, 180, 120]
const QUALITY_STEPS = [0.82, 0.7, 0.55, 0.4, 0.3]

function encodeAtSize(img, maxDimension, mimeType, quality) {
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.width * scale))
  canvas.height = Math.max(1, Math.round(img.height * scale))
  const ctx = canvas.getContext('2d')
  if (mimeType === 'image/jpeg') {
    // JPEG has no alpha channel — any transparency in the source would
    // otherwise be filled in black by the browser on export. White blends
    // into this app's card background far better than that default, for the
    // rare case a non-PNG source still carries some transparency.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return mimeType === 'image/png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality)
}

// Downscales and re-encodes an image data URL through a canvas, trying
// progressively smaller sizes (and, for non-PNG sources, qualities too)
// until the result fits `targetChars` (the data URL string's length is
// effectively its byte contribution to the JSON body).
//
// A PNG source never falls back to JPEG to hit the budget: a lasso/rect
// crop is a Konva clip applied at render time, not a real cut into the
// image's own pixels, so the full original rectangle — background included
// — is still what gets re-encoded. JPEG has no transparency, so any
// transparent background baked in as opaque black right where the crop was
// supposed to show through it — exactly the bug this avoids. Below the
// smallest PNG size still not fitting, the smallest PNG is used as-is
// rather than silently swapping formats; if that still overflows the body
// limit, the save fails with a clear message instead of a broken image.
export function compressImageDataUrl(dataUrl, { forcePng = false, targetChars = 70000 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      if (forcePng) {
        let smallestPng = null
        for (const maxDimension of DIMENSION_STEPS) {
          const out = encodeAtSize(img, maxDimension, 'image/png')
          smallestPng = out
          if (out.length <= targetChars) {
            resolve(out)
            return
          }
        }
        resolve(smallestPng)
        return
      }
      for (const maxDimension of DIMENSION_STEPS) {
        for (const quality of QUALITY_STEPS) {
          const out = encodeAtSize(img, maxDimension, 'image/jpeg', quality)
          if (out.length <= targetChars) {
            resolve(out)
            return
          }
        }
      }
      // Smallest size and lowest quality tried is the best this image can
      // do — used as-is rather than failing the whole save over it.
      resolve(
        encodeAtSize(
          img,
          DIMENSION_STEPS[DIMENSION_STEPS.length - 1],
          'image/jpeg',
          QUALITY_STEPS[QUALITY_STEPS.length - 1]
        )
      )
    }
    img.onerror = () => reject(new Error("Impossible de traiter cette image."))
    img.src = dataUrl
  })
}

// A safety net at save time, not just at upload time — catches any image
// that ended up in a word's zones before this compression existed, from any
// other path that skipped it, or that individually looked fine but adds up
// with others past the body limit. Measures everything else in the word
// first (sentence, zone structure, strokes, colors, spacing) so however
// much room is genuinely left gets split evenly across however many images
// there are, rather than guessing a fixed per-image size.
export async function ensureZonesImagesAreCompressed(zones, sentence = '') {
  const allImages = []
  zones.forEach((zone) => (zone.illustration?.images || []).forEach((im) => allImages.push(im)))
  if (allImages.length === 0) return { zones, changed: false }

  const zonesWithoutImageData = zones.map((zone) => ({
    ...zone,
    illustration: {
      ...zone.illustration,
      images: (zone.illustration?.images || []).map((im) => ({ ...im, dataUrl: '' })),
    },
  }))
  const nonImageBytes = new Blob([JSON.stringify({ sentence, zones: zonesWithoutImageData })]).size
  const remainingBudget = Math.max(MIN_IMAGE_BUDGET_BYTES, BODY_LIMIT_BYTES - nonImageBytes - SAFETY_MARGIN_BYTES)
  const perImageBudget = Math.floor(remainingBudget / allImages.length)

  let changed = false
  const nextZones = await Promise.all(
    zones.map(async (zone) => {
      const images = zone.illustration?.images
      if (!images || images.length === 0) return zone
      const nextImages = await Promise.all(
        images.map(async (im) => {
          if (!im.dataUrl || im.dataUrl.length <= perImageBudget) return im
          changed = true
          const isPng = im.dataUrl.startsWith('data:image/png')
          const dataUrl = await compressImageDataUrl(im.dataUrl, { forcePng: isPng, targetChars: perImageBudget })
          return { ...im, dataUrl }
        })
      )
      return { ...zone, illustration: { ...zone.illustration, images: nextImages } }
    })
  )
  return { zones: nextZones, changed }
}

const BASE_URL = 'http://localhost:3000'

let authToken = null
let onUnauthorized = null

// The backend sometimes answers with a raw, generic string (an Express
// default like "Forbidden") rather than a message written for an end user.
// Anything not listed here is passed through as-is — most of this backend's
// own error strings (e.g. "Tous les élèves sélectionnés ont déjà cette
// série") are already specific and in French, and shouldn't be replaced.
const ERROR_TRANSLATIONS = {
  forbidden: "Tu n'as pas accès à cette ressource.",
  unauthorized: 'Ta session a expiré, merci de te reconnecter.',
  'not found': "Cette ressource n'existe pas ou plus.",
  'invalid credentials': 'Email ou mot de passe incorrect.',
  'invalid email or password': 'Email ou mot de passe incorrect.',
  'bad request': "La demande envoyée n'est pas valide.",
  'internal server error': 'Une erreur est survenue côté serveur, réessaie dans un instant.',
}

function translateErrorMessage(raw) {
  if (!raw) return raw
  const translated = ERROR_TRANSLATIONS[raw.trim().toLowerCase()]
  return translated || raw
}

export function setAuthToken(token) {
  authToken = token
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

export async function apiFetch(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    // The server never answered at all (unreachable, offline, CORS) — fetch
    // throws a raw browser TypeError ("Failed to fetch") for this, which
    // never reaches the !res.ok branch below since there's no res yet.
    throw new Error('Impossible de contacter le serveur — vérifie ta connexion.')
  }

  if (res.status === 401) {
    if (onUnauthorized) onUnauthorized()
    throw new Error('Session expirée, merci de te reconnecter.')
  }

  if (res.status === 413) {
    // A 413 is typically raised by the body-size limit before the request
    // even reaches a route handler, so there's usually no JSON body to read
    // a message from at all — this is worth a dedicated, actionable message
    // rather than falling through to a bare "Erreur 413".
    throw new Error(
      "Ce mot est trop volumineux pour être enregistré, probablement à cause d'une image importée trop lourde. Réduis la taille ou le nombre d'images utilisées sur ce mot."
    )
  }

  if (!res.ok) {
    // This backend's error responses are a bare JSON string (e.g. "Forbidden"),
    // not an { message } or { error } object — reading only those fields was
    // silently discarding every real backend error message app-wide and
    // falling back to a generic "Erreur 4xx".
    const message = await res
      .json()
      .then((data) => (typeof data === 'string' ? data : data.message || data.error))
      .catch(() => null)
    throw new Error(translateErrorMessage(message) || `Erreur ${res.status}`)
  }

  if (res.status === 204) return null
  return res.json()
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
console.log('DEBUG API URL:', BASE_URL)
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
  // POST /teachers/register now answers with this dedicated message when
  // the password is under 8 characters, instead of the generic "Bad
  // request" it used to share with every other 400 — no more guessing which
  // validation rule actually failed.
  'password must be at least 8 characters': 'Le mot de passe doit contenir au moins 8 caractères.',
  'internal server error': 'Une erreur est survenue côté serveur, réessaie dans un instant.',
}

function translateErrorMessage(raw) {
  if (!raw) return raw
  const translated = ERROR_TRANSLATIONS[raw.trim().toLowerCase()]
  return translated || raw
}

// Attaches the HTTP status to the thrown Error so a caller that needs to
// branch on *which* error happened (e.g. 429 quota vs 400 validation) can
// check `err.status` directly, instead of pattern-matching on message text —
// message-based matching already proved fragile once this session (a
// generic "Bad request" shared by an unrelated validation rule).
function statusError(message, status) {
  const err = new Error(message)
  err.status = status
  return err
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

  // POST /teachers/login also answers 401 for a rejected login attempt (bad
  // email or password) — that's not an expired session, it's a fresh,
  // never-authenticated request, so it must fall through to the generic
  // handling below and show the backend's own credentials message instead of
  // being swallowed by the "reconnecte-toi" wording meant for a token that
  // died mid-use.
  if (res.status === 401 && path !== '/teachers/login') {
    if (onUnauthorized) onUnauthorized()
    throw statusError('Session expirée, merci de te reconnecter.', 401)
  }

  if (res.status === 413) {
    // A 413 is typically raised by the body-size limit before the request
    // even reaches a route handler, so there's usually no JSON body to read
    // a message from at all — this is worth a dedicated, actionable message
    // rather than falling through to a bare "Erreur 413".
    throw statusError(
      "Ce mot est trop volumineux pour être enregistré, probablement à cause d'une image importée trop lourde. Réduis la taille ou le nombre d'images utilisées sur ce mot.",
      413
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
    throw statusError(translateErrorMessage(message) || `Erreur ${res.status}`, res.status)
  }

  if (res.status === 204) return null
  return res.json()
}

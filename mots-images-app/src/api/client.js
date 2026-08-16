const BASE_URL = 'http://localhost:3000'

let authToken = null
let onUnauthorized = null

export function setAuthToken(token) {
  authToken = token
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

export async function apiFetch(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    if (onUnauthorized) onUnauthorized()
    throw new Error('Session expirée, merci de te reconnecter.')
  }

  if (!res.ok) {
    const message = await res
      .json()
      .then((data) => data.message || data.error)
      .catch(() => null)
    throw new Error(message || `Erreur ${res.status}`)
  }

  if (res.status === 204) return null
  return res.json()
}

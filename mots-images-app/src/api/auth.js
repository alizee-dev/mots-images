import { apiFetch } from './client'

export function login(email, password) {
  return apiFetch('/teachers/login', { method: 'POST', body: { email, password } })
}

export function register(name, email, password) {
  return apiFetch('/teachers/register', { method: 'POST', body: { name, email, password } })
}

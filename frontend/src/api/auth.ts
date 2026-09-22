import { apiFetch } from './client'
import type { User } from './types'

export interface AuthResponse {
  token: string
  user: User
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/session', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export interface RegisterParams {
  name: string
  surname: string
  email: string
  password: string
}

export function register(params: RegisterParams): Promise<User> {
  return apiFetch<User>('/registrations', {
    method: 'POST',
    body: JSON.stringify({ user: params }),
  })
}

export function logout(): Promise<void> {
  return apiFetch<void>('/session', { method: 'DELETE' })
}

export function me(): Promise<User> {
  return apiFetch<User>('/me')
}

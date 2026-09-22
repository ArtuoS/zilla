import type { ApiErrorBody } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

export class ApiError extends Error {
  status: number
  errors: string[]

  constructor(status: number, body: ApiErrorBody | null) {
    super(ApiError.messageFor(status, body))
    this.status = status
    this.errors = body?.errors ?? (body?.error ? [body.error] : [])
  }

  private static messageFor(status: number, body: ApiErrorBody | null): string {
    if (body?.error) return body.error
    if (body?.errors?.length) return body.errors.join(', ')
    if (status === 401) return 'You need to sign in.'
    if (status === 403) return "You don't have permission to do that."
    if (status === 404) return 'This is unavailable, or you no longer have access to it.'
    return 'Something went wrong. Please try again.'
  }
}

let authToken: string | null = null
let onUnauthorized: (() => void) | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError(0, null)
  }

  if (response.status === 401) onUnauthorized?.()

  if (!response.ok) {
    throw new ApiError(response.status, await safeJson(response))
  }

  const text = await response.text()
  if (!text) {
    return undefined as T
  }

  return JSON.parse(text) as T
}

async function safeJson(response: Response): Promise<ApiErrorBody | null> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

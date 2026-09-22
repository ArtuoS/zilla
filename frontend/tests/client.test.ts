import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ApiError, apiFetch, setAuthToken, setUnauthorizedHandler } from '../src/api/client'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('apiFetch', () => {
  beforeEach(() => {
    setAuthToken(null)
    setUnauthorizedHandler(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('attaches the Authorization header when a token is set', async () => {
    setAuthToken('abc123')
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(200, { ok: true }))

    await apiFetch('/products')

    const [, requestInit] = fetchSpy.mock.calls[0]
    const headers = new Headers(requestInit?.headers)
    expect(headers.get('Authorization')).toBe('Bearer abc123')
  })

  test('resolves with the parsed JSON body on success', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(200, { id: '1' }))
    await expect(apiFetch('/products/1')).resolves.toEqual({ id: '1' })
  })

  test('a 401 triggers the unauthorized handler and throws an ApiError', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(401, { error: 'Unauthorized' }))

    await expect(apiFetch('/products')).rejects.toThrow(ApiError)
    expect(handler).toHaveBeenCalled()
  })

  test('a 403 throws an ApiError carrying a permission message', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(403, {}))
    await expect(apiFetch('/products/1')).rejects.toMatchObject({
      status: 403,
    })
  })

  test('a 404 throws an ApiError carrying an access-unavailable message', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(404, {}))
    const error = await apiFetch('/products/1').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(404)
    expect(error.message).toMatch(/no longer have access|unavailable/i)
  })

  test('a 422 surfaces the errors array from the response body', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(422, { errors: ["name can't be blank"] }))
    const error = await apiFetch('/products', { method: 'POST' }).catch((e) => e)
    expect(error.errors).toEqual(["name can't be blank"])
  })

  test('a network failure throws a generic retryable ApiError', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await apiFetch('/products').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.message).toBeTruthy()
  })
})

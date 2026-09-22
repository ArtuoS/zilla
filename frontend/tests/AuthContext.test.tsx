import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { AuthProvider, useAuth } from '../src/auth/AuthContext'
import { API_BASE_URL, server } from './support/server'

const ALICE = { id: 'u1', name: 'Alice', surname: 'Owner', email: 'alice@example.com' }

function Probe() {
  const { user, isLoading, login, register, logout } = useAuth()
  return (
    <div>
      <p data-testid="state">
        {isLoading ? 'loading' : user ? `signed-in:${user.email}` : 'signed-out'}
      </p>
      <button onClick={() => login('alice@example.com', 'password123')}>login</button>
      <button
        onClick={() =>
          register({ name: 'Alice', surname: 'Owner', email: 'alice@example.com', password: 'password123' })
        }
      >
        register
      </button>
      <button onClick={() => logout()}>logout</button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  test('boots signed-out with no stored token', async () => {
    renderWithProvider()
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signed-out'))
  })

  test('login persists the token and user, surviving a fresh mount (reload) (FR-1, FR-2, Scenario 1, 2)', async () => {
    server.use(
      http.post(`${API_BASE_URL}/session`, () =>
        HttpResponse.json({ token: 'tok-123', user: ALICE }),
      ),
      http.get(`${API_BASE_URL}/me`, () => HttpResponse.json(ALICE)),
    )

    const user = userEvent.setup()
    renderWithProvider()
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signed-out'))

    await user.click(screen.getByText('login'))
    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent('signed-in:alice@example.com'),
    )
    expect(localStorage.getItem('zilla_token')).toBe('tok-123')

    // Simulate a reload: fresh mount, same localStorage
    renderWithProvider()
    await waitFor(() =>
      expect(screen.getAllByTestId('state')[1]).toHaveTextContent('signed-in:alice@example.com'),
    )
  })

  test('register immediately signs the user in (Scenario 1)', async () => {
    server.use(
      http.post(`${API_BASE_URL}/registrations`, () => HttpResponse.json(ALICE, { status: 201 })),
      http.post(`${API_BASE_URL}/session`, () =>
        HttpResponse.json({ token: 'tok-456', user: ALICE }),
      ),
    )

    const user = userEvent.setup()
    renderWithProvider()
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signed-out'))

    await user.click(screen.getByText('register'))
    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent('signed-in:alice@example.com'),
    )
  })

  test('logout clears state and the stored token (Scenario 15, FR-19)', async () => {
    server.use(
      http.post(`${API_BASE_URL}/session`, () =>
        HttpResponse.json({ token: 'tok-123', user: ALICE }),
      ),
      http.delete(`${API_BASE_URL}/session`, () => new HttpResponse(null, { status: 200 })),
    )

    const user = userEvent.setup()
    renderWithProvider()
    await user.click(screen.getByText('login'))
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signed-in'))

    await user.click(screen.getByText('logout'))
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signed-out'))
    expect(localStorage.getItem('zilla_token')).toBeNull()
  })

  test('a 401 from /me on boot clears a stale token instead of getting stuck loading', async () => {
    localStorage.setItem('zilla_token', 'stale-token')
    server.use(http.get(`${API_BASE_URL}/me`, () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })))

    renderWithProvider()
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('signed-out'))
    expect(localStorage.getItem('zilla_token')).toBeNull()
  })
})

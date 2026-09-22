import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { AuthProvider } from '../src/auth/AuthContext'
import { LoginPage } from '../src/pages/LoginPage'
import { API_BASE_URL, server } from './support/server'

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Products overview</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  test('shows inline validation errors for missing fields without calling the API (FR-1)', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
  })

  test('logs in with valid credentials and lands on the products overview (Scenario 1)', async () => {
    server.use(
      http.post(`${API_BASE_URL}/session`, () =>
        HttpResponse.json({
          token: 'tok-1',
          user: { id: 'u1', name: 'Alice', surname: 'Owner', email: 'alice@example.com' },
        }),
      ),
    )

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText('Products overview')).toBeInTheDocument()
  })

  test('shows one generic error on invalid credentials, revealing neither field (FR-3, Scenario 1, Edge Case)', async () => {
    server.use(
      http.post(`${API_BASE_URL}/session`, () =>
        HttpResponse.json({ error: 'Invalid email or password' }, { status: 401 }),
      ),
    )

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Invalid email or password')
  })
})

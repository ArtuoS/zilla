import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { AuthProvider } from '../src/auth/AuthContext'
import { RegisterPage } from '../src/pages/RegisterPage'
import { API_BASE_URL, server } from './support/server'

function renderRegisterPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<p>Products overview</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), 'Alice')
  await user.type(screen.getByLabelText(/surname/i), 'Owner')
  await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
  await user.type(screen.getByLabelText(/password/i), 'password123')
}

describe('RegisterPage', () => {
  test('shows inline validation errors for missing required fields (FR-1)', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    await user.click(screen.getByRole('button', { name: /register/i }))

    expect(await screen.findByText(/^name is required$/i)).toBeInTheDocument()
    expect(screen.getByText(/^surname is required$/i)).toBeInTheDocument()
    expect(screen.getByText(/^email is required$/i)).toBeInTheDocument()
    expect(screen.getByText(/^password is required$/i)).toBeInTheDocument()
  })

  test('registering lands the new user signed in on the products overview (Scenario 1)', async () => {
    server.use(
      http.post(`${API_BASE_URL}/registrations`, () =>
        HttpResponse.json(
          { id: 'u1', name: 'Alice', surname: 'Owner', email: 'alice@example.com' },
          { status: 201 },
        ),
      ),
      http.post(`${API_BASE_URL}/session`, () =>
        HttpResponse.json({
          token: 'tok-1',
          user: { id: 'u1', name: 'Alice', surname: 'Owner', email: 'alice@example.com' },
        }),
      ),
    )

    const user = userEvent.setup()
    renderRegisterPage()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: /register/i }))

    expect(await screen.findByText('Products overview')).toBeInTheDocument()
  })

  test('shows a duplicate-email error from the API (Edge Case)', async () => {
    server.use(
      http.post(`${API_BASE_URL}/registrations`, () =>
        HttpResponse.json({ errors: ['Email has already been taken'] }, { status: 422 }),
      ),
    )

    const user = userEvent.setup()
    renderRegisterPage()
    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: /register/i }))

    expect(await screen.findByText(/email has already been taken/i)).toBeInTheDocument()
  })
})

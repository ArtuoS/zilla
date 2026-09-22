import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { AuthProvider } from '../src/auth/AuthContext'
import { StageChatPage } from '../src/pages/StageChatPage'
import { API_BASE_URL, server } from './support/server'

type ReceivedCallback = (data: { type: string }) => void
let capturedReceived: ReceivedCallback | null = null

vi.mock('../src/cable/cableConsumer', () => ({
  getCableConsumer: () => ({
    subscriptions: {
      create: (_params: unknown, callbacks: { received: ReceivedCallback }) => {
        capturedReceived = callbacks.received
        return { unsubscribe: () => {} }
      },
    },
  }),
}))

const OWNER = { id: 'u1', name: 'Alice', surname: 'Owner', email: 'alice@example.com' }
const PRODUCT = { id: 'p1', name: 'Menopause Guide', description: null, access_level: 'owner', owner: OWNER }
const STAGE = {
  id: 'ps1',
  stage_id: 's1',
  status: 'running',
  output: 'Current draft output',
  started_at: null,
  completed_at: null,
  stage: { id: 's1', name: 'Copywriting', description: null, initial_prompt: 'Write copy', sequence_order: 1 },
}

function userMessage(id: string, content: string) {
  return {
    id,
    project_id: 'proj1',
    project_stage_id: 'ps1',
    sender_type: 'user_sender',
    content,
    user: { id: 'u1', name: 'Alice', surname: 'Owner' },
    created_at: new Date().toISOString(),
  }
}

function agentMessage(id: string, content: string) {
  return {
    id,
    project_id: 'proj1',
    project_stage_id: 'ps1',
    sender_type: 'agent_sender',
    content,
    user: null,
    created_at: new Date().toISOString(),
  }
}

function renderStageChatPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  localStorage.setItem('zilla_token', 'tok-123')
  server.use(http.get(`${API_BASE_URL}/me`, () => HttpResponse.json(OWNER)))

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/products/p1/projects/proj1/stages/ps1']}>
          <Routes>
            <Route
              path="/products/:productId/projects/:projectId/stages/:projectStageId"
              element={<StageChatPage />}
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('StageChatPage', () => {
  beforeEach(() => {
    localStorage.clear()
    capturedReceived = null
  })

  test('renders message history in order with sender visually distinguished, and the stage output (FR-10, FR-11, FR-13)', async () => {
    server.use(
      http.get(`${API_BASE_URL}/products/p1`, () => HttpResponse.json(PRODUCT)),
      http.get(`${API_BASE_URL}/projects/proj1/project_stages/ps1`, () => HttpResponse.json(STAGE)),
      http.get(`${API_BASE_URL}/projects/proj1/project_stages/ps1/messages`, () =>
        HttpResponse.json([userMessage('m1', 'Make it punchier'), agentMessage('m2', 'Sure, here you go')]),
      ),
    )

    renderStageChatPage()

    const first = await screen.findByText('Make it punchier')
    const second = await screen.findByText('Sure, here you go')
    expect(first.getAttribute('data-sender')).toBe('user_sender')
    expect(second.getAttribute('data-sender')).toBe('agent_sender')
    expect(screen.getByText('Current draft output')).toBeInTheDocument()
  })

  test('rejects an empty message client-side without calling the API (Edge Case)', async () => {
    server.use(
      http.get(`${API_BASE_URL}/products/p1`, () => HttpResponse.json(PRODUCT)),
      http.get(`${API_BASE_URL}/projects/proj1/project_stages/ps1`, () => HttpResponse.json(STAGE)),
      http.get(`${API_BASE_URL}/projects/proj1/project_stages/ps1/messages`, () => HttpResponse.json([])),
    )

    let postCalled = false
    server.use(
      http.post(`${API_BASE_URL}/projects/proj1/project_stages/ps1/messages`, () => {
        postCalled = true
        return HttpResponse.json({})
      }),
    )

    const user = userEvent.setup()
    renderStageChatPage()
    await screen.findByText('Current draft output')

    await user.click(screen.getByRole('button', { name: /send/i }))
    expect(await screen.findByText(/message cannot be empty/i)).toBeInTheDocument()
    expect(postCalled).toBe(false)
  })

  test('sending appends optimistically, then a channel broadcast refetches the agent reply (FR-10, FR-12)', async () => {
    let messages = [userMessage('m1', 'hello')]
    server.use(
      http.get(`${API_BASE_URL}/products/p1`, () => HttpResponse.json(PRODUCT)),
      http.get(`${API_BASE_URL}/projects/proj1/project_stages/ps1`, () => HttpResponse.json(STAGE)),
      http.get(`${API_BASE_URL}/projects/proj1/project_stages/ps1/messages`, () => HttpResponse.json(messages)),
      http.post(`${API_BASE_URL}/projects/proj1/project_stages/ps1/messages`, async ({ request }) => {
        const body = (await request.json()) as { project_message: { content: string } }
        const created = userMessage('m2', body.project_message.content)
        messages = [...messages, created]
        return HttpResponse.json(created, { status: 201 })
      }),
    )

    const user = userEvent.setup()
    renderStageChatPage()
    await screen.findByText('hello')

    await user.type(screen.getByLabelText(/message/i), 'please revise')
    await user.click(screen.getByRole('button', { name: /send/i }))

    // Optimistic append
    expect(await screen.findByText('please revise')).toBeInTheDocument()
    await waitFor(() => expect(capturedReceived).not.toBeNull())

    // Simulate the agent's reply landing server-side, then the broadcast arriving
    messages = [...messages, agentMessage('m3', 'Here is the revision')]
    capturedReceived!({ type: 'message_created' })

    expect(await screen.findByText('Here is the revision')).toBeInTheDocument()
  })

  test('shows a "waiting for the agent" state while running and the last message is the user\'s (Edge Case)', async () => {
    server.use(
      http.get(`${API_BASE_URL}/products/p1`, () => HttpResponse.json(PRODUCT)),
      http.get(`${API_BASE_URL}/projects/proj1/project_stages/ps1`, () => HttpResponse.json(STAGE)),
      http.get(`${API_BASE_URL}/projects/proj1/project_stages/ps1/messages`, () =>
        HttpResponse.json([userMessage('m1', 'hello')]),
      ),
    )

    renderStageChatPage()
    expect(await screen.findByText(/waiting for the agent/i)).toBeInTheDocument()
  })
})

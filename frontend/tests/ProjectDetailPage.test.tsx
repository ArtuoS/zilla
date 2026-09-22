import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { ProjectDetailPage } from '../src/pages/ProjectDetailPage'
import { API_BASE_URL, server } from './support/server'

const OWNER = { id: 'u1', name: 'Alice', surname: 'Owner', email: 'alice@example.com' }
const PRODUCT = { id: 'p1', name: 'Menopause Guide', description: null, access_level: 'owner', owner: OWNER }

const STAGE_A = { id: 's1', name: 'Copywriting', sequence_order: 1 }
const STAGE_B = { id: 's2', name: 'Landing Page', sequence_order: 2 }

function projectStage(id: string, stage: typeof STAGE_A, status: string) {
  return { id, stage_id: stage.id, status, output: null, started_at: null, completed_at: null, stage }
}

function renderProjectDetailPage(projectId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/products/p1/projects/${projectId}`]}>
        <Routes>
          <Route path="/products/:productId/projects/:projectId" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProjectDetailPage', () => {
  test('two projects on the same product show independent per-stage status (FR-9, Scenario 7)', async () => {
    server.use(
      http.get(`${API_BASE_URL}/products/p1`, () => HttpResponse.json(PRODUCT)),
      http.get(`${API_BASE_URL}/projects/proj1`, () =>
        HttpResponse.json({
          id: 'proj1',
          product_id: 'p1',
          project_stages: [projectStage('ps1', STAGE_A, 'completed'), projectStage('ps2', STAGE_B, 'pending')],
        }),
      ),
      http.get(`${API_BASE_URL}/projects/proj2`, () =>
        HttpResponse.json({
          id: 'proj2',
          product_id: 'p1',
          project_stages: [projectStage('ps3', STAGE_A, 'pending'), projectStage('ps4', STAGE_B, 'pending')],
        }),
      ),
    )

    const { unmount } = renderProjectDetailPage('proj1')
    const copywritingRowA = (await screen.findByText('Copywriting')).closest('li')!
    expect(within(copywritingRowA).getByText('completed')).toBeInTheDocument()
    unmount()

    renderProjectDetailPage('proj2')
    const copywritingRowB = (await screen.findByText('Copywriting')).closest('li')!
    expect(within(copywritingRowB).getByText('pending')).toBeInTheDocument()
  })

  test('skip/redo/force-advance call the right endpoint and reflect the returned status, in any order (FR-14, Scenario 10)', async () => {
    let stages = [projectStage('ps1', STAGE_A, 'completed'), projectStage('ps2', STAGE_B, 'pending')]

    server.use(
      http.get(`${API_BASE_URL}/products/p1`, () => HttpResponse.json(PRODUCT)),
      http.get(`${API_BASE_URL}/projects/proj1`, () =>
        HttpResponse.json({ id: 'proj1', product_id: 'p1', project_stages: stages }),
      ),
      http.post(`${API_BASE_URL}/projects/proj1/project_stages/ps2/skip`, () => {
        stages = stages.map((s) => (s.id === 'ps2' ? { ...s, status: 'skipped' } : s))
        return HttpResponse.json(stages.find((s) => s.id === 'ps2'))
      }),
      http.post(`${API_BASE_URL}/projects/proj1/project_stages/ps1/redo`, () => {
        stages = stages.map((s) => (s.id === 'ps1' ? { ...s, status: 'running' } : s))
        return HttpResponse.json(stages.find((s) => s.id === 'ps1'))
      }),
    )

    const user = userEvent.setup()
    renderProjectDetailPage('proj1')

    const landingRow = (await screen.findByText('Landing Page')).closest('li')!
    await user.click(within(landingRow).getByRole('button', { name: /^skip$/i }))
    await waitFor(() => expect(within(landingRow).getByText('skipped')).toBeInTheDocument())

    // Redo an already-completed stage regardless of the other stage's (skipped) state
    const copywritingRow = screen.getByText('Copywriting').closest('li')!
    await user.click(within(copywritingRow).getByRole('button', { name: /^redo$/i }))
    await waitFor(() => expect(within(copywritingRow).getByText('running')).toBeInTheDocument())
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { ProductDetailPage } from '../src/pages/ProductDetailPage'
import { API_BASE_URL, server } from './support/server'

const OWNER = { id: 'u1', name: 'Alice', surname: 'Owner', email: 'alice@example.com' }
const BOB_PERMISSION = {
  id: 'perm1',
  product_id: 'p1',
  access_level: 'admin',
  user: { id: 'u2', name: 'Bob', surname: 'Admin', email: 'bob@example.com' },
}

function product(accessLevel: 'owner' | 'admin' | 'viewer') {
  return { id: 'p1', name: 'Menopause Guide', description: null, access_level: accessLevel, owner: OWNER }
}

function mockProductRoutes({
  accessLevel = 'owner' as 'owner' | 'admin' | 'viewer',
  stages = [] as Array<Record<string, unknown>>,
  projects = [] as Array<Record<string, unknown>>,
  permissions = [] as Array<Record<string, unknown>>,
  productStatus = 200,
} = {}) {
  server.use(
    http.get(`${API_BASE_URL}/products/p1`, () =>
      productStatus === 200
        ? HttpResponse.json(product(accessLevel))
        : HttpResponse.json({ error: 'Not found' }, { status: productStatus }),
    ),
    http.get(`${API_BASE_URL}/products/p1/stages`, () => HttpResponse.json(stages)),
    http.get(`${API_BASE_URL}/products/p1/projects`, () => HttpResponse.json(projects)),
    http.get(`${API_BASE_URL}/products/p1/permissions`, () => HttpResponse.json(permissions)),
  )
}

function renderProductDetailPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/products/p1']}>
        <Routes>
          <Route path="/products/:productId" element={<ProductDetailPage />} />
          <Route path="/products/:productId/projects/:projectId" element={<p>Project detail</p>} />
          <Route path="/" element={<p>Products overview</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProductDetailPage', () => {
  test('renders stages in the order returned by the API and validates the add-stage form (FR-6, FR-7, Scenario 5)', async () => {
    mockProductRoutes({
      stages: [
        { id: 's1', product_id: 'p1', name: 'Copywriting', description: null, initial_prompt: 'x', sequence_order: 1 },
        { id: 's2', product_id: 'p1', name: 'Landing Page', description: null, initial_prompt: 'y', sequence_order: 2 },
      ],
    })
    const user = userEvent.setup()
    renderProductDetailPage()

    const items = await screen.findAllByRole('listitem')
    const stageItems = items.filter((el) => ['Copywriting', 'Landing Page'].includes(el.textContent ?? ''))
    expect(stageItems.map((el) => el.textContent)).toEqual(['Copywriting', 'Landing Page'])

    await user.click(screen.getByRole('button', { name: /add stage/i }))
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    expect(await screen.findByText(/^name is required$/i)).toBeInTheDocument()
    expect(screen.getByText(/^initial prompt is required$/i)).toBeInTheDocument()
  })

  test('disables starting a project with zero stages, with an explanation (FR-8, Scenario 6)', async () => {
    mockProductRoutes({ stages: [] })
    renderProductDetailPage()

    const startButton = await screen.findByRole('button', { name: /start project/i })
    expect(startButton).toBeDisabled()
    expect(screen.getByText(/add at least one stage before starting a project/i)).toBeInTheDocument()
  })

  test('lists collaborators with access level and shows an error sharing with an unregistered email (FR-15, FR-16, Scenario 11)', async () => {
    mockProductRoutes({ permissions: [BOB_PERMISSION] })
    server.use(
      http.post(`${API_BASE_URL}/products/p1/permissions`, () =>
        HttpResponse.json({ errors: ['no user is registered with that email'] }, { status: 422 }),
      ),
    )

    const user = userEvent.setup()
    renderProductDetailPage()

    expect(await screen.findByText(/bob@example.com — admin/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^share$/i }))
    const dialog = screen.getByRole('dialog', { name: /share product/i })
    await user.type(within(dialog).getByLabelText(/email/i), 'nobody@example.com')
    await user.click(within(dialog).getByRole('button', { name: /^share$/i }))

    expect(await screen.findByText(/no user is registered with that email/i)).toBeInTheDocument()
  })

  test('a viewer sees no write controls (FR-18, Scenario 12)', async () => {
    mockProductRoutes({
      accessLevel: 'viewer',
      stages: [{ id: 's1', product_id: 'p1', name: 'Copywriting', description: null, initial_prompt: 'x', sequence_order: 1 }],
      permissions: [BOB_PERMISSION],
    })
    renderProductDetailPage()

    await screen.findByText('Copywriting')
    expect(screen.queryByRole('button', { name: /add stage/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /start project/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^share$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /revoke/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete product/i })).not.toBeInTheDocument()
  })

  test('an admin sees every control except delete product (FR-17, FR-18, Scenario 13)', async () => {
    mockProductRoutes({
      accessLevel: 'admin',
      stages: [{ id: 's1', product_id: 'p1', name: 'Copywriting', description: null, initial_prompt: 'x', sequence_order: 1 }],
      permissions: [BOB_PERMISSION],
    })
    renderProductDetailPage()

    await screen.findByText('Copywriting')
    expect(screen.getByRole('button', { name: /add stage/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start project/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /^share$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /revoke/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete product/i })).not.toBeInTheDocument()
  })

  test('revoking a collaborator removes them from the list immediately (Scenario 14)', async () => {
    let permissions = [BOB_PERMISSION]
    server.use(
      http.get(`${API_BASE_URL}/products/p1`, () => HttpResponse.json(product('owner'))),
      http.get(`${API_BASE_URL}/products/p1/stages`, () => HttpResponse.json([])),
      http.get(`${API_BASE_URL}/products/p1/projects`, () => HttpResponse.json([])),
      http.get(`${API_BASE_URL}/products/p1/permissions`, () => HttpResponse.json(permissions)),
      http.delete(`${API_BASE_URL}/products/p1/permissions/perm1`, () => {
        permissions = []
        return new HttpResponse(null, { status: 200 })
      }),
    )

    const user = userEvent.setup()
    renderProductDetailPage()

    const row = (await screen.findByText(/bob@example.com/)).closest('li')!
    await user.click(within(row).getByRole('button', { name: /revoke/i }))

    await waitFor(() => expect(screen.queryByText(/bob@example.com/)).not.toBeInTheDocument())
  })

  test('a 404 for the product shows an access-unavailable state with a link back to products (Edge Case)', async () => {
    mockProductRoutes({ productStatus: 404 })
    const user = userEvent.setup()
    renderProductDetailPage()

    expect(await screen.findByText(/no longer have access/i)).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /back to products/i }))
    expect(await screen.findByText('Products overview')).toBeInTheDocument()
  })
})

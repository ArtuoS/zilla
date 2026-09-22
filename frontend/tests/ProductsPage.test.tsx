import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { ProductsPage } from '../src/pages/ProductsPage'
import { API_BASE_URL, server } from './support/server'

const OWNER = { id: 'u1', name: 'Alice', surname: 'Owner', email: 'alice@example.com' }

function renderProductsPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ProductsPage />} />
          <Route path="/products/:productId" element={<p>Product detail</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProductsPage', () => {
  test('lists products with their access level (FR-4, Scenario 3)', async () => {
    server.use(
      http.get(`${API_BASE_URL}/products`, () =>
        HttpResponse.json([
          { id: 'p1', name: 'Menopause Guide', description: null, access_level: 'owner', owner: OWNER },
          { id: 'p2', name: 'Shared Product', description: null, access_level: 'viewer', owner: OWNER },
        ]),
      ),
    )

    renderProductsPage()

    expect(await screen.findByText('Menopause Guide')).toBeInTheDocument()
    expect(screen.getByText('owner')).toBeInTheDocument()
    expect(screen.getByText('Shared Product')).toBeInTheDocument()
    expect(screen.getByText('viewer')).toBeInTheDocument()
  })

  test('shows an empty state with no products (Scenario 3, Edge Case)', async () => {
    server.use(http.get(`${API_BASE_URL}/products`, () => HttpResponse.json([])))
    renderProductsPage()
    expect(await screen.findByText(/no products yet/i)).toBeInTheDocument()
  })

  test('creating a product without a name shows a validation error (FR-5, Edge Case)', async () => {
    server.use(http.get(`${API_BASE_URL}/products`, () => HttpResponse.json([])))
    const user = userEvent.setup()
    renderProductsPage()

    await screen.findByText(/no products yet/i)
    await user.click(screen.getByRole('button', { name: /new product/i }))
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(await screen.findByText(/^name is required$/i)).toBeInTheDocument()
  })

  test('creating a product adds it to the list (Scenario 4)', async () => {
    const products: Array<Record<string, unknown>> = []
    server.use(
      http.get(`${API_BASE_URL}/products`, () => HttpResponse.json(products)),
      http.post(`${API_BASE_URL}/products`, () => {
        const created = { id: 'p3', name: 'New Product', description: null, access_level: 'owner', owner: OWNER }
        products.push(created)
        return HttpResponse.json(created, { status: 201 })
      }),
    )

    const user = userEvent.setup()
    renderProductsPage()

    await screen.findByText(/no products yet/i)
    await user.click(screen.getByRole('button', { name: /new product/i }))
    await user.type(screen.getByLabelText(/name/i), 'New Product')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => expect(screen.getByText('New Product')).toBeInTheDocument())
  })
})

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { createProduct, listProducts } from '../api/products'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { ErrorBanner } from '../components/ErrorBanner'
import { Modal } from '../components/Modal'
import { QueryBoundary } from '../components/QueryBoundary'
import { TextField } from '../components/TextField'

export function ProductsPage() {
  const query = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const [isCreating, setIsCreating] = useState(false)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Products</h1>
        <Button onClick={() => setIsCreating(true)}>New product</Button>
      </div>

      <QueryBoundary query={query} loadingLabel="Loading products…">
        {(products) =>
          products.length === 0 ? (
            <EmptyState title="No products yet">Create one to get started.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {products.map((product) => (
                <li key={product.id}>
                  <Link
                    to={`/products/${product.id}`}
                    className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3 hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">{product.name}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {product.access_level}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        }
      </QueryBoundary>

      {isCreating && <CreateProductModal onClose={() => setIsCreating(false)} />}
    </div>
  )
}

function CreateProductModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState<string | undefined>()

  const mutation = useMutation({
    mutationFn: () => createProduct({ name, description: description || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onClose()
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setNameError('Name is required')
      return
    }
    setNameError(undefined)
    mutation.mutate()
  }

  return (
    <Modal title="New product" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <TextField label="Name" name="name" value={name} onChange={(e) => setName(e.target.value)} error={nameError} />
        <TextField
          label="Description (optional)"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {mutation.isError && <ErrorBanner error={mutation.error} />}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating…' : 'Create'}
        </Button>
      </form>
    </Modal>
  )
}

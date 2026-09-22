import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  createProject,
  createStage,
  getProduct,
  listPermissions,
  listProjects,
  listStages,
  revokePermission,
  shareProduct,
} from '../api/products'
import type { AccessLevel, Product } from '../api/types'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { ErrorBanner } from '../components/ErrorBanner'
import { Modal } from '../components/Modal'
import { QueryBoundary } from '../components/QueryBoundary'
import { Spinner } from '../components/Spinner'
import { TextField } from '../components/TextField'
import { useAccessLevel } from '../hooks/useAccessLevel'

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>()
  if (!productId) throw new Error('productId param is required')

  const productQuery = useQuery({ queryKey: ['product', productId], queryFn: () => getProduct(productId) })

  if (productQuery.isPending) return <Spinner label="Loading product…" />

  if (productQuery.isError) {
    if (productQuery.error instanceof ApiError && productQuery.error.status === 404) {
      return (
        <div className="mx-auto max-w-3xl p-6">
          <EmptyState title="This is unavailable, or you no longer have access to it.">
            <Link to="/" className="text-indigo-600 hover:underline">
              Back to products
            </Link>
          </EmptyState>
        </div>
      )
    }
    return (
      <div className="mx-auto max-w-3xl p-6">
        <ErrorBanner error={productQuery.error} />
      </div>
    )
  }

  return <ProductDetail productId={productId} product={productQuery.data} />
}

function ProductDetail({ productId, product }: { productId: string; product: Product }) {
  const { canManage, isOwner } = useAccessLevel(product)
  const navigate = useNavigate()

  const stagesQuery = useQuery({ queryKey: ['stages', productId], queryFn: () => listStages(productId) })
  const projectsQuery = useQuery({ queryKey: ['projects', productId], queryFn: () => listProjects(productId) })
  const permissionsQuery = useQuery({
    queryKey: ['permissions', productId],
    queryFn: () => listPermissions(productId),
  })

  const [isAddingStage, setIsAddingStage] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const queryClient = useQueryClient()
  const createProjectMutation = useMutation({
    mutationFn: () => createProject(productId),
    onSuccess: (project) => navigate(`/products/${productId}/projects/${project.id}`),
  })

  const revokeMutation = useMutation({
    mutationFn: (permissionId: string) => revokePermission(productId, permissionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['permissions', productId] }),
  })

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{product.name}</h1>
        {isOwner && (
          <Button variant="danger" onClick={() => {}}>
            Delete product
          </Button>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Stages</h2>
          {canManage && <Button onClick={() => setIsAddingStage(true)}>Add stage</Button>}
        </div>
        <QueryBoundary query={stagesQuery} loadingLabel="Loading stages…">
          {(stages) =>
            stages.length === 0 ? (
              <EmptyState title="No stages yet" />
            ) : (
              <ol className="flex flex-col gap-2">
                {stages.map((stage) => (
                  <li key={stage.id} className="rounded-md border border-gray-200 px-4 py-3">
                    {stage.name}
                  </li>
                ))}
              </ol>
            )
          }
        </QueryBoundary>
        {isAddingStage && (
          <AddStageModal productId={productId} onClose={() => setIsAddingStage(false)} />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Projects</h2>
          {canManage && (
            <Button
              onClick={() => createProjectMutation.mutate()}
              disabled={(stagesQuery.data?.length ?? 0) === 0 || createProjectMutation.isPending}
              title={
                (stagesQuery.data?.length ?? 0) === 0
                  ? 'Add at least one stage before starting a project'
                  : undefined
              }
            >
              Start project
            </Button>
          )}
        </div>
        {(stagesQuery.data?.length ?? 0) === 0 && (
          <p className="text-sm text-gray-500">Add at least one stage before starting a project.</p>
        )}
        {createProjectMutation.isError && <ErrorBanner error={createProjectMutation.error} />}
        <QueryBoundary query={projectsQuery} loadingLabel="Loading projects…">
          {(projects) =>
            projects.length === 0 ? (
              <EmptyState title="No projects yet" />
            ) : (
              <ul className="flex flex-col gap-2">
                {projects.map((project) => (
                  <li key={project.id}>
                    <Link
                      to={`/products/${productId}/projects/${project.id}`}
                      className="block rounded-md border border-gray-200 px-4 py-3 hover:bg-gray-50"
                    >
                      Project {project.id.slice(0, 8)}
                    </Link>
                  </li>
                ))}
              </ul>
            )
          }
        </QueryBoundary>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Collaborators</h2>
          {canManage && <Button onClick={() => setIsSharing(true)}>Share</Button>}
        </div>
        <QueryBoundary query={permissionsQuery} loadingLabel="Loading collaborators…">
          {(permissions) =>
            permissions.length === 0 ? (
              <EmptyState title="Not shared with anyone yet" />
            ) : (
              <ul className="flex flex-col gap-2">
                {permissions.map((permission) => (
                  <li
                    key={permission.id}
                    className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3"
                  >
                    <span>
                      {permission.user.email} — {permission.access_level}
                    </span>
                    {canManage && (
                      <Button
                        variant="secondary"
                        disabled={revokeMutation.isPending}
                        onClick={() => revokeMutation.mutate(permission.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )
          }
        </QueryBoundary>
        {revokeMutation.isError && <ErrorBanner error={revokeMutation.error} />}
        {isSharing && <ShareProductModal productId={productId} onClose={() => setIsSharing(false)} />}
      </section>
    </div>
  )
}

function AddStageModal({ productId, onClose }: { productId: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [initialPrompt, setInitialPrompt] = useState('')
  const [description, setDescription] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; initialPrompt?: string }>({})

  const mutation = useMutation({
    mutationFn: () => createStage(productId, { name, initial_prompt: initialPrompt, description: description || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages', productId] })
      onClose()
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const nextFieldErrors: typeof fieldErrors = {}
    if (!name.trim()) nextFieldErrors.name = 'Name is required'
    if (!initialPrompt.trim()) nextFieldErrors.initialPrompt = 'Initial prompt is required'
    setFieldErrors(nextFieldErrors)
    if (Object.keys(nextFieldErrors).length > 0) return
    mutation.mutate()
  }

  return (
    <Modal title="Add stage" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <TextField label="Name" name="name" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
        <TextField
          label="Initial prompt"
          name="initial_prompt"
          value={initialPrompt}
          onChange={(e) => setInitialPrompt(e.target.value)}
          error={fieldErrors.initialPrompt}
        />
        <TextField
          label="Description (optional)"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {mutation.isError && <ErrorBanner error={mutation.error} />}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Adding…' : 'Add'}
        </Button>
      </form>
    </Modal>
  )
}

function ShareProductModal({ productId, onClose }: { productId: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('viewer')

  const mutation = useMutation({
    mutationFn: () => shareProduct(productId, { email, access_level: accessLevel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions', productId] })
      onClose()
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <Modal title="Share product" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <TextField label="Email" type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="flex flex-col gap-1">
          <label htmlFor="access_level" className="text-sm font-medium text-gray-700">
            Access level
          </label>
          <select
            id="access_level"
            className="rounded-md px-3 py-2 text-sm ring-1 ring-gray-300"
            value={accessLevel}
            onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}
          >
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {mutation.isError && <ErrorBanner error={mutation.error} />}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Sharing…' : 'Share'}
        </Button>
      </form>
    </Modal>
  )
}

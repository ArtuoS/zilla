import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getProduct, getProject } from '../api/products'
import { forceAdvanceStage, redoStage, skipStage } from '../api/messages'
import type { ProjectStage } from '../api/types'
import { Button } from '../components/Button'
import { ErrorBanner } from '../components/ErrorBanner'
import { QueryBoundary } from '../components/QueryBoundary'
import { useAccessLevel } from '../hooks/useAccessLevel'

export function ProjectDetailPage() {
  const { productId, projectId } = useParams<{ productId: string; projectId: string }>()
  if (!productId || !projectId) throw new Error('productId and projectId params are required')

  const productQuery = useQuery({ queryKey: ['product', productId], queryFn: () => getProduct(productId) })
  const projectQuery = useQuery({ queryKey: ['project', projectId], queryFn: () => getProject(projectId) })
  const { canManage } = useAccessLevel(productQuery.data)

  const queryClient = useQueryClient()
  const transitionMutation = useMutation({
    mutationFn: ({ action, projectStageId }: { action: 'skip' | 'redo' | 'force_advance'; projectStageId: string }) => {
      if (action === 'skip') return skipStage(projectId, projectStageId)
      if (action === 'redo') return redoStage(projectId, projectStageId)
      return forceAdvanceStage(projectId, projectStageId)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
  })

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <Link to={`/products/${productId}`} className="text-sm text-indigo-600 hover:underline">
        Back to product
      </Link>
      <h1 className="text-xl font-semibold text-gray-900">Project {projectId.slice(0, 8)}</h1>

      {transitionMutation.isError && <ErrorBanner error={transitionMutation.error} />}

      <QueryBoundary query={projectQuery} loadingLabel="Loading project…">
        {(project) => (
          <ol className="flex flex-col gap-2">
            {project.project_stages.map((projectStage: ProjectStage) => (
              <li
                key={projectStage.id}
                className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3"
              >
                <Link
                  to={`/products/${productId}/projects/${projectId}/stages/${projectStage.id}`}
                  className="font-medium text-gray-900 hover:underline"
                >
                  {projectStage.stage.name}
                </Link>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {projectStage.status}
                  </span>
                  {canManage && (
                    <>
                      <Button
                        variant="secondary"
                        disabled={
                          transitionMutation.isPending ||
                          projectStage.status === 'skipped' ||
                          projectStage.status === 'completed'
                        }
                        onClick={() => transitionMutation.mutate({ action: 'skip', projectStageId: projectStage.id })}
                      >
                        Skip
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={
                          transitionMutation.isPending ||
                          projectStage.status === 'skipped' ||
                          projectStage.status === 'completed'
                        }
                        onClick={() =>
                          transitionMutation.mutate({ action: 'force_advance', projectStageId: projectStage.id })
                        }
                      >
                        Force complete
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={transitionMutation.isPending || projectStage.status !== 'completed'}
                        onClick={() => transitionMutation.mutate({ action: 'redo', projectStageId: projectStage.id })}
                      >
                        Redo
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </QueryBoundary>
    </div>
  )
}

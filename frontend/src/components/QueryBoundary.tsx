import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ErrorBanner } from './ErrorBanner'
import { Spinner } from './Spinner'

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>
  children: (data: T) => ReactNode
  loadingLabel?: string
}

// Uniform loading/error handling for any TanStack Query result (NFR-1): every
// page composed from this never has to hand-roll its own pending/error branch.
export function QueryBoundary<T>({ query, children, loadingLabel }: QueryBoundaryProps<T>) {
  if (query.isPending) return <Spinner label={loadingLabel} />
  if (query.isError) return <ErrorBanner error={query.error} />
  return <>{children(query.data)}</>
}

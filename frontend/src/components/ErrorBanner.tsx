import { ApiError } from '../api/client'

export function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

export function ErrorBanner({ error }: { error: unknown }) {
  return (
    <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {messageFor(error)}
    </div>
  )
}

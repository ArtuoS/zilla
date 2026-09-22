import type { Product } from '../api/types'

export interface AccessLevelFlags {
  isOwner: boolean
  isAdmin: boolean
  isViewer: boolean
  canManage: boolean
}

// Derives what the current user may do with a product from its `access_level`
// (FR-17, FR-18, NFR-2). This mirrors the backend's ProductPolicy — it exists
// so the UI never offers a control that would predictably be rejected, not as
// the actual security boundary (the backend enforces that regardless).
export function useAccessLevel(product: Product | undefined): AccessLevelFlags {
  const isOwner = product?.access_level === 'owner'
  const isAdmin = product?.access_level === 'admin'
  const isViewer = product?.access_level === 'viewer'

  return { isOwner, isAdmin, isViewer, canManage: isOwner || isAdmin }
}

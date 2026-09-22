import { describe, expect, test } from 'vitest'
import { useAccessLevel } from '../src/hooks/useAccessLevel'
import type { Product } from '../src/api/types'

function productWith(access_level: Product['access_level']): Product {
  return {
    id: 'p1',
    name: 'Product',
    description: null,
    access_level,
    owner: { id: 'u1', name: 'Owner', surname: 'X', email: 'owner@example.com' },
  }
}

describe('useAccessLevel', () => {
  test('owner: isOwner and canManage true, isAdmin/isViewer false', () => {
    const result = useAccessLevel(productWith('owner'))
    expect(result).toEqual({ isOwner: true, isAdmin: false, isViewer: false, canManage: true })
  })

  test('admin: isAdmin and canManage true, isOwner/isViewer false', () => {
    const result = useAccessLevel(productWith('admin'))
    expect(result).toEqual({ isOwner: false, isAdmin: true, isViewer: false, canManage: true })
  })

  test('viewer: isViewer true, canManage false', () => {
    const result = useAccessLevel(productWith('viewer'))
    expect(result).toEqual({ isOwner: false, isAdmin: false, isViewer: true, canManage: false })
  })

  test('undefined product: everything false', () => {
    const result = useAccessLevel(undefined)
    expect(result).toEqual({ isOwner: false, isAdmin: false, isViewer: false, canManage: false })
  })
})

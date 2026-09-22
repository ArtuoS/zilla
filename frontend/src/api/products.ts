import { apiFetch } from './client'
import type { AccessLevel, Permission, Product, Project, Stage } from './types'

export function listProducts(): Promise<Product[]> {
  return apiFetch<Product[]>('/products')
}

export function getProduct(productId: string): Promise<Product> {
  return apiFetch<Product>(`/products/${productId}`)
}

export function createProduct(params: { name: string; description?: string }): Promise<Product> {
  return apiFetch<Product>('/products', {
    method: 'POST',
    body: JSON.stringify({ product: params }),
  })
}

export function listStages(productId: string): Promise<Stage[]> {
  return apiFetch<Stage[]>(`/products/${productId}/stages`)
}

export function createStage(
  productId: string,
  params: { name: string; initial_prompt: string; description?: string },
): Promise<Stage> {
  return apiFetch<Stage>(`/products/${productId}/stages`, {
    method: 'POST',
    body: JSON.stringify({ stage: params }),
  })
}

export function listProjects(productId: string): Promise<Project[]> {
  return apiFetch<Project[]>(`/products/${productId}/projects`)
}

export function createProject(productId: string): Promise<Project> {
  return apiFetch<Project>(`/products/${productId}/projects`, { method: 'POST' })
}

export function getProject(projectId: string): Promise<Project> {
  return apiFetch<Project>(`/projects/${projectId}`)
}

export function listPermissions(productId: string): Promise<Permission[]> {
  return apiFetch<Permission[]>(`/products/${productId}/permissions`)
}

export function shareProduct(
  productId: string,
  params: { email: string; access_level: AccessLevel },
): Promise<Permission> {
  return apiFetch<Permission>(`/products/${productId}/permissions`, {
    method: 'POST',
    body: JSON.stringify({ permission: params }),
  })
}

export function revokePermission(productId: string, permissionId: string): Promise<void> {
  return apiFetch<void>(`/products/${productId}/permissions/${permissionId}`, {
    method: 'DELETE',
  })
}

import { apiFetch } from './client'
import type { ProjectMessage, ProjectStage } from './types'

export function listProjectStages(projectId: string): Promise<ProjectStage[]> {
  return apiFetch<ProjectStage[]>(`/projects/${projectId}/project_stages`)
}

export function getProjectStage(projectId: string, projectStageId: string): Promise<ProjectStage> {
  return apiFetch<ProjectStage>(`/projects/${projectId}/project_stages/${projectStageId}`)
}

export function listMessages(projectId: string, projectStageId: string): Promise<ProjectMessage[]> {
  return apiFetch<ProjectMessage[]>(`/projects/${projectId}/project_stages/${projectStageId}/messages`)
}

export function sendMessage(
  projectId: string,
  projectStageId: string,
  content: string,
): Promise<ProjectMessage> {
  return apiFetch<ProjectMessage>(`/projects/${projectId}/project_stages/${projectStageId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ project_message: { content } }),
  })
}

function transition(projectId: string, projectStageId: string, action: 'skip' | 'redo' | 'force_advance') {
  return apiFetch<ProjectStage>(`/projects/${projectId}/project_stages/${projectStageId}/${action}`, {
    method: 'POST',
  })
}

export const skipStage = (projectId: string, projectStageId: string) =>
  transition(projectId, projectStageId, 'skip')
export const redoStage = (projectId: string, projectStageId: string) =>
  transition(projectId, projectStageId, 'redo')
export const forceAdvanceStage = (projectId: string, projectStageId: string) =>
  transition(projectId, projectStageId, 'force_advance')

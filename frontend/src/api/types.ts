export interface User {
  id: string
  name: string
  surname: string
  email: string
}

export type AccessLevel = 'owner' | 'admin' | 'viewer'

export interface Product {
  id: string
  name: string
  description: string | null
  access_level: AccessLevel
  owner: User
}

export interface Stage {
  id: string
  product_id: string
  name: string
  description: string | null
  initial_prompt: string
  sequence_order: number
}

export type ProjectStageStatus = 'pending' | 'running' | 'completed' | 'skipped'

export interface ProjectStage {
  id: string
  stage_id: string
  status: ProjectStageStatus
  output: string | null
  started_at: string | null
  completed_at: string | null
  stage: Pick<Stage, 'id' | 'name' | 'sequence_order'> | Stage
}

export interface Project {
  id: string
  product_id: string
  project_stages: ProjectStage[]
}

export type SenderType = 'user_sender' | 'agent_sender'

export interface ProjectMessage {
  id: string
  project_id: string
  project_stage_id: string
  sender_type: SenderType
  content: string
  user: Pick<User, 'id' | 'name' | 'surname'> | null
  created_at: string
}

export interface Permission {
  id: string
  product_id: string
  access_level: AccessLevel
  user: User
}

export interface ApiErrorBody {
  errors?: string[]
  error?: string
}

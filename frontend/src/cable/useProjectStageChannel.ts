import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getCableConsumer } from './cableConsumer'

const TOKEN_STORAGE_KEY = 'zilla_token'

interface ProjectStageBroadcast {
  type: 'message_created'
}

// Subscribes to the given project_stage's ProjectStageChannel and invalidates
// its message-history and project-stages queries on a broadcast, so a new
// agent reply (or status change) shows up without a manual reload (FR-12).
export function useProjectStageChannel(projectId: string, projectStageId: string) {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!user || !token) return

    const consumer = getCableConsumer(token)
    const subscription = consumer.subscriptions.create(
      { channel: 'ProjectStageChannel', project_stage_id: projectStageId },
      {
        received: (data: ProjectStageBroadcast) => {
          if (data.type === 'message_created') {
            queryClient.invalidateQueries({ queryKey: ['messages', projectId, projectStageId] })
            queryClient.invalidateQueries({ queryKey: ['projectStages', projectId] })
          }
        },
      },
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [projectId, projectStageId, queryClient, user])
}

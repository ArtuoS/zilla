import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useProjectStageChannel } from '../cable/useProjectStageChannel'
import { getProjectStage, listMessages, sendMessage } from '../api/messages'
import { getProduct } from '../api/products'
import type { ProjectMessage } from '../api/types'
import { Button } from '../components/Button'
import { ErrorBanner } from '../components/ErrorBanner'
import { QueryBoundary } from '../components/QueryBoundary'
import { Spinner } from '../components/Spinner'
import { useAccessLevel } from '../hooks/useAccessLevel'

export function StageChatPage() {
  const { productId, projectId, projectStageId } = useParams<{
    productId: string
    projectId: string
    projectStageId: string
  }>()
  if (!productId || !projectId || !projectStageId) {
    throw new Error('productId, projectId, and projectStageId params are required')
  }

  useProjectStageChannel(projectId, projectStageId)

  const productQuery = useQuery({ queryKey: ['product', productId], queryFn: () => getProduct(productId) })
  const { canManage } = useAccessLevel(productQuery.data)

  const projectStageQuery = useQuery({
    queryKey: ['projectStage', projectId, projectStageId],
    queryFn: () => getProjectStage(projectId, projectStageId),
  })
  const messagesQuery = useQuery({
    queryKey: ['messages', projectId, projectStageId],
    queryFn: () => listMessages(projectId, projectStageId),
  })

  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [validationError, setValidationError] = useState<string | undefined>()

  const sendMutation = useMutation({
    mutationFn: (messageContent: string) => sendMessage(projectId, projectStageId, messageContent),
    onMutate: async (messageContent) => {
      await queryClient.cancelQueries({ queryKey: ['messages', projectId, projectStageId] })
      const previous = queryClient.getQueryData<ProjectMessage[]>(['messages', projectId, projectStageId])
      const optimisticMessage: ProjectMessage = {
        id: `optimistic-${Date.now()}`,
        project_id: projectId,
        project_stage_id: projectStageId,
        sender_type: 'user_sender',
        content: messageContent,
        user: null,
        created_at: new Date().toISOString(),
      }
      queryClient.setQueryData<ProjectMessage[]>(
        ['messages', projectId, projectStageId],
        (old) => [...(old ?? []), optimisticMessage],
      )
      return { previous }
    },
    onError: (_error, _content, context) => {
      queryClient.setQueryData(['messages', projectId, projectStageId], context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', projectId, projectStageId] })
      queryClient.invalidateQueries({ queryKey: ['projectStage', projectId, projectStageId] })
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!content.trim()) {
      setValidationError('Message cannot be empty')
      return
    }
    setValidationError(undefined)
    const messageContent = content
    setContent('')
    sendMutation.mutate(messageContent)
  }

  const messages = messagesQuery.data ?? []
  const lastMessage = messages[messages.length - 1]
  const isWaitingForAgent =
    projectStageQuery.data?.status === 'running' && lastMessage?.sender_type === 'user_sender'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <Link to={`/products/${productId}/projects/${projectId}`} className="text-sm text-indigo-600 hover:underline">
        Back to project
      </Link>

      <QueryBoundary query={projectStageQuery} loadingLabel="Loading stage…">
        {(projectStage) => (
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{projectStage.stage.name}</h1>
            {'initial_prompt' in projectStage.stage && (
              <p className="text-sm text-gray-500">{projectStage.stage.initial_prompt}</p>
            )}
            {projectStage.output && (
              <div className="mt-2 rounded-md bg-gray-50 p-3 text-sm text-gray-800">{projectStage.output}</div>
            )}
          </div>
        )}
      </QueryBoundary>

      <QueryBoundary query={messagesQuery} loadingLabel="Loading conversation…">
        {(loadedMessages) => (
          <ul className="flex flex-col gap-2">
            {loadedMessages.map((message) => (
              <li
                key={message.id}
                className={`max-w-[80%] rounded-md px-3 py-2 text-sm ${
                  message.sender_type === 'user_sender'
                    ? 'self-end bg-indigo-600 text-white'
                    : 'self-start bg-gray-100 text-gray-900'
                }`}
                data-sender={message.sender_type}
              >
                {message.content}
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>

      {isWaitingForAgent && <Spinner label="Waiting for the agent…" />}

      {canManage && (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
          <textarea
            aria-label="Message"
            className="rounded-md px-3 py-2 text-sm ring-1 ring-gray-300"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {validationError && (
            <p role="alert" className="text-sm text-red-600">
              {validationError}
            </p>
          )}
          {sendMutation.isError && <ErrorBanner error={sendMutation.error} />}
          <Button type="submit" disabled={sendMutation.isPending}>
            Send
          </Button>
        </form>
      )}
    </div>
  )
}

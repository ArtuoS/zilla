import { createConsumer, type Consumer } from '@rails/actioncable'

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:3000/cable'

let consumer: Consumer | null = null
let consumerToken: string | null = null

// Reuses the same underlying WebSocket across every ProjectStageChannel
// subscription for a given token, instead of opening a new one per hook mount.
export function getCableConsumer(token: string): Consumer {
  if (consumer && consumerToken === token) return consumer

  consumer?.disconnect()
  consumer = createConsumer(`${WS_BASE_URL}?token=${encodeURIComponent(token)}`)
  consumerToken = token
  return consumer
}

export function disconnectCableConsumer(): void {
  consumer?.disconnect()
  consumer = null
  consumerToken = null
}

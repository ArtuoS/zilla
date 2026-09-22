import { setupServer } from 'msw/node'

export const server = setupServer()

export const API_BASE_URL = 'http://localhost:3000/api/v1'

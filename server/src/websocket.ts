import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' })
  const clients = new Set<WebSocket>()

  wss.on('connection', (ws) => {
    clients.add(ws)
    console.log('WebSocket client connected')

    ws.on('close', () => {
      clients.delete(ws)
      console.log('WebSocket client disconnected')
    })

    ws.on('error', (error) => {
      console.error('WebSocket error:', error)
      clients.delete(ws)
    })
  })

  function broadcast(message: object) {
    const data = JSON.stringify(message)
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    }
  }

  return { wss, broadcast }
}

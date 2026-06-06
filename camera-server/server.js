const express = require('express')
const http = require('http')
const WebSocket = require('ws')
const cors = require('cors')
const { RTCPeerConnection, RTCSessionDescription } = require('wrtc')

const app = express()
app.use(cors())

const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

let peerConnection

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    const data = JSON.parse(message)

    // Client kirim offer
    if (data.type === 'offer') {
      peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      })

      // 🔥 DI SINI nanti kamu connect DSLR stream
      // Untuk sekarang kita fokus signaling dulu

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data)
      )

      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)

      ws.send(JSON.stringify(peerConnection.localDescription))
    }
  })
})

server.listen(3001, () => {
  console.log('WebRTC Server running on port 3001')
})
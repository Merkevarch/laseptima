const express = require('express')
const http = require('http')
const socketIo = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: { origin: '*' }
})

app.use(express.json())

io.on('connection', (socket) => {
  console.log('Client connected')
})

app.post('/print/kitchen', (req, res) => {
  const { mesa, items } = req.body
  console.log('Kitchen ticket:', { mesa, items })
  io.emit('kitchen-ticket', { mesa, items })
  res.json({ success: true })
})

app.post('/print/caja', (req, res) => {
  const { items, total, metodo } = req.body
  console.log('Caja ticket:', { items, total, metodo })
  res.json({ success: true })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Print bridge running on port ${PORT}`)
})
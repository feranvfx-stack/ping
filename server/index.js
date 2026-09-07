import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json({ limit: '25mb' }))

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e8
})

// Stores
const users = new Map() // uid -> userProfile
const onlineUsers = new Set() // Set of active uids
const userSockets = new Map() // uid -> Set<socketId>
const chats = new Map() // chatId -> chatSummary
const messages = new Map() // chatId -> message[]
const activeCalls = new Map() // callId -> callMeta
const statuses = new Map() // statusId -> statusObject

// Clean up expired statuses (> 24h)
function cleanExpiredStatuses() {
  const now = Date.now()
  for (const [id, st] of statuses.entries()) {
    if (new Date(st.expiresAt).getTime() <= now) {
      statuses.delete(id)
    }
  }
}
setInterval(cleanExpiredStatuses, 60 * 1000)

io.on('connection', (socket) => {
  let registeredUid = null

  // Register user and join their personal room
  socket.on('register_user', (userData) => {
    if (!userData || !userData.uid) return
    registeredUid = userData.uid

    // Join the socket to the user's private UID room for direct peer delivery
    socket.join(userData.uid)

    // Multi-socket tracking
    if (!userSockets.has(userData.uid)) {
      userSockets.set(userData.uid, new Set())
    }
    userSockets.get(userData.uid).add(socket.id)

    const cleanEmail = (userData.email || '').toLowerCase().trim()
    const existing = users.get(userData.uid) || {}

    const userProfile = {
      ...existing,
      uid: userData.uid,
      displayName: userData.displayName || existing.displayName || cleanEmail.split('@')[0] || 'User',
      email: cleanEmail,
      status: userData.status || existing.status || 'Hey there! I am using Ping.',
      photoURL: userData.photoURL || existing.photoURL || '',
      lastSeen: new Date().toISOString()
    }

    users.set(userData.uid, userProfile)
    onlineUsers.add(userData.uid)

    io.emit('presence_update', { onlineUserIds: Array.from(onlineUsers) })
    io.emit('user_registered', userProfile)
  })

  // Join a specific chat room
  socket.on('join_chat', (chatId) => {
    if (chatId) {
      socket.join(chatId)
    }
  })

  socket.on('leave_chat', (chatId) => {
    if (chatId) {
      socket.leave(chatId)
    }
  })

  // Update profile customization (avatar, display name, status)
  socket.on('update_profile', (updatedProfile) => {
    if (!updatedProfile || !updatedProfile.uid) return
    const current = users.get(updatedProfile.uid) || {}
    const merged = { ...current, ...updatedProfile }
    users.set(updatedProfile.uid, merged)

    io.emit('user_updated', merged)
  })

  // Instant real-time message delivery
  socket.on('send_message', (msg) => {
    if (!msg || !msg.chatId || !msg.senderId) return

    const fullMsg = {
      id: msg.id || 'm_' + Math.random().toString(36).substring(2, 9),
      chatId: msg.chatId,
      senderId: msg.senderId,
      senderName: msg.senderName || 'Anonymous',
      content: msg.content || '',
      type: msg.type || 'text',
      audioData: msg.audioData || null,
      audioDuration: msg.audioDuration || 0,
      timestamp: msg.timestamp || new Date().toISOString(),
      status: 'sent',
      edited: false,
      deleted: false,
      resharedStatus: msg.resharedStatus || null
    }

    if (!messages.has(msg.chatId)) {
      messages.set(msg.chatId, [])
    }
    messages.get(msg.chatId).push(fullMsg)

    let preview = fullMsg.content
    if (fullMsg.type === 'audio') {
      preview = `🎤 Voice note (${Math.round(fullMsg.audioDuration || 0)}s)`
    } else if (fullMsg.type === 'status_reshare' || fullMsg.resharedStatus) {
      preview = `🔄 Reshared Status`
    }

    const participants = msg.participants || msg.chatId.split('_')
    const chatMeta = {
      id: msg.chatId,
      participants,
      lastMessage: preview,
      lastMessageSenderId: fullMsg.senderId,
      lastUpdated: fullMsg.timestamp
    }
    chats.set(msg.chatId, chatMeta)

    // 1. Deliver to the active chat room
    io.to(msg.chatId).emit('new_message', fullMsg)

    // 2. Deliver directly to each participant's personal room
    participants.forEach((uid) => {
      io.to(uid).emit('new_message', fullMsg)
      io.to(uid).emit('chat_updated', chatMeta)
    })
  })

  // Edit Message
  socket.on('edit_message', ({ chatId, messageId, newContent }) => {
    const chatMsgs = messages.get(chatId)
    if (!chatMsgs) return
    const msg = chatMsgs.find(m => m.id === messageId)
    if (msg && !msg.deleted) {
      msg.content = newContent
      msg.edited = true
      msg.editedAt = new Date().toISOString()

      io.to(chatId).emit('message_edited', { chatId, messageId, newContent, editedAt: msg.editedAt })

      const chat = chats.get(chatId)
      if (chat && chat.lastMessageSenderId === msg.senderId) {
        chat.lastMessage = newContent
        io.emit('chat_updated', chat)
      }
    }
  })

  // Delete Message
  socket.on('delete_message', ({ chatId, messageId }) => {
    const chatMsgs = messages.get(chatId)
    if (!chatMsgs) return
    const msg = chatMsgs.find(m => m.id === messageId)
    if (msg) {
      msg.deleted = true
      msg.content = ''
      msg.audioData = null

      io.to(chatId).emit('message_deleted', { chatId, messageId })

      const chat = chats.get(chatId)
      if (chat) {
        chat.lastMessage = 'This message was deleted'
        io.emit('chat_updated', chat)
      }
    }
  })

  // Mark messages as read
  socket.on('mark_read', ({ chatId, readerUid }) => {
    const chatMsgs = messages.get(chatId)
    if (!chatMsgs) return
    let changed = false
    chatMsgs.forEach(m => {
      if (m.senderId !== readerUid && m.status !== 'read') {
        m.status = 'read'
        changed = true
      }
    })
    if (changed) {
      io.to(chatId).emit('messages_read', { chatId, readerUid })
    }
  })

  // Typing
  socket.on('typing', ({ chatId, senderId, senderName, isTyping }) => {
    socket.to(chatId).emit('user_typing', { chatId, senderId, senderName, isTyping })
  })

  /* =========================================================================
     WEBRTC P2P SIGNALING (Direct Room-Based Delivery with Multi-Socket Support)
     ========================================================================= */

  // Initiate Call
  socket.on('call_user', ({ calleeUid, callType, offer }) => {
    const callerUid = registeredUid
    if (!callerUid || !calleeUid) return

    // Check if callee is registered and online
    const calleeSockets = userSockets.get(calleeUid)
    if (!onlineUsers.has(calleeUid) || !calleeSockets || calleeSockets.size === 0) {
      socket.emit('call_failed', { reason: 'Contact is currently offline.' })
      return
    }

    const callId = 'call_' + Math.random().toString(36).substring(2, 9)
    const callerProfile = users.get(callerUid) || { displayName: 'Someone', email: '', photoURL: '' }

    activeCalls.set(callId, {
      callId,
      callerUid,
      calleeUid,
      callType,
      status: 'ringing'
    })

    // Echo callId back to the caller
    socket.emit('call_initiated', { callId })

    // Emit directly to callee's personal room
    io.to(calleeUid).emit('incoming_call', {
      callId,
      callerUid,
      callerName: callerProfile.displayName,
      callerPhoto: callerProfile.photoURL,
      callType,
      offer
    })
  })

  // Accept Call
  socket.on('accept_call', ({ callId, callerUid, answer }) => {
    const call = activeCalls.get(callId)
    if (call) call.status = 'connected'

    io.to(callerUid).emit('call_accepted', {
      callId,
      calleeUid: registeredUid,
      answer
    })
  })

  // Decline Call
  socket.on('decline_call', ({ callId, callerUid }) => {
    activeCalls.delete(callId)
    io.to(callerUid).emit('call_declined', { callId })
  })

  // ICE Candidates
  socket.on('ice_candidate', ({ targetUid, candidate, callId }) => {
    if (!targetUid || !candidate) return
    io.to(targetUid).emit('ice_candidate', {
      candidate,
      callId,
      senderUid: registeredUid
    })
  })

  // Hang up
  socket.on('end_call', ({ callId, peerUid }) => {
    activeCalls.delete(callId)
    if (peerUid) {
      io.to(peerUid).emit('call_ended', { callId })
    }
  })

  /* =========================================================================
     STATUS SYSTEM (Stories with 24-Hour Expiration & Resharing)
     ========================================================================= */

  socket.on('post_status', (statusData) => {
    if (!statusData) return
    const authorUid = registeredUid || statusData.authorUid
    if (!authorUid) return

    const author = users.get(authorUid) || {}
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

    const newStatus = {
      id: 'st_' + Math.random().toString(36).substring(2, 9),
      authorUid,
      authorName: statusData.authorName || author.displayName || 'User',
      authorEmail: statusData.authorEmail || author.email || '',
      authorPhoto: statusData.authorPhoto || author.photoURL || '',
      type: statusData.type || 'text', // 'text' | 'image'
      content: statusData.content || '',
      caption: statusData.caption || '',
      backgroundColor: statusData.backgroundColor || 'linear-gradient(135deg, #0084FF 0%, #0052CC 100%)',
      fontStyle: statusData.fontStyle || 'Inter',
      createdAt: now.toISOString(),
      expiresAt,
      viewers: [],
      resharedFrom: statusData.resharedFrom || null
    }

    statuses.set(newStatus.id, newStatus)
    io.emit('new_status', newStatus)
  })

  socket.on('view_status', ({ statusId, viewerUid, viewerName, viewerEmail, viewerPhoto }) => {
    if (!statusId || !viewerUid) return
    const st = statuses.get(statusId)
    if (!st) return

    // Avoid duplicate viewer entries
    if (!st.viewers.some(v => v.uid === viewerUid)) {
      const viewerEntry = {
        uid: viewerUid,
        name: viewerName || 'Contact',
        email: viewerEmail || '',
        photoURL: viewerPhoto || '',
        viewedAt: new Date().toISOString()
      }
      st.viewers.push(viewerEntry)

      // Notify the author with updated viewer list
      io.to(st.authorUid).emit('status_viewed', {
        statusId,
        viewers: st.viewers
      })
    }
  })

  socket.on('delete_status', ({ statusId, uid }) => {
    if (!statusId) return
    const st = statuses.get(statusId)
    if (st && (st.authorUid === uid || st.authorUid === registeredUid)) {
      statuses.delete(statusId)
      io.emit('status_deleted', { statusId })
    }
  })

  socket.on('disconnect', () => {
    if (registeredUid && userSockets.has(registeredUid)) {
      const socketSet = userSockets.get(registeredUid)
      socketSet.delete(socket.id)
      if (socketSet.size === 0) {
        userSockets.delete(registeredUid)
        onlineUsers.delete(registeredUid)
        io.emit('presence_update', { onlineUserIds: Array.from(onlineUsers) })
      }
    }
  })
})

// REST APIs
// Exact email lookup - ONLY allows connecting if user is registered on Ping
app.get('/api/users/lookup', (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase()
  if (!email) {
    return res.status(400).json({ error: 'Email parameter is required' })
  }

  for (const user of users.values()) {
    if (user.email.toLowerCase() === email) {
      return res.json({ found: true, user })
    }
  }

  // Not found on Ping
  return res.status(404).json({
    found: false,
    message: 'No registered Ping user with that email yet.'
  })
})

app.get('/api/users', (req, res) => {
  res.json(Array.from(users.values()))
})

app.get('/api/chats', (req, res) => {
  const { userId } = req.query
  const allChats = Array.from(chats.values())
  if (!userId) return res.json(allChats)
  const filtered = allChats.filter(c => c.participants.includes(userId))
  res.json(filtered)
})

app.get('/api/chats/:chatId/messages', (req, res) => {
  const { chatId } = req.params
  res.json(messages.get(chatId) || [])
})

// Statuses REST API
app.get('/api/statuses', (req, res) => {
  cleanExpiredStatuses()
  const allStatuses = Array.from(statuses.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )
  res.json(allStatuses)
})

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'whatsapp-blue-p2p',
    registeredUsersCount: users.size,
    activeStatusesCount: statuses.size,
    time: new Date().toISOString()
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Ping WhatsApp Blue P2P & Real-time Server listening on port ${PORT}`)
})

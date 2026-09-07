import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SeoHead from './SeoHead'
import SettingsModal from './SettingsModal'
import CreateStatusModal from './CreateStatusModal'
import StatusViewerModal from './StatusViewerModal'
import VoiceNotePlayer from './VoiceNotePlayer'
import CallModal from './CallModal'
import { socket, connectSocket } from '../socketClient'
import { getFallbackAvatar, relativeTime, formatClock, formatDuration } from '../utils/avatar'
import { playMessageChime, startCallRingtone, stopCallRingtone } from '../utils/sound'

const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000`

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ]
}

export default function ChatApp({ currentUser, onSignOut, onProfileUpdate }) {
  const { chatId: routeChatId } = useParams()
  const navigate = useNavigate()

  // Navigation rail tab: 'chats' | 'contacts' | 'status' | 'calls'
  const [sidebarTab, setSidebarTab] = useState('chats')
  const [theme, setTheme] = useState(() => localStorage.getItem('ping_theme') || 'light')

  // Chat & Contact State
  const [chats, setChats] = useState([])
  const activeChatId = routeChatId || null
  const [messages, setMessages] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [text, setText] = useState('')
  const [onlineUserIds, setOnlineUserIds] = useState(new Set())
  const [typingPeer, setTypingPeer] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [contactSearchQuery, setContactSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all' | 'unread' | 'online'

  // Inline Quick Add Contact in Sidebar
  const [newContactEmail, setNewContactEmail] = useState('')
  const [addContactStatus, setAddContactStatus] = useState('')
  const [isAddingContact, setIsAddingContact] = useState(false)

  // Status System State
  const [allStatuses, setAllStatuses] = useState([])
  const [showCreateStatusModal, setShowCreateStatusModal] = useState(false)
  const [activeViewerStatusGroup, setActiveViewerStatusGroup] = useState(null)
  const [activeViewerInitialIndex, setActiveViewerInitialIndex] = useState(0)

  // WebRTC Call State
  const [activeCall, setActiveCall] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [callDuration, setCallDuration] = useState(0)
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [p2pStats, setP2pStats] = useState('Direct P2P')
  const [callLogs, setCallLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('ping_call_logs')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Voice Note Recording State
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)

  // Modals & Panels
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [unreadCounts, setUnreadCounts] = useState({})

  // Refs
  const peerConnectionRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const callDurationIntervalRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordingStreamRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)
  const recordingSecondsRef = useRef(0)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  function showToast(msg) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  function toggleTheme() {
    const nextTheme = theme === 'midnight' ? 'light' : 'midnight'
    setTheme(nextTheme)
    localStorage.setItem('ping_theme', nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
  }

  // Load saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('ping_theme') || 'light'
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  // Derive active peer
  const peerUser = useMemo(() => {
    if (!activeChatId || !currentUser) return null
    const participantUids = activeChatId.split('_')
    const otherUid = participantUids.find((id) => id !== currentUser.uid)
    if (!otherUid) return null
    return (
      allUsers.find((u) => u.uid === otherUid) || {
        uid: otherUid,
        displayName: otherUid.replace('u_', ''),
        email: ''
      }
    )
  }, [activeChatId, currentUser, allUsers])

  // Redirect if not logged in
  useEffect(() => {
    if (!currentUser) {
      navigate('/')
    }
  }, [currentUser, navigate])

  // Initial user registration, socket setup, and status loading
  useEffect(() => {
    if (!currentUser) return

    connectSocket(currentUser)

    fetch(`${API}/api/users`)
      .then((res) => res.json())
      .then((data) => setAllUsers(data || []))
      .catch((err) => console.warn('Failed fetching users', err))

    fetch(`${API}/api/chats?userId=${currentUser.uid}`)
      .then((res) => res.json())
      .then((data) => setChats(data || []))
      .catch((err) => console.warn('Failed fetching chats', err))

    fetch(`${API}/api/statuses`)
      .then((res) => res.json())
      .then((data) => setAllStatuses(data || []))
      .catch((err) => console.warn('Failed fetching statuses', err))

    socket.on('presence_update', ({ onlineUserIds: uids }) => {
      setOnlineUserIds(new Set(uids || []))
    })

    socket.on('user_registered', (newUser) => {
      setAllUsers((prev) => {
        const exists = prev.some((u) => u.uid === newUser.uid)
        return exists ? prev : [...prev, newUser]
      })
    })

    socket.on('user_updated', (updatedUser) => {
      setAllUsers((prev) =>
        prev.map((u) => (u.uid === updatedUser.uid ? updatedUser : u))
      )
    })

    socket.on('chat_updated', (updatedChat) => {
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === updatedChat.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = updatedChat
          return next.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
        }
        if (updatedChat.participants.includes(currentUser.uid)) {
          return [updatedChat, ...prev]
        }
        return prev
      })
    })

    socket.on('new_status', (newStatus) => {
      setAllStatuses((prev) => [newStatus, ...prev.filter((s) => s.id !== newStatus.id)])
    })

    socket.on('status_viewed', ({ statusId, viewers }) => {
      setAllStatuses((prev) =>
        prev.map((st) => (st.id === statusId ? { ...st, viewers } : st))
      )
    })

    socket.on('status_deleted', ({ statusId }) => {
      setAllStatuses((prev) => prev.filter((st) => st.id !== statusId))
    })

    return () => {
      socket.off('presence_update')
      socket.off('user_registered')
      socket.off('user_updated')
      socket.off('chat_updated')
      socket.off('new_status')
      socket.off('status_viewed')
      socket.off('status_deleted')
    }
  }, [currentUser])

  // Active chat room listeners
  useEffect(() => {
    if (!activeChatId || !currentUser) return

    socket.emit('join_chat', activeChatId)

    fetch(`${API}/api/chats/${activeChatId}/messages`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data || [])
        socket.emit('mark_read', { chatId: activeChatId, readerUid: currentUser.uid })
      })
      .catch((err) => console.warn('Failed loading messages', err))

    const handleNewMessage = (msg) => {
      if (msg.chatId === activeChatId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        if (msg.senderId !== currentUser.uid) {
          socket.emit('mark_read', { chatId: activeChatId, readerUid: currentUser.uid })
        }
      } else if (msg.senderId !== currentUser.uid) {
        setUnreadCounts((prev) => ({ ...prev, [msg.chatId]: (prev[msg.chatId] || 0) + 1 }))
      }

      if (msg.senderId !== currentUser.uid) {
        if (localStorage.getItem('ping_sound') !== 'false') {
          playMessageChime()
        }
      }
    }

    const handleMessageEdited = ({ chatId, messageId, newContent, editedAt }) => {
      if (chatId === activeChatId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, content: newContent, edited: true, editedAt } : m
          )
        )
      }
    }

    const handleMessageDeleted = ({ chatId, messageId }) => {
      if (chatId === activeChatId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, deleted: true, content: '', audioData: null, resharedStatus: null }
              : m
          )
        )
      }
    }

    const handleMessagesRead = ({ chatId, readerUid }) => {
      if (chatId === activeChatId) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId !== readerUid ? { ...m, status: 'read' } : m))
        )
      }
    }

    const handleUserTyping = ({ chatId, senderId, senderName, isTyping }) => {
      if (chatId === activeChatId && senderId !== currentUser.uid) {
        setTypingPeer(isTyping ? senderName : null)
      }
    }

    socket.on('new_message', handleNewMessage)
    socket.on('message_edited', handleMessageEdited)
    socket.on('message_deleted', handleMessageDeleted)
    socket.on('messages_read', handleMessagesRead)
    socket.on('user_typing', handleUserTyping)

    return () => {
      socket.emit('leave_chat', activeChatId)
      socket.off('new_message', handleNewMessage)
      socket.off('message_edited', handleMessageEdited)
      socket.off('message_deleted', handleMessageDeleted)
      socket.off('messages_read', handleMessagesRead)
      socket.off('user_typing', handleUserTyping)
    }
  }, [activeChatId, currentUser])

  // Scroll to bottom on message change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* =========================================================================
     WEBRTC P2P SIGNALING & ROBUST CALL HANDLERS
     ========================================================================= */

  const startCallTimer = useCallback(() => {
    clearInterval(callDurationIntervalRef.current)
    setCallDuration(0)
    callDurationIntervalRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1)
    }, 1000)
  }, [])

  const recordCallLog = useCallback((peerName, peerUid, callType, duration, direction = 'outgoing') => {
    const log = {
      id: 'log_' + Date.now(),
      peerName,
      peerUid,
      callType,
      duration,
      direction,
      timestamp: new Date().toISOString()
    }
    setCallLogs((prev) => {
      const updated = [log, ...prev.slice(0, 49)]
      try {
        localStorage.setItem('ping_call_logs', JSON.stringify(updated))
      } catch {
        // Ignored
      }
      return updated
    })
  }, [])

  const cleanupCall = useCallback(() => {
    stopCallRingtone()
    clearInterval(callDurationIntervalRef.current)

    setActiveCall((currActive) => {
      if (currActive && currActive.status === 'connected') {
        recordCallLog(currActive.peerName, currActive.peerUid, currActive.callType, callDuration, 'outgoing')
      }
      return null
    })

    setCallDuration(0)
    setIncomingCall(null)
    setIsMicMuted(false)
    setIsCameraOff(false)
    pendingCandidatesRef.current = []

    setLocalStream((curr) => {
      if (curr) curr.getTracks().forEach((t) => t.stop())
      return null
    })

    setRemoteStream((curr) => {
      if (curr) curr.getTracks().forEach((t) => t.stop())
      return null
    })

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
  }, [callDuration, recordCallLog])

  useEffect(() => {
    const handleIncomingCall = (callData) => {
      setIncomingCall(callData)
      startCallRingtone()
    }

    const handleCallInitiated = ({ callId }) => {
      setActiveCall((prev) => (prev ? { ...prev, callId } : null))
    }

    const handleCallAccepted = async ({ answer }) => {
      stopCallRingtone()
      if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
          setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null))
          startCallTimer()
          setP2pStats('Connected · Direct P2P')

          while (pendingCandidatesRef.current.length > 0) {
            const cand = pendingCandidatesRef.current.shift()
            peerConnectionRef.current
              .addIceCandidate(new RTCIceCandidate(cand))
              .catch((e) => console.warn('ICE drain error', e))
          }
        } catch (err) {
          console.error('Failed setting remote description on call accept', err)
        }
      }
    }

    const handleCallDeclined = () => {
      stopCallRingtone()
      showToast('Call was declined')
      cleanupCall()
    }

    const handleIceCandidate = async ({ candidate }) => {
      if (!candidate) return
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.warn('ICE candidate error', err)
        }
      } else {
        pendingCandidatesRef.current.push(candidate)
      }
    }

    const handleCallEnded = () => {
      stopCallRingtone()
      showToast('Call ended')
      cleanupCall()
    }

    const handleCallFailed = ({ reason }) => {
      stopCallRingtone()
      showToast(reason || 'Call failed')
      cleanupCall()
    }

    socket.on('call_initiated', handleCallInitiated)
    socket.on('incoming_call', handleIncomingCall)
    socket.on('call_accepted', handleCallAccepted)
    socket.on('call_declined', handleCallDeclined)
    socket.on('ice_candidate', handleIceCandidate)
    socket.on('call_ended', handleCallEnded)
    socket.on('call_failed', handleCallFailed)

    return () => {
      socket.off('call_initiated', handleCallInitiated)
      socket.off('incoming_call', handleIncomingCall)
      socket.off('call_accepted', handleCallAccepted)
      socket.off('call_declined', handleCallDeclined)
      socket.off('ice_candidate', handleIceCandidate)
      socket.off('call_ended', handleCallEnded)
      socket.off('call_failed', handleCallFailed)
      stopCallRingtone()
    }
  }, [cleanupCall, startCallTimer])

  // Initiate Call (Direct Call to peerUser or specified contact)
  async function startCall(callType, targetPeer = null) {
    const peer = targetPeer || peerUser
    if (!peer) return
    if (activeCall) {
      showToast('Already in an active call.')
      return
    }

    let stream
    try {
      const constraints = {
        audio: true,
        video: callType === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false
      }
      stream = await navigator.mediaDevices.getUserMedia(constraints)
    } catch (err) {
      console.warn('getUserMedia error for call', err)
      if (callType === 'video') {
        showToast('Camera unavailable. Starting voice call instead…')
        return startCall('audio', peer)
      }
      showToast('Could not access microphone.')
      return
    }

    try {
      setLocalStream(stream)

      const pc = new RTCPeerConnection(rtcConfig)
      peerConnectionRef.current = pc

      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0])
        }
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice_candidate', {
            targetUid: peer.uid,
            candidate: event.candidate.toJSON()
          })
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setP2pStats('Connected · Direct P2P')
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          cleanupCall()
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      setActiveCall({
        peerUid: peer.uid,
        peerName: peer.displayName,
        peerPhoto: peer.photoURL || '',
        callType,
        status: 'ringing'
      })

      socket.emit('call_user', {
        calleeUid: peer.uid,
        callType,
        offer
      })
    } catch (err) {
      console.error('Call initiation error', err)
      showToast('Call setup error. Please try again.')
      cleanupCall()
    }
  }

  // Accept Call
  async function acceptCall() {
    if (!incomingCall) return
    stopCallRingtone()
    const { callId, callerUid, callerName, callerPhoto, callType, offer } = incomingCall
    setIncomingCall(null)

    let stream
    try {
      const constraints = {
        audio: true,
        video: callType === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false
      }
      stream = await navigator.mediaDevices.getUserMedia(constraints)
    } catch (err) {
      console.warn('getUserMedia error on accept', err)
      if (callType === 'video') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch {
          showToast('Failed connecting call: permission denied.')
          cleanupCall()
          return
        }
      } else {
        showToast('Failed connecting call: microphone denied.')
        cleanupCall()
        return
      }
    }

    try {
      setLocalStream(stream)

      const pc = new RTCPeerConnection(rtcConfig)
      peerConnectionRef.current = pc

      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0])
        }
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice_candidate', {
            targetUid: callerUid,
            candidate: event.candidate.toJSON(),
            callId
          })
        }
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer))

      while (pendingCandidatesRef.current.length > 0) {
        const cand = pendingCandidatesRef.current.shift()
        pc.addIceCandidate(new RTCIceCandidate(cand)).catch((e) => console.warn('ICE drain error', e))
      }

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      setActiveCall({
        callId,
        peerUid: callerUid,
        peerName: callerName,
        peerPhoto: callerPhoto || '',
        callType,
        status: 'connected'
      })

      startCallTimer()

      socket.emit('accept_call', {
        callId,
        callerUid,
        answer
      })
    } catch (err) {
      console.error('Call accept error', err)
      showToast('Failed establishing peer connection.')
      cleanupCall()
    }
  }

  function declineCall() {
    stopCallRingtone()
    if (!incomingCall) return
    socket.emit('decline_call', {
      callId: incomingCall.callId,
      callerUid: incomingCall.callerUid
    })
    setIncomingCall(null)
  }

  function hangUp() {
    stopCallRingtone()
    if (activeCall) {
      socket.emit('end_call', {
        callId: activeCall.callId,
        peerUid: activeCall.peerUid
      })
    }
    cleanupCall()
  }

  function toggleMic() {
    if (!localStream) return
    const audioTrack = localStream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setIsMicMuted(!audioTrack.enabled)
    }
  }

  function toggleCamera() {
    if (!localStream) return
    const videoTrack = localStream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setIsCameraOff(!videoTrack.enabled)
    }
  }

  /* =========================================================================
     VOICE NOTES
     ========================================================================= */

  async function startRecording() {
    if (!activeChatId) {
      showToast('Open a conversation first.')
      return
    }
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      showToast('Voice messages are not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordingStreamRef.current = stream
      audioChunksRef.current = []

      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg', '']
      const chosenMime = mimeTypes.find((t) => !t || MediaRecorder.isTypeSupported(t)) || ''

      const options = chosenMime ? { mimeType: chosenMime } : {}
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingSeconds(0)
      recordingSecondsRef.current = 0

      recordingTimerRef.current = setInterval(() => {
        const nextSeconds = Math.min(recordingSecondsRef.current + 1, 60)
        recordingSecondsRef.current = nextSeconds
        setRecordingSeconds(nextSeconds)
        if (nextSeconds >= 60) stopAndSendRecording()
      }, 1000)
    } catch (err) {
      console.error(err)
      showToast('Microphone access was denied or not available.')
    }
  }

  function cancelRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    cleanupRecording()
  }

  function cleanupRecording() {
    clearInterval(recordingTimerRef.current)
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((t) => t.stop())
      recordingStreamRef.current = null
    }
    setIsRecording(false)
    setRecordingSeconds(0)
    recordingSecondsRef.current = 0
    audioChunksRef.current = []
  }

  function stopAndSendRecording() {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return

    const duration = recordingSecondsRef.current
    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64Audio = reader.result.split(',')[1]
        const msg = {
          id: 'm_' + Math.random().toString(36).substring(2, 9),
          chatId: activeChatId,
          participants: activeChatId.split('_'),
          senderId: currentUser.uid,
          senderName: currentUser.displayName,
          content: '',
          type: 'audio',
          audioData: base64Audio,
          audioDuration: duration,
          timestamp: new Date().toISOString()
        }
        socket.emit('send_message', msg)
      }
      reader.readAsDataURL(audioBlob)
      cleanupRecording()
    }

    mediaRecorderRef.current.stop()
  }

  /* =========================================================================
     MESSAGING & CONTACT MANAGEMENT
     ========================================================================= */

  function handleSendMessage(e) {
    if (e) e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || !activeChatId || !currentUser) return

    const msg = {
      id: 'm_' + Math.random().toString(36).substring(2, 9),
      chatId: activeChatId,
      participants: activeChatId.split('_'),
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      content: trimmed,
      type: 'text',
      timestamp: new Date().toISOString()
    }

    socket.emit('send_message', msg)
    setText('')

    socket.emit('typing', {
      chatId: activeChatId,
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      isTyping: false
    })
  }

  function handleReplyToStatus({ status, replyMessage }) {
    if (!currentUser || !status) return
    const targetChatId = [currentUser.uid, status.authorUid].sort().join('_')

    const msg = {
      id: 'm_' + Math.random().toString(36).substring(2, 9),
      chatId: targetChatId,
      participants: [currentUser.uid, status.authorUid],
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      content: replyMessage,
      type: 'status_reply',
      resharedStatus: {
        id: status.id,
        authorName: status.authorName,
        type: status.type,
        content: status.content,
        caption: status.caption
      },
      timestamp: new Date().toISOString()
    }

    socket.emit('send_message', msg)
    navigate(`/messages/${targetChatId}`)
    showToast('Reply sent!')
  }

  function handleForwardStatusToChat({ chatId, status }) {
    if (!currentUser || !status || !chatId) return

    const msg = {
      id: 'm_' + Math.random().toString(36).substring(2, 9),
      chatId,
      participants: chatId.split('_'),
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      content: `Shared status from ${status.authorName}`,
      type: 'status_reshare',
      resharedStatus: {
        id: status.id,
        authorName: status.authorName,
        type: status.type,
        content: status.content,
        caption: status.caption
      },
      timestamp: new Date().toISOString()
    }

    socket.emit('send_message', msg)
    navigate(`/messages/${chatId}`)
    showToast('Status forwarded to chat!')
  }

  // Inline Quick Add Contact directly in Contacts tab
  async function handleQuickAddContact(e) {
    if (e) e.preventDefault()
    const email = newContactEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      setAddContactStatus('Enter a valid email address.')
      return
    }
    if (email === currentUser.email.toLowerCase()) {
      setAddContactStatus("That's your own email.")
      return
    }

    setIsAddingContact(true)
    setAddContactStatus('Adding…')

    try {
      const res = await fetch(`${API}/api/users/lookup?email=${encodeURIComponent(email)}`)
      const data = await res.json()

      if (!res.ok || !data.found) {
        setAddContactStatus(data.message || 'No registered Ping user found with that email.')
        return
      }

      const foundUser = data.user
      setAllUsers((prev) => {
        const exists = prev.some((u) => u.uid === foundUser.uid)
        return exists ? prev : [...prev, foundUser]
      })

      const newChatId = [currentUser.uid, foundUser.uid].sort().join('_')
      setNewContactEmail('')
      setAddContactStatus('Contact connected!')
      setTimeout(() => setAddContactStatus(''), 3000)
      navigate(`/messages/${newChatId}`)
    } catch (err) {
      console.error(err)
      setAddContactStatus('Failed connecting contact. Check connection.')
    } finally {
      setIsAddingContact(false)
    }
  }

  function handleTyping(val) {
    setText(val)
    if (!activeChatId || !currentUser) return

    socket.emit('typing', {
      chatId: activeChatId,
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      isTyping: true
    })

    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', {
        chatId: activeChatId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        isTyping: false
      })
    }, 2000)
  }

  // Filtered Chats
  const filteredChats = useMemo(() => {
    let result = chats.map((chat) => {
      const otherUid = chat.participants.find((p) => p !== currentUser.uid) || chat.participants[0]
      const peer = allUsers.find((u) => u.uid === otherUid) || {
        uid: otherUid,
        displayName: otherUid.replace('u_', ''),
        email: ''
      }
      return {
        ...chat,
        peer
      }
    })

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (c) =>
          c.peer.displayName.toLowerCase().includes(q) ||
          c.peer.email.toLowerCase().includes(q) ||
          (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
      )
    }

    if (filterType === 'unread') {
      result = result.filter((c) => unreadCounts[c.id] > 0)
    } else if (filterType === 'online') {
      result = result.filter((c) => onlineUserIds.has(c.peer.uid))
    }

    return result
  }, [chats, allUsers, currentUser, searchQuery, filterType, unreadCounts, onlineUserIds])

  // Registered Contacts List (Excluding current user)
  const directoryContacts = useMemo(() => {
    let list = allUsers.filter((u) => u.uid !== currentUser.uid)
    if (contactSearchQuery.trim()) {
      const q = contactSearchQuery.toLowerCase().trim()
      list = list.filter(
        (u) =>
          (u.displayName && u.displayName.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.status && u.status.toLowerCase().includes(q))
      )
    }
    return list.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''))
  }, [allUsers, currentUser, contactSearchQuery])

  // Status groupings
  const { myStatuses, contactStatuses } = useMemo(() => {
    const mine = allStatuses.filter((s) => s.authorUid === currentUser.uid)
    const contacts = allStatuses.filter((s) => s.authorUid !== currentUser.uid)
    return { myStatuses: mine, contactStatuses: contacts }
  }, [allStatuses, currentUser])

  function tickIcon(status) {
    if (status === 'read') {
      return (
        <svg viewBox="0 0 20 12" style={{ width: '15px', height: '11px', color: '#53BDEB', display: 'inline-block' }} fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M1 6.5L5 10l6-8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 6.5L12 10l7-9.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    }
    if (status === 'delivered') {
      return (
        <svg viewBox="0 0 20 12" style={{ width: '15px', height: '11px', color: 'var(--color-inkmuted)', display: 'inline-block' }} fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M1 6.5L5 10l6-8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 6.5L12 10l7-9.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    }
    return (
      <svg viewBox="0 0 14 12" style={{ width: '12px', height: '11px', color: 'var(--color-inkmuted)', display: 'inline-block' }} fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M1 6.5L5 10l7-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (!currentUser) return null

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', overflow: 'hidden', backgroundColor: 'var(--color-app-bg)' }}>
      <SeoHead
        title={peerUser ? `${peerUser.displayName} — Ping` : 'Ping — Direct Messenger'}
        description="Private direct messaging with instant contact access, 24h status stories, and high-definition P2P calling."
      />

      {/* ============= CALL MODAL ============= */}
      <CallModal
        activeCall={activeCall}
        incomingCall={incomingCall}
        localStream={localStream}
        remoteStream={remoteStream}
        callDuration={callDuration}
        p2pStats={p2pStats}
        isMicMuted={isMicMuted}
        isCameraOff={isCameraOff}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onHangUp={hangUp}
        onAcceptCall={acceptCall}
        onDeclineCall={declineCall}
      />

      {/* ============= CREATE STATUS MODAL ============= */}
      <CreateStatusModal
        isOpen={showCreateStatusModal}
        onClose={() => setShowCreateStatusModal(false)}
        currentUser={currentUser}
        onStatusPosted={(st) => setAllStatuses((prev) => [st, ...prev])}
      />

      {/* ============= STATUS VIEWER MODAL ============= */}
      {activeViewerStatusGroup && (
        <StatusViewerModal
          isOpen={!!activeViewerStatusGroup}
          onClose={() => setActiveViewerStatusGroup(null)}
          statuses={activeViewerStatusGroup}
          initialIndex={activeViewerInitialIndex}
          currentUser={currentUser}
          onReplyToStatus={handleReplyToStatus}
          onForwardToChat={handleForwardStatusToChat}
          onDeleteStatus={(id) => setAllStatuses((prev) => prev.filter((s) => s.id !== id))}
          allChats={filteredChats}
        />
      )}

      {/* ============= SETTINGS MODAL ============= */}
      {showSettingsModal && (
        <SettingsModal
          currentUser={currentUser}
          onClose={() => setShowSettingsModal(false)}
          onProfileUpdated={(updated) => {
            if (onProfileUpdate) onProfileUpdate(updated)
            showToast('Settings saved.')
          }}
        />
      )}

      {/* =========================================================================
         1. LEFT NAVIGATION RAIL (WhatsApp Web / Modern Desktop Messenger Dock)
         ========================================================================= */}
      <nav
        className="desktop-rail"
        style={{
          width: '68px',
          height: '100%',
          backgroundColor: 'var(--color-rail-bg)',
          borderRight: '1px solid var(--color-line)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 0',
          flexShrink: 0,
          zIndex: 20
        }}
      >
        {/* Ping Brand Icon */}
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          backgroundColor: '#0084FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '28px',
          boxShadow: '0 4px 12px rgba(0, 132, 255, 0.35)',
          cursor: 'pointer'
        }}
          onClick={() => navigate('/messages')}
          title="Ping Direct Messenger"
        >
          <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px', color: '#FFFFFF' }} fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Primary Navigation Icons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', width: '100%' }}>
          {/* Chats Tab */}
          <button
            type="button"
            onClick={() => setSidebarTab('chats')}
            style={{
              position: 'relative',
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: sidebarTab === 'chats' ? 'var(--color-active-item)' : 'transparent',
              color: sidebarTab === 'chats' ? '#0084FF' : 'var(--color-inkmuted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Chats"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={sidebarTab === 'chats' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                backgroundColor: '#0084FF',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '1px 5px',
                fontSize: '10px',
                fontWeight: 700
              }}>
                {Object.values(unreadCounts).reduce((a, b) => a + b, 0)}
              </span>
            )}
          </button>

          {/* Contacts Tab (DIRECT ACCESS TO CONTACTS!) */}
          <button
            type="button"
            onClick={() => setSidebarTab('contacts')}
            style={{
              position: 'relative',
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: sidebarTab === 'contacts' ? 'var(--color-active-item)' : 'transparent',
              color: sidebarTab === 'contacts' ? '#0084FF' : 'var(--color-inkmuted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Contacts Directory"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={sidebarTab === 'contacts' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span style={{
              position: 'absolute',
              bottom: '2px',
              fontSize: '9px',
              fontWeight: 700,
              opacity: 0.8
            }}>
              {directoryContacts.length}
            </span>
          </button>

          {/* Status Tab */}
          <button
            type="button"
            onClick={() => setSidebarTab('status')}
            style={{
              position: 'relative',
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: sidebarTab === 'status' ? 'var(--color-active-item)' : 'transparent',
              color: sidebarTab === 'status' ? '#0084FF' : 'var(--color-inkmuted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Status Stories"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" strokeDasharray="4 2" />
              <circle cx="12" cy="12" r="3" fill={sidebarTab === 'status' ? 'currentColor' : 'none'} />
            </svg>
            {contactStatuses.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#0084FF'
              }} />
            )}
          </button>

          {/* Calls Tab */}
          <button
            type="button"
            onClick={() => setSidebarTab('calls')}
            style={{
              position: 'relative',
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: sidebarTab === 'calls' ? 'var(--color-active-item)' : 'transparent',
              color: sidebarTab === 'calls' ? '#0084FF' : 'var(--color-inkmuted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Calls"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={sidebarTab === 'calls' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
        </div>

        {/* Bottom Utility Icons */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
          {/* 1-Click Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--color-inkmuted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title={theme === 'midnight' ? 'Switch to Light Mode' : 'Switch to Midnight Dark Mode'}
          >
            {theme === 'midnight' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--color-inkmuted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* User Profile Avatar */}
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowSettingsModal(true)}>
            <img
              src={currentUser.photoURL || getFallbackAvatar(currentUser.displayName)}
              alt=""
              style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0084FF' }}
            />
            <span style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              border: '2px solid var(--color-rail-bg)'
            }} />
          </div>

          {/* Sign Out */}
          <button
            type="button"
            onClick={onSignOut}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--color-inkmuted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Sign Out"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </nav>

      {/* =========================================================================
         2. SUB-SIDEBAR (Chats / Contacts / Status / Calls)
         ========================================================================= */}
      <aside
        className="sidebar-container"
        style={{
          width: '350px',
          height: '100%',
          display: (!activeChatId || window.innerWidth > 768) ? 'flex' : 'none',
          flexDirection: 'column',
          backgroundColor: 'var(--color-panel)',
          borderRight: '1px solid var(--color-line)',
          flexShrink: 0
        }}
      >
        {/* ================= TAB: CONTACTS (DIRECT ACCESS IN SIDEBAR!) ================= */}
        {sidebarTab === 'contacts' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Contacts Header */}
            <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--color-line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-ink)' }}>Contacts</h2>
                  <span style={{
                    backgroundColor: 'var(--color-active-item)',
                    color: '#0084FF',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {directoryContacts.length}
                  </span>
                </div>
              </div>

              {/* Instant "Add Contact by Gmail" Input */}
              <form onSubmit={handleQuickAddContact} style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-line)',
                    backgroundColor: 'var(--color-input-bg)',
                    color: 'var(--color-ink)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={isAddingContact || !newContactEmail.trim()}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#0084FF',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: (isAddingContact || !newContactEmail.trim()) ? 'default' : 'pointer',
                    opacity: (isAddingContact || !newContactEmail.trim()) ? 0.5 : 1,
                    boxShadow: '0 2px 6px rgba(0, 132, 255, 0.3)'
                  }}
                >
                  {isAddingContact ? '…' : '+ Add'}
                </button>
              </form>

              {addContactStatus && (
                <div style={{ fontSize: '12px', color: '#0084FF', fontWeight: 500, marginBottom: '8px' }}>
                  {addContactStatus}
                </div>
              )}

              {/* Search Contacts Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--color-input-bg)',
                borderRadius: '10px',
                padding: '6px 12px'
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-inkmuted)" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search contacts…"
                  value={contactSearchQuery}
                  onChange={(e) => setContactSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '13px',
                    color: 'var(--color-ink)'
                  }}
                />
              </div>
            </div>

            {/* Contacts Directory List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {directoryContacts.length > 0 ? (
                directoryContacts.map((contact) => {
                  const isOnline = onlineUserIds.has(contact.uid)
                  const targetChatId = [currentUser.uid, contact.uid].sort().join('_')

                  return (
                    <div
                      key={contact.uid}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--color-line)',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-panel-hover)')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Clickable Info Area */}
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, cursor: 'pointer' }}
                        onClick={() => navigate(`/messages/${targetChatId}`)}
                      >
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <img
                            src={contact.photoURL || getFallbackAvatar(contact.displayName)}
                            alt=""
                            style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          {isOnline && (
                            <span style={{
                              position: 'absolute',
                              bottom: 0,
                              right: 0,
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: '#10B981',
                              border: '2px solid var(--color-panel)'
                            }} />
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>
                            {contact.displayName}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-inkmuted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {contact.email}
                          </div>
                        </div>
                      </div>

                      {/* Instant Action Buttons: Chat, Voice, Video */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* Instant Voice Call */}
                        <button
                          type="button"
                          onClick={() => startCall('audio', contact)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: 'none',
                            backgroundColor: 'var(--color-input-bg)',
                            color: '#0084FF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          title="Call contact"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </button>

                        {/* Open Chat */}
                        <button
                          type="button"
                          onClick={() => navigate(`/messages/${targetChatId}`)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: 'none',
                            backgroundColor: '#0084FF',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0, 132, 255, 0.3)'
                          }}
                          title="Send direct message"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--color-inkmuted)' }}>
                  <p style={{ fontSize: '13px' }}>No contacts found.</p>
                  <p style={{ fontSize: '11px', marginTop: '4px' }}>
                    Add someone by entering their Gmail address above!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB: CHATS ================= */}
        {sidebarTab === 'chats' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--color-line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-ink)' }}>Chats</h2>
                <button
                  type="button"
                  onClick={() => setSidebarTab('contacts')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--color-input-bg)',
                    border: 'none',
                    color: '#0084FF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="View Contacts"
                >
                  <span>👥 Contacts</span>
                </button>
              </div>

              {/* Search Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--color-input-bg)',
                borderRadius: '10px',
                padding: '6px 12px',
                marginBottom: '8px'
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-inkmuted)" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search conversations…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '13px',
                    color: 'var(--color-ink)'
                  }}
                />
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {['all', 'unread', 'online'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilterType(f)}
                    style={{
                      padding: '3px 12px',
                      borderRadius: '16px',
                      border: 'none',
                      backgroundColor: filterType === f ? '#0084FF' : 'var(--color-input-bg)',
                      color: filterType === f ? '#FFFFFF' : 'var(--color-inkmuted)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredChats.length > 0 ? (
                filteredChats.map((chat) => {
                  const isSelected = chat.id === activeChatId
                  const isOnline = onlineUserIds.has(chat.peer.uid)
                  const unread = unreadCounts[chat.id] || 0

                  return (
                    <div
                      key={chat.id}
                      onClick={() => {
                        setUnreadCounts((prev) => ({ ...prev, [chat.id]: 0 }))
                        navigate(`/messages/${chat.id}`)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--color-line)',
                        backgroundColor: isSelected ? 'var(--color-active-item)' : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-panel-hover)'
                      }}
                      onMouseOut={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img
                          src={chat.peer.photoURL || getFallbackAvatar(chat.peer.displayName)}
                          alt=""
                          style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        {isOnline && (
                          <span style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '2px',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: '#10B981',
                            border: '2px solid var(--color-panel)'
                          }} />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>
                            {chat.peer.displayName}
                          </span>
                          <span style={{ fontSize: '11px', color: unread > 0 ? '#0084FF' : 'var(--color-inkmuted)', fontWeight: unread > 0 ? 600 : 400 }}>
                            {relativeTime(chat.lastUpdated)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{
                            fontSize: '13px',
                            color: 'var(--color-inkmuted)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            maxWidth: '210px'
                          }}>
                            {chat.lastMessageSenderId === currentUser.uid && tickIcon('delivered')}
                            <span>{chat.lastMessage || 'Start a conversation'}</span>
                          </p>

                          {unread > 0 && (
                            <span style={{
                              backgroundColor: '#0084FF',
                              color: '#FFFFFF',
                              borderRadius: '10px',
                              padding: '2px 7px',
                              fontSize: '11px',
                              fontWeight: 700
                            }}>
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--color-inkmuted)' }}>
                  <p style={{ fontSize: '13px', marginBottom: '12px' }}>No active conversations.</p>
                  <button
                    type="button"
                    onClick={() => setSidebarTab('contacts')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '16px',
                      backgroundColor: '#0084FF',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    View Contacts Directory →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB: STATUS ================= */}
        {sidebarTab === 'status' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--color-line)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: myStatuses.length > 0 ? 'pointer' : 'default'
                }}
                onClick={() => {
                  if (myStatuses.length > 0) {
                    setActiveViewerStatusGroup(myStatuses)
                    setActiveViewerInitialIndex(0)
                  }
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div className={myStatuses.length > 0 ? 'status-ring-unread' : ''}>
                    <img
                      src={currentUser.photoURL || getFallbackAvatar(currentUser.displayName)}
                      alt=""
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  </div>
                  {myStatuses.length === 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowCreateStatusModal(true)
                      }}
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#0084FF',
                        color: '#FFFFFF',
                        border: '2px solid var(--color-panel)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      +
                    </button>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>
                    My Status
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-inkmuted)' }}>
                    {myStatuses.length > 0
                      ? `${myStatuses.length} update${myStatuses.length > 1 ? 's' : ''} · Click to view`
                      : 'Tap to add status update'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowCreateStatusModal(true)
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '16px',
                    backgroundColor: '#0084FF',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  + Add
                </button>
              </div>
            </div>

            <div style={{ padding: '14px 16px 8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0084FF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                RECENT UPDATES ({contactStatuses.length})
              </span>
            </div>

            <div style={{ flex: 1 }}>
              {contactStatuses.length > 0 ? (
                contactStatuses.map((st) => {
                  const hasViewed = st.viewers && st.viewers.some((v) => v.uid === currentUser.uid)
                  return (
                    <div
                      key={st.id}
                      onClick={() => {
                        setActiveViewerStatusGroup([st])
                        setActiveViewerInitialIndex(0)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--color-line)',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-panel-hover)')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div className={hasViewed ? 'status-ring-read' : 'status-ring-unread'}>
                        <img
                          src={st.authorPhoto || getFallbackAvatar(st.authorName)}
                          alt=""
                          style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>
                          {st.authorName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-inkmuted)' }}>
                          {relativeTime(st.createdAt)}
                          {st.resharedFrom && ' · Reshared'}
                        </div>
                      </div>

                      <span style={{ fontSize: '18px' }}>
                        {st.type === 'image' ? '📷' : '✏️'}
                      </span>
                    </div>
                  )
                })
              ) : (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--color-inkmuted)' }}>
                  <p style={{ fontSize: '13px' }}>No status updates from your contacts yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB: CALLS ================= */}
        {sidebarTab === 'calls' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ padding: '14px 16px 8px', borderBottom: '1px solid var(--color-line)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0084FF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                RECENT CALLS
              </span>
            </div>

            <div style={{ flex: 1 }}>
              {callLogs.length > 0 ? (
                callLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--color-line)'
                    }}
                  >
                    <img
                      src={getFallbackAvatar(log.peerName)}
                      alt=""
                      style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>
                        {log.peerName}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-inkmuted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{log.callType === 'video' ? '📹 Video' : '📞 Voice'}</span>
                        <span>·</span>
                        <span>{relativeTime(log.timestamp)}</span>
                        {log.duration > 0 && <span>({formatDuration(log.duration)})</span>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--color-inkmuted)' }}>
                  <p style={{ fontSize: '13px' }}>No recent call history.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation Bar (Screens <= 768px) */}
        <div
          className="mobile-bottom-bar"
          style={{
            display: 'none',
            borderTop: '1px solid var(--color-line)',
            backgroundColor: 'var(--color-panel)',
            padding: '8px 12px',
            justifyContent: 'space-around',
            alignItems: 'center'
          }}
        >
          <button
            type="button"
            onClick={() => setSidebarTab('chats')}
            style={{ background: 'none', border: 'none', color: sidebarTab === 'chats' ? '#0084FF' : 'var(--color-inkmuted)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            💬 Chats
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab('contacts')}
            style={{ background: 'none', border: 'none', color: sidebarTab === 'contacts' ? '#0084FF' : 'var(--color-inkmuted)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            👥 Contacts
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab('status')}
            style={{ background: 'none', border: 'none', color: sidebarTab === 'status' ? '#0084FF' : 'var(--color-inkmuted)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            ⭕ Status
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab('calls')}
            style={{ background: 'none', border: 'none', color: sidebarTab === 'calls' ? '#0084FF' : 'var(--color-inkmuted)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            📞 Calls
          </button>
        </div>
      </aside>

      {/* =========================================================================
         3. MAIN CONVERSATION VIEW (Direct Messenger Aesthetic)
         ========================================================================= */}
      <main
        className="chat-container"
        style={{
          flex: 1,
          display: (activeChatId || window.innerWidth > 768) ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        {activeChatId && peerUser ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Chat Header */}
            <header style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 18px',
              backgroundColor: 'var(--color-panel-header)',
              borderBottom: '1px solid var(--color-line)',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Mobile Back button */}
                <button
                  type="button"
                  onClick={() => navigate('/messages')}
                  style={{
                    display: window.innerWidth <= 768 ? 'block' : 'none',
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    color: '#0084FF',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  title="Back to list"
                >
                  ←
                </button>

                <div style={{ position: 'relative' }}>
                  <img
                    src={peerUser.photoURL || getFallbackAvatar(peerUser.displayName)}
                    alt=""
                    style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  {onlineUserIds.has(peerUser.uid) && (
                    <span style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      border: '2px solid var(--color-panel)'
                    }} />
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-ink)' }}>
                    {peerUser.displayName}
                  </div>
                  <div style={{ fontSize: '12px', color: typingPeer ? '#0084FF' : onlineUserIds.has(peerUser.uid) ? '#10B981' : 'var(--color-inkmuted)' }}>
                    {typingPeer ? `${typingPeer} is typing…` : onlineUserIds.has(peerUser.uid) ? 'Online' : peerUser.email}
                  </div>
                </div>
              </div>

              {/* Call Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Voice Call */}
                <button
                  type="button"
                  onClick={() => startCall('audio')}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    border: '1px solid var(--color-line)',
                    backgroundColor: 'var(--color-panel)',
                    color: '#0084FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  title="Start Voice Call"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </button>

                {/* Video Call */}
                <button
                  type="button"
                  onClick={() => startCall('video')}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    border: '1px solid var(--color-line)',
                    backgroundColor: 'var(--color-panel)',
                    color: '#0084FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  title="Start Video Call"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.55-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.45.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </header>

            {/* Messages Area */}
            <div className="wa-chat-bg" style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.map((msg) => {
                  const isMine = msg.senderId === currentUser.uid

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: isMine ? 'flex-end' : 'flex-start',
                        marginBottom: '4px'
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '72%',
                          borderRadius: '12px',
                          borderTopRightRadius: isMine ? '2px' : '12px',
                          borderTopLeftRadius: !isMine ? '2px' : '12px',
                          padding: '8px 12px',
                          backgroundColor: isMine ? 'var(--bubble-out-bg)' : 'var(--bubble-in-bg)',
                          color: isMine ? 'var(--bubble-out-text)' : 'var(--bubble-in-text)',
                          boxShadow: 'var(--shadow-bubble)',
                          position: 'relative'
                        }}
                      >
                        {/* Reshared Status Card Preview */}
                        {msg.resharedStatus && (
                          <div style={{
                            backgroundColor: isMine ? 'rgba(0,0,0,0.15)' : 'var(--color-input-bg)',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            marginBottom: '6px',
                            borderLeft: '4px solid #0084FF',
                            fontSize: '12px'
                          }}>
                            <div style={{ fontWeight: 700, color: isMine ? '#FFFFFF' : '#0084FF', marginBottom: '2px' }}>
                              Status from {msg.resharedStatus.authorName}
                            </div>
                            <div style={{ opacity: 0.9 }}>
                              {msg.resharedStatus.type === 'image' ? '📷 Photo Status' : msg.resharedStatus.content}
                            </div>
                          </div>
                        )}

                        {/* Audio Voice Note */}
                        {msg.type === 'audio' ? (
                          <VoiceNotePlayer
                            audioData={msg.audioData}
                            duration={msg.audioDuration}
                            isMine={isMine}
                          />
                        ) : msg.deleted ? (
                          <p style={{ fontStyle: 'italic', fontSize: '13px', opacity: 0.7 }}>
                            This message was deleted
                          </p>
                        ) : (
                          <p style={{ fontSize: '14px', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                            {msg.content}
                          </p>
                        )}

                        {/* Timestamp & Ticks */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '4px',
                          marginTop: '4px',
                          fontSize: '11px',
                          color: isMine ? 'var(--bubble-out-meta)' : 'var(--bubble-in-meta)'
                        }}>
                          {msg.edited && !msg.deleted && <span style={{ fontStyle: 'italic' }}>edited</span>}
                          <span>{formatClock(msg.timestamp)}</span>
                          {isMine && !msg.deleted && tickIcon(msg.status)}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Chat Composer */}
            <footer style={{
              padding: '10px 16px',
              backgroundColor: 'var(--color-panel-header)',
              borderTop: '1px solid var(--color-line)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              {isRecording ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-panel)', padding: '8px 16px', borderRadius: '24px', border: '1px solid var(--color-line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444', animation: 'pulse-ring 1s infinite' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}>
                      {formatDuration(recordingSeconds)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={cancelRecording}
                      style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={stopAndSendRecording}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '16px',
                        backgroundColor: '#0084FF',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Send Voice Note
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Type a message…"
                    value={text}
                    onChange={(e) => handleTyping(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '11px 16px',
                      borderRadius: '24px',
                      border: '1px solid var(--color-line)',
                      backgroundColor: 'var(--color-input-bg)',
                      color: 'var(--color-ink)',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />

                  {text.trim() ? (
                    <button
                      type="submit"
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: '#0084FF',
                        color: '#FFFFFF',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0, 132, 255, 0.3)'
                      }}
                      title="Send message"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: '#0084FF',
                        color: '#FFFFFF',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0, 132, 255, 0.3)'
                      }}
                      title="Record voice note"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                  )}
                </form>
              )}
            </footer>
          </div>
        ) : (
          /* Empty Chat Area (Postbox / Ping Direct Messenger Philosophy) */
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '36px',
            textAlign: 'center',
            backgroundColor: 'var(--color-app-bg)'
          }}>
            <div style={{
              width: '84px',
              height: '84px',
              borderRadius: '24px',
              backgroundColor: '#0084FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              boxShadow: '0 8px 30px rgba(0, 132, 255, 0.35)'
            }}>
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              Ping Direct Messenger
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--color-inkmuted)', maxWidth: '440px', lineHeight: 1.6, marginBottom: '24px' }}>
              Private, real-time correspondence. Select a contact on the left to start chatting, or share a 24-hour status story.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setSidebarTab('contacts')}
                style={{
                  padding: '10px 22px',
                  borderRadius: '20px',
                  backgroundColor: '#0084FF',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 132, 255, 0.3)'
                }}
              >
                Browse Contacts ({directoryContacts.length})
              </button>
              <button
                type="button"
                onClick={() => setShowCreateStatusModal(true)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '20px',
                  backgroundColor: 'var(--color-panel)',
                  border: '1px solid var(--color-line)',
                  color: 'var(--color-ink)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                + Post Status Story
              </button>
            </div>
            <div style={{ marginTop: '48px', fontSize: '12px', color: 'var(--color-inkmuted)', display: 'flex', gap: '16px' }}>
              <span>🔒 End-to-end P2P</span>
              <span>·</span>
              <span>⚡ Direct & Lightweight</span>
              <span>·</span>
              <span>📱 Multi-Device Ready</span>
            </div>
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="animate-slide-up"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#111B21',
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            zIndex: 1000
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  )
}

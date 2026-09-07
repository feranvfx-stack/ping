import { io } from 'socket.io-client'

// Always talk to port 3000 on the same machine that served this page.
// This works from localhost AND from other devices on the LAN (e.g. 192.168.1.156).
const SERVER_URL = `http://${window.location.hostname}:3000`

export const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
})

let currentUserData = null

// Always re-register on connect or reconnect
socket.on('connect', () => {
  if (currentUserData) {
    socket.emit('register_user', currentUserData)
  }
})

export function connectSocket(userData) {
  if (userData) {
    currentUserData = userData
  }
  if (!socket.connected) {
    socket.connect()
  } else if (userData) {
    socket.emit('register_user', userData)
  }
}

export function disconnectSocket() {
  currentUserData = null
  if (socket.connected) {
    socket.disconnect()
  }
}

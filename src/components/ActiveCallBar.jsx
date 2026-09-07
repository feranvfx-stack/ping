import { useEffect, useRef } from 'react'

export default function ActiveCallBar({ peer, duration, callType, localStream, remoteStream, micMuted, cameraOff, onToggleMic, onToggleCamera, onHangUp }) {
    const localVideo = useRef(null)
    const remoteVideo = useRef(null)
    useEffect(() => { if (localVideo.current) localVideo.current.srcObject = localStream || null }, [localStream])
    useEffect(() => { if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream || null }, [remoteStream])
    return <div className={`active-call ${callType === 'video' ? 'video-call' : ''}`}>
        {callType === 'video' && <div className="call-videos"><video ref={remoteVideo} autoPlay playsInline className="remote-video" /><video ref={localVideo} autoPlay muted playsInline className="local-video" /></div>}
        <div className="active-call-info"><span className="call-live" /><strong>{peer?.display_name || 'Call'}</strong><span>{callType === 'video' ? 'Video' : 'Voice'} · {String(Math.floor(duration / 60)).padStart(2, '0')}:{String(duration % 60).padStart(2, '0')}</span></div>
        <div className="call-controls"><button onClick={onToggleMic}>{micMuted ? 'Unmute' : 'Mute'}</button>{callType === 'video' && <button onClick={onToggleCamera}>{cameraOff ? 'Camera on' : 'Camera off'}</button>}<button className="hangup-button" onClick={onHangUp}>Hang up</button></div>
    </div>
}
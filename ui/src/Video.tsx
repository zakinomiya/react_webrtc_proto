import React, { useState, useEffect } from 'react'
const host = process.env.REACT_APP_WS_ENDPOINT
const websocket = new WebSocket(""+host)

type OfferOptions = {
  offerToReceiveAudio: boolean
  offerToReceiveVideo: boolean
}

const initialOfferOptions: OfferOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
}

const initialConstraints: MediaStreamConstraints = {
  video: true,
  audio: false
}

const Video = () => {
  const [constraints, setConstraints] = useState<MediaStreamConstraints>(initialConstraints)
  const [peerConnection, setPeerConnection ] = useState<RTCPeerConnection>()

  useEffect(() => {
    if(!peerConnection) {
      const pc = new RTCPeerConnection({iceServers: [
        {"urls": "stun:stun.l.google.com:19302"},
        {"urls": "stun:stun1.l.google.com:19302"},
        {"urls": "stun:stun2.l.google.com:19302"}
      ]})
      pc.onicecandidate = (e) => {
        console.log('icecandidate event involked')
        console.log(e)
        if (e.candidate) {
          websocket.send(JSON.stringify({'iceCandidate': e.candidate}));
        }
      }
      pc.addEventListener('connectionstatechange', e => {
        console.log(e)
        pc.addEventListener('connectionstatechange', event => {
          if (pc.connectionState === 'connected') {
            console.log("connected")
          }
        })
      })
  
      pc.addEventListener('track', e => {
        console.log(e)
        const localVideoElement = document.getElementById('jibun-video') as HTMLVideoElement
        if(localVideoElement.srcObject !== e.streams[0]) {
          const video = document.getElementById('aite-video') as HTMLVideoElement
          video.srcObject = e.streams[0]
        }
      })

      setPeerConnection(pc)
    }
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(stream => {
        const videoTracks = stream.getVideoTracks()
        console.log('Got stream with constraints:', constraints)
        console.log(`Using video device: ${videoTracks[0].label}`)
        const localVideoStream = document.getElementById('jibun-video') as HTMLVideoElement
        localVideoStream && (localVideoStream.srcObject = stream) && 
        stream.getTracks().forEach(track => peerConnection?.addTrack(track, stream))
      })
      .catch(err => {
        if (err.name === 'ConstraintNotSatisfiedError') {
          alert(`The resolution is not supported by your device.`)
        } else if (err.name === 'PermissionDeniedError') {
          alert('permission denied. please check your device setting')
        }
        alert(`getUserMedia err: ${err.name}`)
      })
    }, [constraints, peerConnection])
    
  websocket.onmessage = async (e: MessageEvent) => {
    if(!peerConnection) return
    const message = e.data ? JSON.parse(e.data) : {}
    console.log(message)
    if (message.answer) {
      console.log("answer received")
      const remoteDesc = new RTCSessionDescription(message.answer)
      await peerConnection.setRemoteDescription(remoteDesc)
        .catch(e => console.log(e))
    } else if (message.offer) {
        console.log("offer received")
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)
          .catch(e => console.log(e))
        websocket.send(JSON.stringify({'answer': answer}))
    } else if (message.iceCandidate) {
      console.log("message includes iceCandidate property")
      await peerConnection.addIceCandidate(message.iceCandidate)
        .catch(e => console.log(e))
    }
  }

  const handleCall = async () => {
    if(!peerConnection) return 
    const offer = await peerConnection.createOffer(initialOfferOptions)
    await peerConnection.setLocalDescription(offer)
    websocket.send(JSON.stringify({'offer': offer}))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConstraints({
      ...constraints,
      [e.target.name]: !constraints[
        e.target.name as keyof MediaStreamConstraints
      ]
    })
  }

  return (
    <div>
      <input
        type="checkbox"
        name="audio"
        checked={!!constraints.audio}
        onChange={handleChange}
      />
      <button onClick={handleCall}>call</button>
      <div style={{ width: 1000, height: 700 }}>
        <p>jibun</p>
        <video id="jibun-video" autoPlay playsInline/>
      </div>
      <div style={{ width: 1000, height: 700 }}>
        <p>aite</p>
        <video id="aite-video" autoPlay playsInline/>
      </div>
    </div>
  )
}

export default Video

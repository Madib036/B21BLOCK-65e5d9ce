// Get a session token for OpenAI Realtime API
const tokenResponse = await fetch("/token");
const data = await tokenResponse.json();
const EPHEMERAL_KEY = data.value;

// Create a peer connection
const pc = new RTCPeerConnection();

// Set up to play remote audio from the model
audioElement.current = document.createElement("audio");
audioElement.current.autoplay = true;
pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

// Add local audio track for microphone input in the browser
const ms = await navigator.mediaDevices.getUserMedia({
  audio: true,
});
pc.addTrack(ms.getTracks()[0]);

// Set up data channel for sending and receiving events
const dc = pc.createDataChannel("oai-events");

// Start the session using the Session Description Protocol (SDP)
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
  method: "POST",
  body: offer.sdp,
  headers: {
    Authorization: `Bearer ${EPHEMERAL_KEY}`,
    "Content-Type": "application/sdp",
  },
});

const answer = {
  type: "answer",
  sdp: await sdpResponse.text(),
};
await pc.setRemoteDescription(answer);
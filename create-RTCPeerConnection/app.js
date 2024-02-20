"use strict"

const mediaStreamConstraints = {
    video: true,
}

const offerOptions = {
    offerToReceiveVideo: 1,
}

let startTime = null;

let localStream;
let remoteStream;

let localPeerConnection;
let remotePeerConnection;

let localVideo = document.getElementById("local-video");
let remoteVideo = document.getElementById("remote-video");


function gotLocalMediaStream(mediaStream){
    localStream = mediaStream;
    localVideo.srcObject = mediaStream;
    trace("Received local stream");
    callButton.disabled = false;    // enable call button
}

function handleLocalMediaStreamError(error){
    trace("navigator.mediaDevices.getUserMedia() error: ", error.toString());
}

function gotRemoteMediaStream(event){
    const mediaStream = event.stream;
    remoteVideo.srcObject = mediaStream;
    remoteStream = mediaStream;
    trace("Remote peer connection received media stream");
}

function handleRemoteMediaStreamError(error){
    trace("navigator.mediaDevices.getUserMedia() error: ", error.toString());
}

function logVideoLoaded(event){
    const video = event.target;
    trace(`${video.id} videoWidth ${video.videoWidth}px videoHeight ${video.videoHeight}px.`)
}

function logResizedVideo(event){
    logVideoLoaded(event);

    if(startTime){
        const elapsedTime = window.performance.now() - startTime;
        startTime = null;
        trace(`Setup time ${elapsedTime.toString()}ms.`);
    }
}

localVideo.addEventListener('loadedmetadata', logVideoLoaded);
remoteVideo.addEventListener("loadedmetadata", logVideoLoaded);
remoteVideo.addEventListener("onresize", logResizedVideo);

// Define RTC peer connection behaviour

function handleConnection(event){
    const peerConnection = event.target;
    const iceCandidate = event.candidate;

    if(iceCandidate){
        const newIceCandidate = new RTCIceCandidate(iceCandidate);
        const otherPeer = getOtherPeer(peerConnection);

        otherPeer.addIceCandidate(newIceCandidate)
            .then(() => handleConnectionSuccess(peerConnection))
            .catch((error) => handleConnectionFailure(peerConnection, error));
        
        trace(`${getPeerName(peerConnection)} ICE candidate:\n` +
        `${event.candidate.candidate}.`);
    }
}

function handleConnectionSuccess(peerConnection){
    trace(`${getPeerName(peerConnection)} add IceCandidate success.`)
}

function handleConnectionFailure(){
    trace(`${getPeerName(peerConnection)} failed to add IceCandidate, 
    ${error.toString()} `);
}

// Logs changes to the connection state.
function handleConnectionChange(event) {
    const peerConnection = event.target;
    console.log('ICE state change event: ', event);
    trace(`${getPeerName(peerConnection)} ICE state: ` +
          `${peerConnection.iceConnectionState}.`);
  }

// Logs error when setting session description fails.
function setSessionDescriptionFailure(error){
    trace(`failed to create session description: `, error.toString());
}

function setLocalDescriptionSuccess(localPeerConnection){
    trace(`${(localPeerConnection)} localPeerConnection established`)
}

function setRemoteDescriptionSuccess(remotePeerConnection){
    trace(`${remotePeerConnection} remotePeerConnection established`)
}


// Logs offer creation and sets peer connection session descriptions.
function createdOffer(description){
    trace(`Offer from localPeerConnection:\n${description.sdp}`);

    trace('localPeerConnection setLocalDescription start.');
    localPeerConnection.setLocalDescription(description)
        .then(() => setLocalDescriptionSuccess(localPeerConnection))
        .catch(() => setSessionDescriptionFailure);
    
    trace('remotePeerConnection setRemoteDescription start.');
    remotePeerConnection.setRemoteDescription(description)
        .then(() => setRemoteDescriptionSuccess(remotePeerConnection))
        .catch(() => setSessionDescriptionFailure);
    
    trace('remotePeerConnection createAnswer start.');
    remotePeerConnection.createAnswer()
        .then(createdAnswer)
        .catch(() => setSessionDescriptionFailure);
}

// Logs answer to offer creation and sets peer connection session descriptions.
function createdAnswer(description){
    trace(`Answer from remotePeerConnection:\n${description.sdp}`);

    trace('remotePeerConnection setLocalDescription start.');
    remotePeerConnection.setLocalDescription(description)
        .then(() => setLocalDescriptionSuccess(remotePeerConnection))
        .catch(() => setSessionDescriptionFailure);
    
    trace('localPeerConnection setRemoteDescription start.');
    localPeerConnection.setRemoteDescription(description)
        .then(() => setRemoteDescriptionSuccess(localPeerConnection))
        .catch(() => setSessionDescriptionFailure);

}


// Define action buttons.
const startButton = document.getElementById('startbutton');
const callButton = document.getElementById('callbutton');
const hangupButton = document.getElementById('hangupbutton');

// Set up initial action buttons status: disable call and hangup.
callButton.disabled = true;
hangupButton.disabled = true;

// creates local MediaStream.
function startAction() {
    startButton.disabled = true;
    navigator.mediaDevices
        .getUserMedia(mediaStreamConstraints)
        .then(gotLocalMediaStream)
        .catch(handleLocalMediaStreamError);
    trace("requesting media stream.");
}

// creates peer connections.
function callAction() {
    callButton.disabled = true;
    hangupButton.disabled = false;

    trace('Starting call.');
    startTime = window.performance.now();

    // get local media stream tracks
    const videoTracks = localStream.getVideoTracks();
    const audioTracks = localStream.getAudioTracks();
    if(videoTracks.length > 0){
        trace(`using video device: ${videoTracks[0].label}`)
    }
    if(audioTracks.length > 0){
        trace(`using audio device: ${audioTracks[0].label}`)
    }

    const servers = null;  // Allows for RTC server configuration.

    // Create peer connections and add behavior.
    localPeerConnection = new RTCPeerConnection(servers);
    trace('Created local peer connection object localPeerConnection.');

    localPeerConnection.addEventListener("icecandidate", handleConnection);
    localPeerConnection.addEventListener("oniceconnectionstatechange", handleConnectionChange);

    remotePeerConnection = new RTCPeerConnection(servers);
    trace('Created remote peer connection object remotePeerConnection.');

    remotePeerConnection.addEventListener("icecandidate", handleConnection);
    remotePeerConnection.addEventListener("iceconnectionstatechange", handleConnectionChange);

    remotePeerConnection.addEventListener("addStream", gotRemoteMediaStream);

     // Add local stream to connection and create offer to connect.
     localPeerConnection.addStream(localStream);
     localPeerConnection.createOffer(offerOptions)
        .then(createdOffer)
        .catch(setSessionDescriptionFailure);

}

// ends up call, closes connections and resets peers.
function hangupAction(){
    localPeerConnection.close();
    remotePeerConnection.close();
    localPeerConnection = null;
    remotePeerConnection = null;
    hangupButton.disabled = true;
    callButton.disabled = false;
    trace("Ending call");
}

// Add click event handlers for buttons.
startButton.addEventListener('click', startAction);
callButton.addEventListener('click', callAction);
hangupButton.addEventListener('click', hangupAction);


// Define helper functions

function getOtherPeer(peerConnection){
    return (peerConnection === localPeerConnection 
            ? remotePeerConnection : localPeerConnection);
}

function getPeerName(peerConnection){
    return (peerConnection === localPeerConnection 
            ? "localPeerConnection" : "remotePeerConnection")
}


function trace(text){
    text = text.trim();
    const now = (window.performance.now() / 1000).toFixed(3);
    console.log(text, now);
}
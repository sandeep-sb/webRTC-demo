"use strict"

const videoConstraints = {
    video: true
}

let localStream;

const localVideo = document.querySelector("video");

const gotLocalMediaStream = (stream) => {
    localStream = stream;
    localVideo.srcObject = stream;
}

const handleLocalMediaStreamError = (error) => {
    console.log("error in getUserMedia", error);
}

navigator.mediaDevices.getUserMedia(videoConstraints)
    .then(gotLocalMediaStream)
    .catch(handleLocalMediaStreamError);

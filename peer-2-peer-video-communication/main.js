let localStream;
let remoteStream;

let localVideoElement = document.querySelector("#user-1");
let remoteVideoElement = document.querySelector("#user-2");

let peerConnection;

const offerTextArea = document.getElementById("offer-sdp");
const answerTextArea = document.getElementById("answer-sdp");


const servers = {
    iceServers: [
        {
            urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"]
        }
    ]
}

let init = async () => {
    localStream = await navigator
                            .mediaDevices
                            .getUserMedia({video: true, audio: false});

    localVideoElement.srcObject = localStream;
}

let createOffer = async () => {
    peerConnection = new RTCPeerConnection(servers);

    remoteStream = new MediaStream();
    remoteVideoElement.srcObject = remoteStream;

    // add local Media Stream track to the peerConnection
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // listen to when your peer adds the media Stream to the peerConnection
    peerConnection.ontrack = async (event) => {
        console.log(event);
        event.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track);
        });
    }

    // we listen to icecandidate and each time iceCandidate is generated, 
    // we update our offer/local SDP
    peerConnection.onicecandidate = async (event) => {
        console.log(event);
        let iceCandidate = event.candidate;
        if(iceCandidate){
            offerTextArea.value = JSON.stringify(peerConnection.localDescription);
        }
    }

    // offer is actually SDP from  the local Peer
    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    offerTextArea.value = JSON.stringify(offer);
}

let createAnswer = async () => {
    peerConnection = new RTCPeerConnection(servers);

    remoteStream = new MediaStream();
    remoteVideoElement.srcObject = remoteStream;

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    })

    // listen to remote tracks being added to peerConnection
    peerConnection.ontrack = async (event) => {
        event.streams[0].getTracks().forEach(track => {
            peerConnection.addTrack(track);
        });
    }

    // update answer on icecandidate update
    peerConnection.onicecandidate = async (event) => {
        if(event.candidate){
            offerTextArea.value = JSON.stringify(peerConnection.localDescription);
        }
    }

    let offer = offerTextArea.value;
    if(!offer) return alert("Retrieve offer from peer first....");
    
    // here this offer is SDP from local peer, which acts as remote description 
    // for remote peer because it comes from local peer
    offer = JSON.parse(offer);
    await peerConnection.setRemoteDescription(offer)

    // now we will create local SDP for remotePeer, 
    // which will be sent as answer to local Peer
    let answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    answerTextArea.value = JSON.stringify(answer);
}

let addAnswer = async () => {
    let answer = answerTextArea.value;
    if(!answer) return alert("Please retrieve answer from peer first...");

    answer = JSON.parse(answer);

    if(!peerConnection.currentRemoteDescription){
        await peerConnection.setRemoteDescription(answer);
    }
}

init();


document.getElementById("create-offer-btn").addEventListener("click", createOffer);
document.getElementById("create-answer-btn").addEventListener("click", createAnswer);
document.getElementById("add-answer-btn").addEventListener("click", addAnswer);


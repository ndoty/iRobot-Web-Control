var webrtc = new SimpleWebRTC({
    // the id/element dom element that will hold "our" video
    localVideoEl: 'localVideo',
    // the id/element dom element that will hold remote video
    remoteVideosEl: 'remoteVideo',
    // immediately ask for camera access
    autoRequestMedia: true
});

// we have to wait until it's ready
webrtc.on('readyToCall', function () {
  // you can name it anything
  webrtc.joinRoom('QL ETA Telepresence Robot Stream');
});

$('#remoteVideo').bind("DOMSubtreeModified",function(){
  $.animateVideo();
});
$.animateVideo = function () {
    $('#remoteVideo').css('z-index', '0');
    $('#localVideo').css('z-index', '1');
    $('#localVideo').animate({top: '80%', left: '80%', height: '20%', width: '20%'},1500);
};
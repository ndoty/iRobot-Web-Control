$.animateVideo = function () {
    $('video#remoteVideo').css('z-index', '0');
    $('video#localVideo').css('z-index', '1');
    $('video#localVideo').animate({top: '80%', left: '80%', height: '20%', width: '20%'},1500);
};
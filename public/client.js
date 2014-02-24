$(document).ready(function () {
    var socket, keys = [], keymap, existsInArray, clearMessages, messageCounter = 0, speed;

    socket = io.connect();

    socket.on('BotReady', function () {
        $('body').show();
    });

    socket.on('BotMessages', function (data) {
        clearInterval(clearMessages);
        $('.previousCommands .content').prepend('<p>' + $('.currentCommand .content').html() + '</p>');
        $('.currentCommand .content').empty().append('<p>' + data + '</p>');
        clearMessages = setInterval(function (){
            var lastMessage = $('.previousCommands .content p:last-child').html();
            $('.previousCommands .content').empty();
            $('.previousCommands .content').append('Previous commands cleared due to inactivity.');
            $('.previousCommands .content').append('<p>Last message: ' + lastMessage + '</p>');
        },15000);
    });

    socket.on('BotBump', function (data) {
        clearInterval(clearMessages);
        $('.bump').empty().append('<p>' + data + '</p>');
        clearMessages = setInterval(function (){
            $('.bump').empty();
        },10000);
    });

    keymap = {
        87: {
            action: 'drive',
            direction: 'forward'
        },
        38: {
            action: 'drive',
            direction: 'forward'
        },
        83: {
            action: 'drive',
            direction: 'back'
        },
        40: {
            action: 'drive',
            direction: 'back'
        },
        65: {
            action: 'rotate',
            direction: 'left'
        },
        37: {
            action: 'rotate',
            direction: 'left'
        },
        68: {
            action: 'rotate',
            direction: 'right'
        },
        39: {
            action: 'rotate',
            direction: 'right'
        },
        32: {
            action: 'dock',
            direction: 'dock'
        }
    };

    var findInArray = function (array, value, action) {
        existsInArray = false;
        $.each(array, function(index) {
            if(array[index] === value && action === 'remove') {
                //Remove from array
                array.splice(index, 1);
            }
            if(array[index] === value && action === 'find') {
                existsInArray = true;
            }
        });
    };

    var sendBotCommand = function (ev, keyCode) {
        speed = $('select[name="speed"]').val();
        if (keyCode) {
            if (keymap[keyCode] === null) {
                return;
            }
            evData = keymap[keyCode];
            socket.emit('BotCommand', {
                action: evData.action,
                direction: evData.direction,
                speed: speed
            });
        } else {
            var evData;
            if (keymap[ev.keyCode] === null) {
                return;
            }
            evData = keymap[ev.keyCode];
            socket.emit('BotCommand', {
                action: evData.action,
                direction: evData.direction,
                speed: speed
            });
        }
    };

    var stopBotCommand = function () {
        console.log("send command stop");
        socket.emit('BotCommand', {
            action: 'stop'
        });
    };

    $(document).keydown(function (ev) {
        findInArray(keys, ev.keyCode, 'find');
        if (!existsInArray) {
            keys.push(ev.keyCode);
            sendBotCommand(ev);
        }
    });

    $(document).keyup(function (ev) {
        findInArray(keys, ev.keyCode, 'remove');
        if (keys.length === 0) {
            stopBotCommand();
        } else {
            sendBotCommand(null, keys[keys.length - 1]);
        }
        existsInArray = false;
    });

    $(document).toolTip();

    $('*[data-action]').on('mousedown', function (ev) {
        speed = $('select[name="speed"]').val();
        return socket.emit('BotCommand', {
            action: $(this).data('action'),
            direction: $(this).data('direction') ? $(this).data('direction') : null,
            speed: speed
        });
    });

    $('*[data-action]').on('mouseup', function (ev) {
        if ($(this).data('action') !== 'dock') {
            return socket.emit('BotCommand', {
                action: 'stop'
            });
        }
    });
});
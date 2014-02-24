(function() {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

    var BotConnection           = require('create-oi'),
        BotSerial               = 'COM4',
        express                 = require('express'),
        csrgen                  = require('csr-gen'),
        //fs                      = require('fs'),
        stylus                  = require('stylus'),
        nib                     = require('nib'),
        http                    = require('http'),
        //https                   = require('http'),
        path                    = require('path'),
        os                      = require('os'),
        childProcess            = require('child_process'),
        open                    = require('open'),
        ifaces                  = os.networkInterfaces(),
        io,
        app,
        server,
        networkCard             = 'Wireless Network Connection',
        IP,
        BotLocal                = false,
        userConnected           = false,
        BOT_NAME                = 'ETA',
        connectedSocket,
        timer                   = 5,
        botReady,
        botReadyFlag            = false;

    botReady = function (Bot) {
        if (!botReadyFlag) {
            botReadyFlag = true;

            for (var dev in ifaces) {
                var alias = 0;
                ifaces[dev].forEach(function (details) {
                    if (details.family=='IPv4') {
                        //uncomment console.log to see network cards for variable above
                        //console.log(dev+(alias?':'+alias:''),details.address);
                        if (details.address !== '127.0.0.1' || details.address !== undefined && networkCard.indexOf(dev+(alias?':'+alias:''+'')) > -1) {
                            IP = details.address;
                        }

                        ++alias;
                    }
                });
            }

            /*csrgen(IP, {
                outputDir: '/',
                read: true,
                company: 'Quicken Loans',
                email: 'nickfaust-doty@quickenloans.com'
            }, function(err, keys){
                console.log('CSR created!')
                console.log('key: '+keys.private);
                console.log('csr: '+keys.csr);
            });*/

            app = express();

            var compile = function (str, path) {
                return stylus(str).set('filename', path).use(nib());
            };

            app.set('port', process.env.PORT || 3001);
            app.use(app.router);
            app.use(express.static(path.join(__dirname, 'public')));
            app.set('views', __dirname + '/views');
            app.set('view engine', 'jade');
            //app.set('key', fs.readFileSync('/privatekey.pem').toString());
            //app.set('cert', fs.readFileSync('/certificate.pem').toString());
            app.use(stylus.middleware({
                src: __dirname + '/public',
                compile: compile
            }));
            app.use('/components', express.static(path.join(__dirname, 'components')));

            server = http.createServer(app);

            server.listen(app.get('port'));

            app.get('/', function (req, res) {
                if (!BotLocal) {
                    BotLocal = true; //once local is connected set it so another is unable display the default page.
                    res.render('index');
                } else if (BotLocal && !userConnected) {  //Only allow one connection at a time.
                    userConnected = true; //once user is connected set it so another is unable display the default page.
                    res.render('control');
                } else if (BotLocal && userConnected) {
                    res.render('multiple'); //Even though a user connection is there display something to keep user informed
                }
            });

            io = require('socket.io').listen(server, { log: false, secure: false });

            console.log('Remote Control page for ' + BOT_NAME + ' located at http://' + IP + ":" + app.get('port') + '/control  ');

            console.log('A browser will appear in ' + timer + ' seconds to initiate video stream for ' + BOT_NAME + '.');

            /*setTimeout(function () {
                childProcess.exec('start chrome --kiosk "http://localhost:' + app.get('port') + '"');
            }, timer * 1000); //1000 as setIntervel is in milleseconds*/

            setTimeout(function () {
                open('http://localhost:' + app.get('port'));
            }, timer * 1000); //1000 as setIntervel is in milleseconds

            io.sockets.on('connection', function (socket) {

                connectedSocket = socket;

                socket.on('disconnect', function () {
                    if (connectedSocket.handshake.address.address === '127.0.0.1') {
                        BotLocal = false;
                    } else {
                        userConnected = false;
                    }
                });

                socket.emit('BotReady');

                socket.on('BotCommand', function (command) {
                    var action = command.action,
                        direction = command.direction ? command.direction : null,
                        speed = command.speed,
                        message = '';

                    if (direction === 'back') {
                        speed = speed * -1;
                    }

                    if (direction === 'right' || direction === 'left') {
                        speed = speed - 100;
                    }

                    if (direction === 'right') {
                        speed = speed * -1;
                    }

                    if (action === 'stop') {
                        message = 'No Commands present, Stopping ' + BOT_NAME;
                        console.log(message);
                        socket.emit('BotMessages', message);
                        return Bot.drive(0, 0);
                    } else if (action !== 'dock') {
                        message = 'Moving Bot: ' + direction;
                        console.log(message);
                        socket.emit('BotMessages', message);
                        return Bot[action](speed,0);
                    } else if (action === 'dock') {
                        message = 'Attempting to Dock Bot.';
                        console.log(message);
                        socket.emit('BotMessages', message);
                        return Bot.dock();
                    }
                });
            });

            var bumpHndlr = function (bumperEvt) {
                var message,
                    speed,
                    Bot = this;

                message = 'Obstacle detected! Repositioning!';
                console.log(message);
                connectedSocket.emit('BotBump', message);
                speed = 200;
                // temporarily disable further bump events
                // getting multiple bump events while one is in progress
                // will cause weird interleaving of our Bot behavior
                Bot.off('bump');

                // backup a bit
                Bot.drive(-speed, 0);

                //wait to stabalize
                Bot.wait(1000);

                // turn based on which bumper sensor got hit
                switch(bumperEvt.which) {
                    case 'forward':
                        message += ' Obstacle was forward. '+ BOT_NAME + ' will back up some.';
                        console.log(message);
                        connectedSocket.emit('BotBump', message);
                        Bot.drive(-150, 0);
                        Bot.wait(250);
                        break;
                    case 'left':
                        message += ' Obstacle was on the left. ' + BOT_NAME + ' automatically turning right to avoid obstacle.';
                        console.log(message);
                        connectedSocket.emit('BotBump', message);
                        Bot.rotate(-speed); // turn right
                        Bot.wait(400);
                        break;
                    case 'right':
                        message += ' Obstacle was on the right. ' + BOT_NAME + ' automatically turning left to avoid obstacle.';
                        console.log(message);
                        connectedSocket.emit('BotBump', message);
                        Bot.rotate(speed); // turn left
                        Bot.wait(400);
                        break;
                }
                Bot.drive(0, 0);
                message += ' Repositioning Done! ' + BOT_NAME + ' Ready!';
                console.log(message);
                connectedSocket.emit('BotBump', message);
                // turn handler back on
                Bot.on('bump', bumpHndlr);
            };

            Bot.on('bump', bumpHndlr);
        }
    }

    BotConnection.init({ serialport:  BotSerial });

    BotConnection.on('ready', function () {
        botReady(this);
    });
}).call(this);
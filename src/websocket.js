var Emitter    = require('primus-emitter')
  , Primus     = require('primus')
  , xmpp       = require('xmpp-ftw')
  , Buddycloud = require('xmpp-ftw-buddycloud');

module.exports = function(config, server, logger) {
    var options = {
        transformer: 'socket.io',
        parser: 'JSON',
        transports: [
            'websocket',
            'htmlfile',
            'xhr-polling',
            'jsonp-polling'
        ],
        global: 'Buddycloud'
    };

    var primus = new Primus(server, options);
    primus.use('emitter', Emitter);
    primus.save(__dirname + '/../public/scripts/buddycloud.js');

    primus.on('connection', function(socket) {
        logger.debug('Websocket connection made');
        var xmppFtw = new xmpp.Xmpp(socket);
        xmppFtw.addListener(new Buddycloud());
        socket.xmppFtw = xmppFtw; 
    })

    primus.on('disconnection', function(socket) {
        logger.debug('Client disconnected, logging them out');
        socket.xmppFtw.logout();
    })
}
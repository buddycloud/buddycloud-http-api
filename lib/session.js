/*
 * Copyright 2012 Denis Washington <denisw@online.de>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// session.js:
// Handles session management.

var crypto = require('crypto');
var xmpp = require('node-xmpp');
var config = require('./config');

/**
 * Middleware that sets req.session to a Session object matching the
 * request's supplied session ID or it's authentication credentials.
 * It is assumed to run afer auth.parser().
 */
exports.provider = function(req, res, next) {
    var sessionId = req.header('X-Session-Id');
    req.session = Session.lookup(sessionId);
    if (req.session) {
        res.header('X-Session-Id', req.session.id);
        next();
    } else {
        createSession(req, res, next);
    }
};

function createSession(req, res, next) {
    var options = xmppClientOptions(req);
    var client = new xmpp.Client(options);
    var session;

    client.on('online', function() {
        session = req.session = new Session(client);
        res.header('X-Session-Id', session.id);
        next();
    });

    client.on('error', function(err) {
        // FIXME: Checking the error type bassed on the error message
        // is fragile, but this is the only information that node-xmpp
        // gives us.
        if (err == 'XMPP authentication failure') {
            res.header('WWW-Authenticate', 'Basic');
            res.send(401);
        } else {
           next(err);
        }
    });

    client.on('stanza', function(stanza) {
        if (stanza.attrs.id) {
            var handler = session.replyHandlers[stanza.attrs.id];
            if (handler)
                handler(stanza);
        }
    });
}

function xmppClientOptions(req) {
    if (req.user) {
        return {
            jid: req.user,
            password: req.password,
            host: config.xmppHost,
            port: config.xmppPort
        };
    } else {
        var domain = config.xmppAnonymousDomain || config.xmppDomain;
        var host = config.xmppAnonymousHost || config.xmppHost;
        var port = config.xmppAnonymousPort ||config.xmppPort;
        return {
            jid: '@' + domain,
            host: host,
            port: port
        };
    }
}

/**
 * Represents a client session.
 */
function Session(xmppClient) {
    this.xmpp = xmppClient;
    this.replyHandlers = {};
    
    this.id = idForTable(Session.lookup.table);
    Session.lookup.table[this.id] = this;
}

function idForTable(table) {
    while (true) {
        var id = crypto.randomBytes(16).toString('hex');
        if (!table[id])
            return id;
    }
}

Session.lookup = function(id) {
    return Session.lookup.table[id];
};

Session.lookup.table = {};

/**
 * Sends a query to the XMPP server. When a reply is received, 'onreply'
 * is called with the reply stanza as argument.
 */
Session.prototype.sendQuery = function(iq, onreply) {
    iq.attr('id', idForTable(this.replyHandlers));
    this.xmpp.send(iq);
    this.replyHandlers[iq.attrs.id] = onreply;
};


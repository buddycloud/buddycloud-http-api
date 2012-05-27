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

var anonymousSession;
var sessionTable = {};
var expirationTable = {};

/**
 * Middleware that sets req.session to a Session object matching the
 * request's supplied session ID or it's authentication credentials.
 * It is assumed to run afer auth.parser().
 */
exports.provider = function(req, res, next) {
    var sessionId = req.header('X-Session-Id');
    if (sessionId)
        processSessionId(sessionId, req, res, next);
    else if (req.user)
        createSession(req, res, next);
    else
        useAnonymousSession(req, res, next);
};

function processSessionId(sessionId, req, res, next) {
    var session = sessionTable[sessionId];
    if (session)
        provideSession(session, req, res, next);
    else if (req.user)
        createSession(req, res, next);
    else
        replyNotAuthorized(res);
}

function provideSession(session, req, res, next) {
    req.session = session;
    if (session.id) {
        res.header('X-Session-Id', session.id);
    }
    next();
}

function createSession(req, res, next) {
    var options = xmppConnectionOptions(req);
    var client = new xmpp.Client(options);
    var session;

    client.on('online', function() {
        var sessionId = req.user ? uniqueIdForTable(sessionTable) : undefined;
        session = new Session(sessionId, client);
        if (sessionId)
            sessionTable[sessionId] = session;
        provideSession(session, req, res, next);
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
}

function xmppConnectionOptions(req) {
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

function uniqueIdForTable(table) {
    while (true) {
        var id = crypto.randomBytes(16).toString('hex');
        if (!table[id])
            return id;
    }
}

function useAnonymousSession(req, res, next) {
    if (anonymousSession)
        provideSession(anonymousSession, req, res, next);
    else
        createSession(req, res, function(err) {
            if (!err)
                anonymousSession = req.session;
            next(err);
        });
}

function replyNotAuthorized(res) {
    res.header('WWW-Authenticate', 'Basic');
    res.send(401);
}

function Session(id, connection) {
    this.id = id;
    this._connection = connection;
    this._replyHandlers = {};
    this._setupStanzaListener();
}

Session.prototype._setupStanzaListener = function() {
    var self = this;
    this._connection.on('stanza', function(stanza) {
        if (stanza.attrs.id) {
            var handler = self._replyHandlers[stanza.attrs.id];
            if (handler) {
                delete self._replyHandlers[stanza.attrs.id];
                handler(stanza);
            }
        }
    });
}
/**
 * Sends a query to the XMPP server using the session's connection. When a
 * reply is received, 'onreply' is called with the reply stanza as argument.
 */
Session.prototype.sendQuery = function(iq, onreply) {
    iq.attr('id', uniqueIdForTable(this._replyHandlers));
    this._replyHandlers[iq.attrs.id] = onreply;
    this._connection.send(iq);
};

/**
 * Closes the XMPP connection associated with the session.
 */
Session.prototype.end = function() {
    this._connection.end();
};


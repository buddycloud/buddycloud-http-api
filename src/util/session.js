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

var xmpp = require('node-xmpp');
var api = require('./api');
var cache = require('./cache');
var config = require('./config');

var anonymousSession;
var sessionCache = new cache.Cache(config.sessionExpirationTime);
sessionCache.onexpired = function(_, session) {
    session.end();
};

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
    var session = sessionCache.get(sessionId);
    if (session)
        provideSession(session, req, res, next);
    else if (req.user)
        createSession(req, res, next);
    else
        api.sendUnauthorized(res);
}

function provideSession(session, req, res, next) {
    req.session = session;
    if (session.id) {
        sessionCache.put(session.id, session);
        res.header('X-Session-Id', session.id);
    }
    next();
}

function createSession(req, res, next) {
    var options = xmppConnectionOptions(req);
    var client = new xmpp.Client(options);
    var session;

    client.on('online', function() {
        var sessionId = req.user ? sessionCache.generateKey() : null;
        session = new Session(sessionId, client);
        provideSession(session, req, res, next);
    });

    client.on('error', function(err) {
        // FIXME: Checking the error type bassed on the error message
        // is fragile, but this is the only information that node-xmpp
        // gives us.
        if (err == 'XMPP authentication failure')
            api.sendUnauthorized(res);
        else
           next(err);
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


function Session(id, connection) {
    this.id = id;
    this.jid = connection.jid.toString();

    this._connection = connection;
    this._replyHandlers = new cache.Cache();
    this._setupStanzaListener();
}

Session.prototype._setupStanzaListener = function() {
    var self = this;
    this._connection.on('stanza', function(stanza) {
        if (stanza.attrs.id) {
            var handler = self._replyHandlers.get(stanza.attrs.id);
            if (handler) {
                self._replyHandlers.remove(stanza.attrs.id);
                handler(stanza);
            }
        }
    });
};

/**
 * Registers a handler for incoming stanzas. Whenever the session receives
 * a stanza which is not a reply to a stanza sent with sendQuery(), the
 * callback is called with the stanza as argument.
 */
Session.prototype.onStanza = function(handler) {
    var callback = function(stanza) {
        if (handler(stanza)) {
            this._connection.removeListener(callback);
        }
    };
    this._connection.on('stanza', callback);
};

/**
 * Sends a query to the XMPP server using the session's connection. When a
 * reply is received, 'onreply' is called with the reply stanza as argument.
 */
Session.prototype.sendQuery = function(iq, onreply) {
    var queryId = this._replyHandlers.generateKey();
    this._replyHandlers.put(queryId, onreply);

    iq = iq.root();
    iq.attr('from', this._connection.jid.toString());
    iq.attr('id', queryId);
    this._connection.send(iq);
};

/**
 * Sends a reply for a received <iq/>.
 */
Session.prototype.replyToQuery = function(iq) {
    var reply = new xmpp.Iq({
        type: 'result',
        from: iq.attrs.to,
        to: iq.attrs.from,
        id: iq.attrs.id
    });
    this._connection.send(reply);
};

/**
 * Closes the XMPP connection associated with the session.
 */
Session.prototype.end = function() {
    this._connection.end();
};


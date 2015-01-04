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

var Client = require('node-xmpp-client')
  , http = require('http')
  , jwt = require('jwt-simple')
  , api = require('./api')
  , cache = require('./cache')
  , config = require('./config')
  , pubsub = require('./pubsub')
  , atom = require('./atom')
  , grip = require('./grip')
  , ltx = require('ltx')
  , crypto = require('crypto')
  , logger = require('./log')

var anonymousSession;
var sessionCache = new cache.Cache(config.sessionExpirationTime);
sessionCache.onexpired = function(_, session) {
  logger.debug("Session expired. Jid: " + session.jid);
  session.end();
};

/**
 * Middleware that sets req.session to a Session object matching the
 * request's supplied session ID or it's authentication credentials.
 * It is assumed to run after auth.parser().
 */
exports.provider = function(req, res, next) {
  if (req.credentials) {
    var session = sessionCache.get(req.credentials);
    if (session) {
      provideSession(session, req, res, next);
    } else {
      createSession(req, res, next);
    }
  } else {
    useAnonymousSession(req, res, next);
  }
};

function provideSession(session, req, res, next) {
  req.session = session;
  if (session.id) {
    sessionCache.put(session.id, session);
  }
  var origin = req.header('Origin');
  if (origin) {
    req.session.origin = origin;
  }
  if (session.ready) {
    next();
  } else {
    session._waitingReqs.push({'req': req, 'res': res, 'next': next});
  }
}

exports.expire = function(req) {
  sessionCache.remove(req.credentials);
  if (req.session) {
    req.session.end();
  }
};

function sendRegisterIq(client, registerIq, to, callback) {
  var iqId = crypto.randomBytes(16).toString('hex');
  var iq = registerIq.root();
  iq.attr('from', client.jid.toString());
  iq.attr('to', to);
  iq.attr('id', iqId);

  logger.debug("OUT xmpp: " + iq);
  client.on('stanza', function(stanza) {
    if (callback && stanza.attrs.id == iqId) {
      callback();
    }
  });

  client.send(iq);
}

function getChannelServerRegIQ() {
  var queryNode = new ltx.Element('iq', {type: 'set' }).c('query', { xmlns: 'jabber:iq:register' })
  return queryNode.root();
}

function registerOnChannelServer(client, callback) {
  if (!config.createUserOnSessionCreation) {
    callback();
    return;
  }
  var signupIq = getChannelServerRegIQ();
  sendRegisterIq(client, signupIq, config.channelDomain, function() {
    callback();
  });
}

function createSession(req, res, next) {
  var options = xmppConnectionOptions(req);
  var client = new Client(options);
  logger.debug("Creating XMPP connection for jid: " + options.jid);

  var session = new Session(req.credentials, client);

  // initially the session is cached in a non-ready state
  provideSession(session, req, res, next);

  client.on('online', function() {
    logger.debug("XMPP connection created for jid: " + session.jid);
    logger.debug("Creating session for jid: " + session.jid);
    session.ready = true;
    session._sendGeneralPresence();
    session.sendPresenceOnline();
    registerOnChannelServer(client, function() {
	  logger.debug("Session created for jid: " + session.jid);
      // Handle waiting requests
	  for (var i = 0; i < session._waitingReqs.length; i++) {
	    var wr = session._waitingReqs[i];
	    var next = wr['next'];
	    next();
	  }
    });
    
  });

  client.on('error', function(error) {
    // FIXME: Checking the error type bassed on the error message
    // is fragile, but this is the only information that node-xmpp
    // gives us.
    logger.error('Session error: ' + error);
    sessionCache.remove(req.credentials);

    // Handle waiting requests
    for (var i = 0; i < session._waitingReqs.length; i++) {
      var wr = session._waitingReqs[i];
      if (error === 'XMPP authentication failure') {
        api.sendUnauthorized(wr['res']);
      } else {
        wr['res'].send(503);
      }
    }
  });

  client.on('offline', function(error) {
    logger.error('Session went offline.');
    sessionCache.remove(req.credentials);
    for (var i = 0; i < session._waitingReqs.length; i++) {
      var wr = session._waitingReqs[i];
      wr['res'].send(503);
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
    var domain = config.xmppAnonymousDomain || config.xmppDomain
      || 'anon.' + api.normalizeForwardedHost(req);
    var host = config.xmppAnonymousHost || config.xmppHost;
    var port = config.xmppAnonymousPort ||config.xmppPort;
    return {
      jid: '@' + domain,
      host: host,
      port: port
      //preferredSaslMechanism: 'ANONYMOUS'
    };
  }
}

function useAnonymousSession(req, res, next) {
  if (anonymousSession) {
    provideSession(anonymousSession, req, res, next);
  } else {
    createSession(req, res, function(err) {
      if (!err) {
        req.session.jid = req.session._connection.jid.toString();
      } else {
        anonymousSession = null;
      }
      next(err);
    });
    anonymousSession = req.session;
  }
}

function Session(id, connection) {
  this.id = id;
  this.jid = connection.jid.toString();
  this.itemCache = [];
  this.ready = false;
  this._connection = connection;
  this._presenceCount = 0;
  this._waitingReqs = []; // while connection was being created
  this._pendingRequests = []; // long polling
  this._replyHandlers = new cache.Cache(config.requestExpirationTime);
  this._subs = new cache.Cache(config.sessionExpirationTime);
  this._subsPresences = {}; // refcounts
  this._setupExpirationHandler();
  this._setupStanzaListener();
}

Session.prototype.getFullJID = function() {
  return this._connection.jid.toString();
};

Session.prototype._setupExpirationHandler = function() {
  this._replyHandlers.onexpired = function(_, handler) {
    var error = new ltx.Element('iq', {'type': 'error'}).
      c('error', {'type': 'cancel'}).
      c('service-unavailable').
      root();
    handler(error);
  };

  // TODO: send iq to unsub. also decrement refs on presence, and send pres
  //   unavailable if needed.
  /*this._subs.onexpired = function(_, handler) {
    var error = new xmpp.Iq({'type': 'error'}).
      c('error', {'type': 'cancel'}).
      c('service-unavailable').
      root();
    handler(error);
  };*/
};

Session.prototype._handlePendingRequests = function() {
  // Notify pending requests
  for (var i = 0; i < this._pendingRequests.length; i++) {
    var pending = this._pendingRequests[i];
    if (pending.ctx.req) {
      pending.callback(pending.ctx.req, pending.ctx.res);
    }
  }

  this._pendingRequests = [];
};

Session.prototype._setupStanzaListener = function() {
  var self = this;
  this._connection.on('stanza', function(stanza) {
    logger.debug("IN xmpp: " + stanza);
    if (stanza.name === 'message') {
      if (pubsub.isPubSubItemMessage(stanza)) {
        var item = pubsub.extractItem(stanza);
        var timestamp = new Date().getTime();
        self.itemCache.push({'timestamp': timestamp, 'item': item});

        // Expire old cache (items older than session expiration time)
        self._expireOldCache(timestamp);

        self._handlePendingRequests();
      }
    }
    if (stanza.attrs.id) {
      var handler = self._replyHandlers.get(stanza.attrs.id);
      if (handler) {
        self._replyHandlers.remove(stanza.attrs.id);
        handler(stanza);
      }
    }
  });
};

Session.prototype._expireOldCache = function(timestamp) {
  var sessionExpTime = config.sessionExpirationTime * 1000; // in milliseconds
  var expTimeLimit = timestamp - sessionExpTime;

  var i = 0;
  while (i < this.itemCache.length && this.itemCache[i].timestamp < expTimeLimit) {
    i++;
  }

  this.itemCache.splice(0, i);
};

Session.prototype.holdRequest = function(ctx, callback) {
  this._pendingRequests.push({ctx: ctx, callback: callback});
};

/**
 * Registers a handler for incoming stanzas. Whenever the session receives
 * a stanza which is not a reply to a stanza sent with sendQuery(), the
 * callback is called with the stanza as argument.
 */
Session.prototype.onStanza = function(handler) {
  this._connection.on('stanza', handler);
  return handler;
};

Session.prototype.removeStanzaListener = function(handler) {
  this._connection.removeListener('stanza', handler);
};

Session.prototype.sendPresenceOnline = function() {
  if (this._presenceCount === 0) {
    this._sendPresence(undefined, config.channelDomain);
  } else {
    this._presenceCount++;
  }
};

Session.prototype.sendPresenceOffline = function() {
  if (this._presenceCount > 0) {
    this._sendPresence('unavailable', config.channelDomain);
    this._presenceCount--;
  }
};

Session.prototype._sendPresence = function(type, to) {
  this._connection.send(new ltx.Element('presence', {
    from: this._connection.jid.bare().toString(),
    to: to,
    type: type
  }));
};

Session.prototype._sendGeneralPresence = function() {
  this._connection.send(new ltx.Element('presence'));
};

/**
 * Sends a query to the XMPP server using the session's connection. When a
 * reply is received, 'onreply' is called with the reply stanza as argument.
 */
Session.prototype.sendQuery = function(iq, onreply, to) {
  var queryId = this._replyHandlers.generateKey();
  this._replyHandlers.put(queryId, onreply);

  to = typeof to !== 'undefined' ? to : config.channelDomain;

  iq = iq.root();
  iq.attr('from', this._connection.jid.toString());
  iq.attr('to', to);
  iq.attr('id', queryId);
  logger.debug("OUT xmpp: " + iq);
  this._connection.send(iq);
};

/**
 * Sends a reply for a received <iq/>.
 */
Session.prototype.replyToQuery = function(iq) {
  var reply = new ltx.Element('iq', {
    type: 'result',
    from: iq.attrs.to,
    to: iq.attrs.from,
    id: iq.attrs.id
  });
  this._connection.send(reply);
};

Session.prototype.replyToConfirm = function(message) {
  var to = message.attrs.to;
  var from = message.attrs.from;
  message.attrs.to = from;
  message.attrs.from = to;
  logger.debug("OUT xmpp: " + message);
  this._connection.send(message);
};

/**
 * Closes the XMPP connection associated with the session.
 */
Session.prototype.end = function() {
  this._connection.end();
};

/**
 * Create temporary subscription. 'onsub' is called with a state object as
 * argument. If the subscription cannot be created, then 'onerror' is called
 * with an error string. Calling subscribe() after a subscription already
 * exists will cause the timeout to be extended and 'onsub' called
 * immediately.
 */
Session.prototype.subscribe = function(nodeId, onsub, onerror) {
  var pubjid = config.channelDomain;
  var subkey = pubjid + "_" + nodeId;
  var sub = this._subs[subkey];
  if (sub) {
    if (sub.state === 'subscribed') {
      onsub(sub.userData);
    } else if (sub.state === 'subscribing') {
      var p = {};
      p.onsub = onsub;
      p.onerror = onerror;
      sub.pending.push(p);
    } else {
      onerror('an error that should not happen');
    }
    return;
  }

  var p = {};
  p.onsub = onsub;
  p.onerror = onerror;
  sub = { state: 'subscribing', pending: [p], userData: {} };
  this._subs[subkey] = sub;

  var refs = this._subsPresences[pubjid];
  if (!refs) {
    refs = 1;
    this._subsPresences[pubjid] = refs;
    var pres = new ltx.Element('presence', {
      from: this.jid,
      to: pubjid,
    });
    logger.debug("OUT xmpp: " + pres);
    this._connection.send(pres);
  } else {
    ++refs;
  }

  var iq = pubsub.subscribeIq(nodeId, this.jid, true);
  var self = this;
  this.sendQuery(iq, function(reply) {
    if (reply.attrs.type === "result") {
      sub.state = 'subscribed';
      // TODO: record subid, needed for unsub
      for (var i = 0; i < sub.pending.length; ++i) {
        sub.pending[i].onsub(sub.userData);
      }
    } else {
      var pending = sub.pending;
      delete self._subs[subkey];
      var reason = 'failed';
      if ((reply.attrs.type === 'error') && reply.getChild('error')
              .getChild('registration-required')) {
        reason = 'registration-required';
      }
      for(var i = 0; i < pending.length; ++i) {
        pending[i].onerror(reason);
      }
    }
  });
}

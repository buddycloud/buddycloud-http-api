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

// api.js:
// Utility functions and middleware used by the API resource handlers.

var griplib = require('grip');
var ltx = require('ltx');
var atom = require('./atom');
var auth = require('./auth');
var cache = require('./cache');
var config = require('./config');
var pubsub = require('./pubsub');
var dns = require('./dns');
var grip = require('./grip');
var logger = require('./log');

/**
 * Sends a "401 Unauthorized" response with the correct "WWW-Authenticate"
 * header set.
 */
exports.sendUnauthorized = function(res) {
  res.header(
    'WWW-Authenticate',
    'Basic realm="' + config.xmppDomain + '"'
  );
  res.send(401);
};

exports.sendGripUnsupported = function(res) {
  res.send("Error: Realtime endpoint not supported. Set up Pushpin or Fanout.io\n", 501);
};

/**
 * Like session.sendQuery(), but takes care of any returned XMPP error
 * stanzas and only passes real replies to the callback.
 */
exports.sendQuery = function(req, res, iq, callback) {
  req.session.sendQuery(iq, function(reply) {
    checkError(reply, req, res, iq, callback);
  }, config.channelDomain);
};

exports.sendQueryToXmpp = function(req, res, iq, domain, callback) {
  req.session.sendQuery(iq, function(reply) {
    checkError(reply, req, res, iq, callback);
  }, domain);
};

exports.sendQueryToSearch = function(req, res, iq, callback) {
  req.session.sendQuery(iq, function(reply) {
    checkError(reply, req, res, iq, callback);
  }, config.searchComponent);
};

exports.sendQueryToPusher = function(req, res, iq, callback) {
  req.session.sendQuery(iq, function(reply) {
    checkError(reply, req, res, iq, callback);
  }, config.pusherComponent);
};

exports.sendQueryToFriendFinder = function(req, res, iq, callback) {
  req.session.sendQuery(iq, function(reply) {
    checkError(reply, req, res, iq, callback);
  }, config.friendFinderComponent);
};

function checkError(reply, req, res, iq, callback) {
    if (reply.attrs.type == 'error') {
		reportXmppError(req, res, reply);
	} else {
        delete reply.attrs.xmlns;
		callback(reply);
	}
}

function reportXmppError(req, res, errorStanza) {

  var error = errorStanza.getChild('error')

  if (error) {
    if (error.getChild('not-authorized') ||
        error.getChild('not-allowed') ||
        error.getChild('pending-subscription') ||
        error.getChild('forbidden') ||
        error.getChild('registration-required') ||
        error.getChild('closed-node')) {

      if (req.user) {
        res.send(403);
      } else {
        exports.sendUnauthorized(res);
      }
    } else if (error.getChild('bad-request')) {
      res.send(400);
    } else if (error.getChild('item-not-found')) {
      res.send(404);
    }
  }
  res.send(500);
}

/**
 * Responds to req with an Atom document in a format
 * determined by the "Accept" request header (either
 * XML or JSON).
 */
exports.sendAtomResponse = function(req, res, doc, statusCode, lastTimestamp) {
  var response;

  if (req.accepts('application/atom+xml')) {
    res.contentType('atom');
    response = doc.toString();
  } else if (req.accepts('application/json')) {
    res.contentType('json');
    if (lastTimestamp) {
      response = {};
      response['last'] = lastTimestamp;
      response['items'] = atom.toJSON(doc);
      response = JSON.stringify(response);
    } else {
      response = JSON.stringify(atom.toJSON(doc));
    }
  } else {
    statusCode = 406;
  }

  res.send(response, statusCode || 200);
};

// publishes to -atom and -json of the channel name
exports.publishAtomResponse = function(origin, channelBase, doc, id, prevId) {
  if (origin == 'null') {
    origin = '*';
  }
  var headers = {};
  headers['Access-Control-Allow-Origin'] = origin;
  headers['Access-Control-Allow-Credentials'] = 'true';
  headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE';
  headers['Access-Control-Allow-Headers'] =
          'Authorization, Content-Type, X-Requested-With, X-Session-Id';
  headers['Access-Control-Expose-Headers'] = 'Location, X-Session-Id';

  headers['Content-Type'] = 'application/atom+xml';
  var response = doc.toString();
  var channel = channelBase + '-atom';
  logger.debug('grip: publishing on channel ' + channel);
  grip.publish(channel, id, prevId, headers, response);

  headers['Content-Type'] = 'application/json';
  if (id != null) {
    response = {};
    response['last_cursor'] = id;
    response['items'] = atom.toJSON(doc);
    response = JSON.stringify(response);
  } else {
    response = JSON.stringify(atom.toJSON(doc));
  }
  channel = channelBase + '-json';
  logger.debug('grip: publishing on channel ' + channel);
  grip.publish(channel, id, prevId, headers, response);
};

// suffixes -json or -atom to the channel name
exports.sendHoldResponse = function(req, res, channelBase, prevId) {
  var origin = req.header('Origin', '*');
  if (origin == 'null') {
    origin = '*';
  }
  var headers = {};
  headers['Access-Control-Allow-Origin'] = origin;
  headers['Access-Control-Allow-Credentials'] = 'true';
  headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE';
  headers['Access-Control-Allow-Headers'] =
          'Authorization, Content-Type, X-Requested-With, X-Session-Id';
  headers['Access-Control-Expose-Headers'] = 'Location, X-Session-Id';

  var channel;
  var contentType;
  var body;
  if (req.accepts('application/atom+xml')) {
    channel = channelBase + '-atom';
    contentType = 'application/atom+xml';
    body = '<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom"/>\n';
  } else if (req.accepts('application/json')) {
    channel = channelBase + '-json';
    contentType = 'application/json';
    body = {};
    body['last_cursor'] = prevId;
    body['items'] = [];
    body = JSON.stringify(body);
  } else {
    res.send(406);
    return;
  }

  var channelObj = new griplib.Channel(channel, prevId);
  headers['Content-Type'] = contentType;
  var response = new griplib.Response({'headers': headers, 'body': body});
  var instruct = griplib.createHoldResponse(channelObj, response);

  logger.debug('grip: sending hold for channel ' + channel);
  res.set('Content-Type', 'application/grip-instruct');
  res.send(instruct);
};

/**
 * Middleware that reads the request body into a Buffer which is stored
 * in req.body.
 */
exports.bodyReader = function(req, res, next) {
  var chunks = [];
  var size = 0;

  req.on('data', function(data) {
    chunks.push(data);
    size += data.length;
  });

  req.on('end', function(data) {
    req.body = new Buffer(size);
    copyIntoBuffer(req.body, chunks);
    next();
  });

  req.on('close', function() {
    res.send('Unexpected end of stream', 500);
  });
};

function copyIntoBuffer(buffer, chunks) {
  var offset = 0;
  chunks.forEach(function(chunk) {
    chunk.copy(buffer, offset);
    offset += chunk.length;
  });
}

/**
 * Middleware that looks up the buddycloud media server responsible
 * for the requested resource and stores its HTTP root in req.mediaRoot.
 */
exports.mediaServerDiscoverer = function(req, res, next) {
  dns.discoverAPI(req, function(mediaRoot) {
    if (mediaRoot) {
      req.mediaRoot = mediaRoot;
    } else if (config.homeMediaRoot) {
      req.mediaRoot = config.homeMediaRoot;
    }
    next();
  });
};

exports.generateNodeFeedFromEntries = function(channel, node, from, entries) {
  var feed = new ltx.Element('feed', { xmlns: atom.ns });
  feed.c('title').t(channel + ' ' + node);

  var nodeId = pubsub.channelNodeId(channel, node);
  var queryURI = pubsub.queryURI(from, 'retrieve', nodeId);
  feed.c('id').t(queryURI);

  entries.forEach(function(entry) {
    atom.normalizeEntry(entry);
    feed.cnode(entry.clone());
  });
  return feed;
};

exports.normalizeForwardedHost = function(req) {
  return req.headers['x-forwarded-host'];
}

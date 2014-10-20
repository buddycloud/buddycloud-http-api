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

// media.js:
// Handles requests for communicationg with buddycloud media servers
// (/<channel>/media, /<channel>/media/<file>).

var crypto = require('crypto');
var http = require('http');
var https = require('https');
var url = require('url');
var api = require('./util/api');
var session = require('./util/session');
var logger = require('./util/log');

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
  app.post('/:channel/media',
           api.bodyReader,
           session.provider,
           api.mediaServerDiscoverer,
           proxyToMediaServer);
  app.get('/:channel/media/:id',
          session.provider,
          api.mediaServerDiscoverer,
          proxyToMediaServer);
  app.get('/:channel/media/:id/metadata',
          session.provider,
          api.mediaServerDiscoverer,
          proxyToMediaServer);
  app.put('/:channel/media/:id',
          api.bodyReader,
          session.provider,
          api.mediaServerDiscoverer,
          proxyToMediaServer);
};

function proxyToMediaServer(req, res, next) {
  var transactionId = req.user ? generateTransactionId() : null;
  var mediaUrl = getMediaUrl(req, transactionId);
  var listener = null;
  if (transactionId) {
    listener = listenForConfirmationRequest(req.session, transactionId);
  }
  forwardRequest(req, res, mediaUrl, listener);
}

function generateTransactionId() {
  return crypto.randomBytes(16).toString('hex');
}

function getMediaUrl(req, transactionId) {
  if (!req.mediaRoot) return;
  var mediaUrl = url.parse(req.mediaRoot);
  ensureTrailingSlash(mediaUrl);
  mediaUrl.pathname += req.params.channel;
  if (req.params.id) {
    mediaUrl.pathname += '/' + req.params.id;
  }
  if (req.url.indexOf('metadata') > -1) {
    mediaUrl.pathname += '/metadata';
  }
  mediaUrl.query = req.query || {};
  if (transactionId) {
    mediaUrl.query['auth'] = generateAuthToken(req, transactionId);
  }
  return url.format(mediaUrl);
}

function ensureTrailingSlash(mediaUrl) {
  if (mediaUrl.pathname.charAt(mediaUrl.pathname.length - 1) != '/') {
    mediaUrl.pathname += '/';
  }
}

function generateAuthToken(req, transactionId) {
  var buf = new Buffer(req.session.getFullJID() + ':' + transactionId);
  return base64url(buf);
}

function base64url(buf) {
  return buf.toString('base64').replace('+', '-').replace('/', '_');
}

function forwardRequest(req, res, mediaUrl, listener) {
  if (!mediaUrl) {
    removeListener(req, listener);
    return res.send(503);
  }

  mediaUrl = url.parse(mediaUrl);
  req.headers['host'] = mediaUrl.host;

  var request = (mediaUrl.protocol == 'https:') ? https.request : http.request;
  var mediaReq = request({
    host: mediaUrl.hostname,
    port: mediaUrl.port,
    method: req.method,
    path: mediaUrl.path,
    headers: req.headers,
  }, function(mediaRes) {
    res.writeHead(mediaRes.statusCode,
      mediaRes.headers);

    mediaRes.on('data', function(data) {
      res.write(data);
    });
    mediaRes.on('end', function(data) {
      removeListener(req, listener);
      res.end();
    });
    mediaRes.on('close', function(data) {
      removeListener(req, listener);
      res.send(500);
    });
  });

  mediaReq.on('error', function(err) {
    removeListener(req, listener);
    res.send(err, 500);
  });

  if (req.body) {
    mediaReq.write(req.body);
  }
  mediaReq.end();
}

function removeListener(req, listener) {
  if (listener) {
    req.session.removeStanzaListener(listener);
  }
}

function listenForConfirmationRequest(session, transactionId) {
  logger.debug('Listening for confirmation request of transaction ' + transactionId);
  var listener = function(stanza) {
    var confirmEl = stanza.getChild('confirm');
    if (confirmEl && confirmEl.attrs.id == transactionId) {
      logger.debug('Received confirmation request for transaction ' + transactionId);
      session.replyToConfirm(stanza);
      session.removeStanzaListener(listener);
    }
  };
  return session.onStanza(listener);
}
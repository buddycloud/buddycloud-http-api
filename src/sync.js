/*
 * Copyright 2012 buddycloud
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

// sync.js:
// Handles requests to synchronize unread counters and posts (/sync).

var config = require('./util/config');
var session = require('./util/session');
var api = require('./util/api');
var recent = require('./util/recent');
var pubsub = require('./util/pubsub');
var url = require('url');
var crypto = require('crypto');

var xmpp = require('node-xmpp');
var xml = require('libxmljs');

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
  app.get('/sync',
           session.provider,
           getRecentItems);
};

//// GET /sync /////////////////////////////////////////////////////////////
function getRecentItems(req, res) {
  if (!req.user) {
    api.sendUnauthorized(res);
    return;
  }
  
  var params = url.parse(req.url, true).query;
  var since = params.since;
  var max = params.max;
  var counters = params.counters && params.counters == 'true';
  
  var jsonResponse = {};
  
  var callback = function(reply) {
    var rsm = recent.rsmToJSON(reply);
    recent.toJSON(reply, jsonResponse, counters);
    if (rsm.last) {
      requestRecentItems(req, res, since, max, callback, rsm.last);
    } else {
      res.contentType('json');
      res.send(jsonResponse);
    } 
  }
  
  requestRecentItems(req, res, since, max, callback);
}

function iq(attrs, ns) {
  return new xmpp.Iq(attrs).c('pubsub', {xmlns: ns});
}

function createRecentItemsIQ(since, max, after) {
  var pubsubNode = iq({type: 'get'}, pubsub.ns);
  pubsubNode.c('recent-items', {xmlns: 'http://buddycloud.org/v1', since: since, max: max});
  if (after) {
    var rsm = pubsubNode.c('set', {xmlns: 'http://jabber.org/protocol/rsm'});
    rsm.c('after').t(after);
  }
  return pubsubNode.root();
}

function requestRecentItems(req, res, since, max, callback, after) {
  var searchIq = createRecentItemsIQ(since, max, after);
  api.sendQuery(req, res, searchIq, callback);
}
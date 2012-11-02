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
var mam = require('./util/mam');
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
           getArchivedMessages);
};

//// GET /sync /////////////////////////////////////////////////////////////
function getArchivedMessages(req, res) {
  var params = url.parse(req.url, true).query;
  var start = params.since;
  var max = params.max;
  
  requestArchivedMessages(req, res, start, max, function(reply) {
    res.contentType('json');
    res.send(mam.toJSON(reply, max));
  });
}

function iq(attrs, ns) {
  return new xmpp.Iq(attrs).c('query', {xmlns: ns || exports.ns});
}

function createMAMQuery(start) {
  var queryNode = iq({type: 'get'}, mam.ns);
  queryNode.c('start').t(start);
  return queryNode.root();
}

function requestArchivedMessages(req, res, start, max, callback) {
  var searchIq = createMAMQuery(start);
  api.sendMAMQuery(req, res, searchIq, callback);
}
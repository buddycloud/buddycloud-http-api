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

// most_active.js:
// Handles requests to retrieve the most active channels (/most_active).

var config = require('./util/config');
var searchUtils = require('./util/do_search');
var session = require('./util/session');
var api = require('./util/api');
var url = require('url');

var mostActiveNs = 'http://buddycloud.com/channel_directory/most_active';

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
  app.get('/most_active',
           session.provider,
           getMostActive);
};

//// GET /most_active /////////////////////////////////////////////////////////////

function getMostActive(req, res) {
  var params = url.parse(req.url, true).query;
  var max = params.max;
  var index = params.index;

  requestMostActive(req, res, max, index, function(reply) {
    var items = searchUtils.channelsToJSON(reply, mostActiveNs);
    var rsm = searchUtils.rsmToJSON(reply);
    var body = {items: items, rsm: rsm};
    res.contentType('json');
    res.send(body);
  });
}

function requestMostActive(req, res, max, index, callback) {
  var searchIq = searchUtils.mostActive(max, index);
  api.sendQueryToSearch(req, res, searchIq, callback);
}
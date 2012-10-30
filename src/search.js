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

// search.js:
// Handles search-related requests (/search).

var config = require('./util/config');
var searchUtils = require('./util/do_search');
var session = require('./util/session');
var api = require('./util/api');
var url = require('url');

var metadataNs = 'http://buddycloud.com/channel_directory/metadata_query';

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
  app.get('/search',
           session.provider,
           doSearch);
};

//// GET /search /////////////////////////////////////////////////////////////

function doSearch(req, res) {
  var params = url.parse(req.url, true).query;
  
  var type = params.type;
  var q = params.q;
  var max = params.max;
  var index = params.index;

  if (!type || !q) {
    res.send(400);
    return;
  }
  
  requestSearchResult(req, res, type, q, max, index, function(reply) {
    var items = null;
    if (type == 'metadata') {
      items = searchUtils.channelsToJSON(reply, metadataNs);
    } else if (type == 'content') {
      items = searchUtils.postsToJSON(reply);
    }
    var rsm = searchUtils.rsmToJSON(reply);
    var body = {items: items, rsm: rsm};
    res.contentType('json');
    res.send(body);
  });
}

function requestSearchResult(req, res, type, q, max, index, callback) {
  var searchIq = searchUtils.search(type, q, max, index);
  api.sendQueryToSearch(req, res, searchIq, callback);
}
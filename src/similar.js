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

// similar.js:
// Handles requests related to channel similarity (/:channel/similar/).

var config = require('./util/config')
  , searchUtils = require('./util/do_search')
  , session = require('./util/session')
  , api = require('./util/api')
  , url = require('url')
  , ltx = require('ltx')

var similarityNs = 'http://buddycloud.com/channel_directory/similar_channels';

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
  app.get('/:channel/similar',
           session.provider,
           getSimilarChannels);
};

//// GET /:channel/similar/ /////////////////////////////////////////////////////////////

function getSimilarChannels(req, res) {
  var channel = req.params.channel;

  var params = url.parse(req.url, true).query;
  var max = params.max;
  var index = params.index;

  requestSimilarChannels(req, res, channel, max, index, function(reply) {
    var items = searchUtils.channelsToJSON(reply, similarityNs);
    var rsm = searchUtils.rsmToJSON(reply);
    var body = {items: items, rsm: rsm};
    res.contentType('json');
    res.send(body);
  });
}

function requestSimilarChannels(req, res, channel, max, index, callback) {
  var searchIq = getSimilarChannelIq(channel, max, index);
  api.sendQueryToSearch(req, res, searchIq, callback);
}

function iq(attrs, ns) {
  return new ltx.Element('iq', attrs).c('query', { xmlns: ns || exports.ns })
}

function getSimilarChannelIq(channel, max, index) {
  var queryNode = iq({type: 'get'}, similarityNs);
  queryNode.c('channel-jid').t(channel);
  searchUtils.appendRSM(queryNode, max, index);
  return queryNode.root();
}
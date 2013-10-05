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

// topic_channel.js:
// Handles requests concerning topic channel creation
// (/<channel>).

var xml = require('libxmljs');
var api = require('./util/api');
var pubsub = require('./util/pubsub');
var session = require('./util/session');

var NODE_PREFIX = '/user/';
var POSTS_NODE_SUFIX = '/posts';

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
  app.post('/:channel',
          session.provider,
          createChannelNode);
  app.delete('/:channel',
          session.provider,
          deleteChannelNode);
};

//// POST /<channel> ////////////////////////////////////////

function createChannelNode(req, res) {
  var channel = req.params.channel;

  requestChannelCreation(req, res, channel, function(reply) {
    res.send(200);
  });
}

function requestChannelCreation(req, res, channel, callback) {
  var createIq = pubsub.createTopicNodeIq(NODE_PREFIX + channel + POSTS_NODE_SUFIX);
  api.sendQuery(req, res, createIq, callback);
}

//// DELETE /<channel> ////////////////////////////////////////

function deleteChannelNode(req, res) {
  var channel = req.params.channel;

  requestChannelDeletion(req, res, channel, function(reply) {
    res.send(200);
  });
}

function requestChannelDeletion(req, res, channel, callback) {
  var createIq = pubsub.deleteNodeIq(NODE_PREFIX + channel + POSTS_NODE_SUFIX);
  api.sendQuery(req, res, createIq, callback);
}

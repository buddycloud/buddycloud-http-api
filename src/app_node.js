/*
 * Copyright 2013
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

// app_node.js:
// Handles requests concerning application node creation
// (/<channel>).

var api = require('./util/api')
  , pubsub = require('./util/pubsub')
  , session = require('./util/session');

var NODE_PREFIX = '/user/';

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
  app.post('/:channel/:node',
          session.provider,
          createApplicationNode);
  app.delete('/:channel/:node',
          session.provider,
          deleteApplicationNode);
};

//// POST /<channel>/<node> ////////////////////////////////////////

function createApplicationNode(req, res) {
  var channel = req.params.channel;
  var node = req.params.node;

  requestNodeCreation(req, res, channel, node, function(reply) {
    res.send(200);
  });
}

function requestNodeCreation(req, res, channel, node, callback) {
  var createIq = pubsub.createNodeIq(NODE_PREFIX + channel + '/' + node);
  api.sendQuery(req, res, createIq, callback);
}

//// DELETE /<channel>/<node> ////////////////////////////////////////

function deleteApplicationNode(req, res) {
  var channel = req.params.channel;
  var node = req.params.node;

  requestNodeDeletion(req, res, channel, node, function(reply) {
    res.send(200);
  });
}

function requestNodeDeletion(req, res, channel, node, callback) {
  var createIq = pubsub.deleteNodeIq(NODE_PREFIX + channel + '/' + node);
  api.sendQuery(req, res, createIq, callback);
}

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

// subscriptions.js:
// Handles requests related to subscription lists
// (/subscribed, /<channel>/subscribers/<node>).

var connect = require('connect');
var xml = require('libxmljs');
var api = require('./util/api');
var config = require('./util/config');
var pubsub = require('./util/pubsub');
var session = require('./util/session');

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
  app.get('/subscribed',
          session.provider,
          getUserSubscriptions);
  app.post('/subscribed',
           connect.json(),
           session.provider,
           changeUserSubscriptions);
  app.get('/:channel/subscribers/:node',
          session.provider,
          getNodeSubscriptions);
  app.post('/:channel/subscribers/:node',
          session.provider,
          changeNodeSubscriptions);
};

//// GET /subscribed ///////////////////////////////////////////////////////////

function getUserSubscriptions(req, res) {
  if (!req.user) {
    api.sendUnauthorized(res);
    return;
  }

  var channel = req.params.channel;
  var node = req.params.node;

  requestUserAffiliations(req, res, channel, node, function(reply) {
    var body = replyToJSON(reply, 'user');
    res.contentType('json');
    res.send(body);
  });
}

function requestUserAffiliations(req, res, channel, node, callback) {
  var iq = pubsub.userAffiliationsIq();
  api.sendQuery(req, res, iq, callback);
}

function replyToJSON(reply, target) {
  var xpath;
  var ns;
  var key;

  if (target == 'user') {
    xpath = '//pubsub:affiliation[starts-with(@node, "/user/")]';
    ns = pubsub.ns;
    key = 'node';
  } if (target == 'node') {
    xpath = '//pubsub:affiliation[contains(@jid, "@")]';
    ns = pubsub.ownerNS;
    key = 'jid';
  }

  var replydoc = xml.parseXmlString(reply.toString());
  var entries = replydoc.find(xpath, {pubsub: ns});
  var subscriptions = {};

  entries.forEach(function(entry) {
    var keyValue = entry.attr(key).value();

    // Strip the leading "/user/" from node names
    if (target == 'user') {
      keyValue = keyValue.slice('/user/'.length);
    }

    var affiliation = entry.attr('affiliation').value();
    subscriptions[keyValue] = affiliation;
  });

  return subscriptions;
}

//// POST /subscribed //////////////////////////////////////////////////////////

function changeUserSubscriptions(req, res) {
  if (!req.user) {
    api.sendUnauthorized(res);
    return;
  }
  var command = extractSubscriptionCommand(req.body);
  if (!command) {
    res.send(400);
  }
  command.request(req, res, command.channel, command.node, function() {
    res.send(200);
  });
}

function extractSubscriptionCommand(body) {
  try {
    var key = Object.getOwnPropertyNames(body)[0];
    var channelAndNode = key.split('/', 2);
    var affiliation = body[key];
    return {
      channel: channelAndNode[0],
      node: channelAndNode[1],
      request: (affiliation == 'none') ? unsubscribe : subscribe
    };
  } catch (e) {
    return null;
  }
}

function subscribe(req, res, channel, node, callback) {
  var nodeId = pubsub.channelNodeId(channel, node);
  var bareJid = req.user.split('/', 2)[0];
  var iq = pubsub.subscribeIq(nodeId, bareJid);
  api.sendQuery(req, res, iq, callback);
}

function unsubscribe(req, res, channel, node, callback) {
  var nodeId = pubsub.channelNodeId(channel, node);
  var bareJid = req.user.split('/', 2)[0];
  var iq = pubsub.unsubscribeIq(nodeId, bareJid);
  api.sendQuery(req, res, iq, callback);
}

//// GET /<channel>/subscribers/<node> /////////////////////////////////////////

function getNodeSubscriptions(req, res) {
  var channel = req.params.channel;
  var node = req.params.node;
  requestNodeAffiliations(req, res, channel, node, function(reply) {
    var body = replyToJSON(reply, 'node');
    if (!body[req.session.jid]) {
      var nodeId = pubsub.channelNodeId(channel, node);
      console.log(req.session.jid + " is not subscribed to " + nodeId + ", creating temporary subscription");
      req.session.subscribe(nodeId, function(sub) {
        res.contentType('json');
        res.send(body);
      }, function(errstr) {
        res.send(500);
      });
    } else {
      res.contentType('json');
      res.send(body);
    }
  });
}

function requestNodeAffiliations(req, res, channel, node, callback) {
  var nodeId = pubsub.channelNodeId(channel, node);
  var iq = pubsub.nodeAffiliationsIq(nodeId);
  api.sendQuery(req, res, iq, callback);
}

//// POST /<channel>/subscribers/<node> //////////////////////////////////////////////////////////

function changeNodeSubscriptions(req, res) {
  if (!req.user) {
    api.sendUnauthorized(res);
    return;
  }

  var channel = req.params.channel;
  var node = req.params.node;

  var nodeId = pubsub.channelNodeId(channel, node);
  var newSubscribedAffiliations = [];

  try {

    var propertyNames = Object.getOwnPropertyNames(req.body);
    for ( var i=0; i<propertyNames.length; i++ ){

      var key = propertyNames[i];
      var subscribedChannel = key.split('/', 2)[0];
      var subscribedNode = key.split('/', 2)[1];
      var affiliation = body[key];

      if ( affiliation != "member" && affiliation != "publisher" && affiliation != "moderator" && affiliation != "outcast" ){
        continue;
      }

      //TODO
      //Also filter out from newSubscribedAffiliations those channel jids which aren't actually subscribed to this node.
      //Probably by performing a getNodeSubscriptions and comparing the results with the new affiliation information given by the user

      newSubscribedAffiliations.push({
        'jid' : pubsub.channelNodeId(subscribedChannel, subscribedNode),
        'affiliation' : affiliation
      });
    }

  } catch (e) {
    res.send(400);
  }

  api.sendQuery(req, res, pubsub.changeNodeAffiliationsIq(nodeId, newSubscribedAffiliations), function(){
    res.send(200);
  });

}

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
var ltx = require('ltx');
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
          api.bodyReader,
          session.provider,
          changeNodeSubscriptions);
  app.get('/:channel/subscribers/:node/approve',
          session.provider,
          getPendingNodeSubscriptions);
  app.post('/:channel/subscribers/:node/approve',
          api.bodyReader,
          session.provider,
          approveNodeSubscriptions);
};

//// GET /subscribed ///////////////////////////////////////////////////////////

function getUserSubscriptions(req, res) {
  if (!req.user) {
    api.sendUnauthorized(res);
    return;
  }

  requestUserAffiliations(req, res, function(reply) {
    var affiliations = replyToJSON(reply, 'user');
    requestUserSubscriptions(req, res, function(reply) {
      var subscriptions = subscriptionsToJSON(reply, 'user');
      for (var i in subscriptions) {
        var nodeSubscription = subscriptions[i];
        var subscription = nodeSubscription['subscription'];
        if (subscription != 'subscribed') {
          affiliations[nodeSubscription['node']] = subscription;
        }
      }
      res.contentType('json');
      res.send(affiliations);
    });
  });
}

function requestUserAffiliations(req, res, callback) {
  var iq = pubsub.userAffiliationsIq();
  api.sendQuery(req, res, iq, callback);
}

function requestUserSubscriptions(req, res, callback) {
  var iq = pubsub.userSubscriptionsIq();
  api.sendQuery(req, res, iq, callback);
}

function findUserAffiliations(rootEl) {
   return rootEl.getChildrenByFilter(function (c) {
     return typeof c != 'string' && 
       c.getName() == 'affiliation' && 
       c.getNS() == pubsub.ownerNS &&
       c.attr('node') && c.attr('node').indexOf('/user/') == 0; 
   }, true);
}

function findNodeAffiliations(rootEl) {
   return rootEl.getChildrenByFilter(function (c) {
     return typeof c != 'string' && 
       c.getName() == 'affiliation' && 
       c.getNS() == pubsub.ns &&
       c.attr('jid') && c.attr('jid').indexOf('@') != 0; 
   }, true);
}

function replyToJSON(reply, target) {
  var filter;
  var key;

  if (target == 'user') {
    filter = findUserAffiliations;
    key = 'node';
  } if (target == 'node') {
    filter = findNodeAffiliations;
    key = 'jid';
  }

  var replyDoc = ltx.parse(reply.toString());
  var entries = filter(replyDoc);
  var subscriptions = {};

  entries.forEach(function(entry) {
    var keyValue = entry.attr(key);

    // Strip the leading "/user/" from node names
    if (target == 'user') {
      keyValue = stripUserPrefix(keyValue);
    }

    var affiliation = entry.attr('affiliation');
    subscriptions[keyValue] = affiliation;
  });

  return subscriptions;
}

function stripUserPrefix(nodeId) {
  return nodeId.slice('/user/'.length);
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
  var jid = req.user;
  var iq = pubsub.subscribeIq(nodeId, jid);
  api.sendQuery(req, res, iq, callback);
}

function unsubscribe(req, res, channel, node, callback) {
  var nodeId = pubsub.channelNodeId(channel, node);
  var jid = req.user;
  var iq = pubsub.unsubscribeIq(nodeId, jid);
  api.sendQuery(req, res, iq, callback);
}

//// GET /<channel>/subscribers/<node> /////////////////////////////////////////

function getNodeSubscriptions(req, res) {
  var channel = req.params.channel;
  var node = req.params.node;
  requestNodeAffiliations(req, res, channel, node, function(reply) {
    var body = replyToJSON(reply, 'node');
    res.contentType('json');
    res.send(body);
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
    var newAffiliations = JSON.parse(req.body);
    // TODO Filter out from newAffiliations those channel jids which aren't actually subscribed to this node.
    // Probably by performing a getNodeSubscriptions and comparing the results with the new affiliation information given by the user
  } catch (e) {
    res.send(400);
  }

  api.sendQuery(req, res, 
    pubsub.changeNodeAffiliationsIq(nodeId, newAffiliations), 
    function() {
      res.send(200);
    });

}

//// GET /<channel>/subscribers/<node>/approve /////////////////////////////////////////

function getPendingNodeSubscriptions(req, res) {
  if (!req.user) {
    api.sendUnauthorized(res);
    return;
  }
  
  var channel = req.params.channel;
  var node = req.params.node;
  requestNodeSubscriptions(req, res, channel, node, function(reply) {
    var body = subscriptionsToJSON(reply, 'node');
    res.contentType('json');
    res.send(body);
  });
}

function requestNodeSubscriptions(req, res, channel, node, callback) {
  var nodeId = pubsub.channelNodeId(channel, node);
  var iq = pubsub.nodeSubscriptionsIq(nodeId);
  api.sendQuery(req, res, iq, callback);
}

function subscriptionsToJSON(reply, target) {
  var ns;
  if (target == 'user') {
    ns = pubsub.ns;
  } else if (target == 'node') {
    ns = pubsub.ownerNS;
  }

  var replyDoc = ltx.parse(reply.toString());
  var entries = replyDoc.getChildrenByFilter(function (c) {
    return typeof c != 'string' && 
      c.getName() == 'subscription' && c.getNS() == ns; 
  }, true);
  
  var subscriptions = [];

  entries.forEach(function(entry) {
    var subscription = entry.attr('subscription');
    var response = {subscription: subscription};
    if (target == 'user') {
      var node = entry.attr('node');
      response['node'] = stripUserPrefix(node);
    } else if (target == 'node') {
      var jid = entry.attr('jid');
      response['jid'] = jid;
    }
    subscriptions.push(response);
  });

  return subscriptions;
}

//// POST /<channel>/subscribers/<node>/approve //////////////////////////////////////////////////////////

function approveNodeSubscriptions(req, res) {
  if (!req.user) {
    api.sendUnauthorized(res);
    return;
  }

  var channel = req.params.channel;
  var node = req.params.node;

  var nodeId = pubsub.channelNodeId(channel, node);
  var subscribersToApprove = [];

  try {
    subscribersToApprove = JSON.parse(req.body);
  } catch (e) {
    res.send(400);
  }

  api.sendQuery(req, res,
    pubsub.approveSubscriptionIq(nodeId, subscribersToApprove),
    function() {
      res.send(200);
    });
}

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

// node_sub.js:
// Handles requests regarding node subscription lists.

var xml = require('libxmljs');
var autil = require('./api_util');
var config = require('../config');
var pubsub = require('../pubsub');
var session = require('../session');

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
    app.get('/channels/:channel/:node/sub',
        session.provider,
        getNodeSubscriptions);
    app.post('/channels/:channel/:node/sub',
        autil.bodyReader,
        session.provider,
        changeNodeSubscription);
};

function getNodeSubscriptions(req, res) {
    var channel = req.params.channel;
    var node = req.params.node;
    requestNodeAffiliations(req, res, channel, node, function(reply) {
        var body = replyToJSON(reply);
        res.contentType('json');
        res.send(body);
    });
}

function requestNodeAffiliations(req, res, channel, node, callback) {
    autil.discoverChannelNode(req, res, channel, node, function(server, id) {
        var iq = pubsub.affiliationsIq(id);
        iq.to = server;
        autil.sendQuery(req, res, iq, callback);
    });
}

function replyToJSON(reply) {
    var replydoc = xml.parseXmlString(reply.toString());
    var entries = replydoc.find('//p:affiliation', {p: pubsub.ns});

    var subscriptions = {};
    entries.forEach(function(entry) {
        var jid = entry.attr('jid').value();
        var affiliation = entry.attr('affiliation').value();
        subscriptions[jid] = affiliation;
    });

    return subscriptions;
}

function changeNodeSubscription(req, res) {
    var channel = req.params.channel;
    var node = req.params.node;
    var body;
    var action;

    try {
        body = JSON.parse(req.body);
        action = chooseSubscriptionAction(body);
    } catch (e) {
        res.send(400);
        return;
    }

    action(req, res, channel, node, function(reply) {
        res.send(200);
    });
}

function chooseSubscriptionAction(body) {
    if (body instanceof Array && body.length == 1) {
        if (body[0] === true)
            return subscribeToNode;
        else if (body[0] === false)
            return unsubscribeFromNode;
    }
    throw new Error();
}

function subscribeToNode(req, res, channel, node, callback) {
    doSubscribeAction(pubsub.subscribeIq, req, res, channel, node, callback);
}

function unsubscribeFromNode(req, res, channel, node, callback) {
    doSubscribeAction(pubsub.unsubscribeIq, req, res, channel, node, callback);
}

function doSubscribeAction(iqFn, req, res, channel, node, callback) {
    // As we use the buddycloud inbox feature, all subscription requests
    // go to the home buddycloud server.
    var home = config.xmppDomain;

    autil.discoverChannelServer(req, res, home, function(server) {
        var nodeId = autil.channelNodeId(channel, node);
        var bareJid = req.user.split('/', 2)[0];
        var iq = iqFn(nodeId, bareJid);
        iq.to = server;
        autil.sendQuery(req, res, iq, callback);
    });
}

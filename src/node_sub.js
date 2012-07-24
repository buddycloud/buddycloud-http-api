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
var api = require('./util/api');
var config = require('./util/config');
var disco = require('./util/disco');
var pubsub = require('./util/pubsub');
var session = require('./util/session');

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
    app.get('/channels/subscribed',
        session.provider,
        getUserSubscriptions);
    app.get('/channels/:channel/:node/subscriptions',
        session.provider,
        api.channelServerDiscoverer,
        getNodeSubscriptions);
    app.post('/channels/:channel/:node/subscriptions',
        api.bodyReader,
        session.provider,
        changeNodeSubscription);
};

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
    var home = config.xmppDomain;

    disco.discoverChannelServer(home, req.session, function(server, err) {
        if (err) {
            res.send(500);
            return;
        }

        var iq = pubsub.userAffiliationsIq();
        iq.to = server;
        api.sendQuery(req, res, iq, callback);
    });
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
    iq.to = req.channelServer;
    console.log(iq.toString());
    api.sendQuery(req, res, iq, callback);
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

    disco.discoverChannelServer(home, req.session, function(server, err) {
        if (err) {
            res.send(500);
            return;
        }

        var nodeId = pubsub.channelNodeId(channel, node);
        var bareJid = req.user.split('/', 2)[0];

        var iq = iqFn(nodeId, bareJid);
        iq.to = server;
        api.sendQuery(req, res, iq, callback);
    });
}

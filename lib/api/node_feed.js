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

// node_feed.js:
// Handles requests regarding node feeds.

var xmpp = require('node-xmpp');
var xml = require('libxmljs');
var autil = require('./api_util');
var atom = require('../atom');
var config = require('../config');
var pubsub = require('../pubsub');
var session = require('../session');

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
    app.get('/channels/:channel/:node',
        session.provider,
        getNodeFeed);
    app.post('/channels/:channel/:node',
        autil.bodyReader,
        session.provider,
        postToNodeFeed);
};

function getNodeFeed(req, res) {
    var channel = req.params.channel;
    var node = req.params.node;
    requestNodeItems(req, res, channel, node, function(reply) {
        var feed = generateNodeFeed(channel, node, reply);
        res.contentType('atom');
        res.send(feed.toString());
    });
}

function requestNodeItems(req, res, channel, node, callback) {
    autil.discoverChannelNode(req, res, channel, node, function(server, id) {
        var iq = pubsub.itemsIq(id, req.query.max, req.query.after);
        iq.to = server;
        autil.sendQuery(req, res, iq, callback);
    });
}

function generateNodeFeed(channel, node, reply) {
    var feed = xml.Document();
    feed.node('feed').namespace(atom.ns);
    feed.root().node('title', channel + ' ' + node);

    var nodeId = autil.channelNodeId(channel, node);
    var queryURI = pubsub.queryURI(reply.attr('from'), 'retrieve', nodeId);
    feed.root().node('id', queryURI);

    var replydoc = xml.parseXmlString(reply.toString());
    var updated = atom.get(replydoc, '//atom:entry[1]/atom:updated');
    if (updated)
        feed.root().node('updated', updated.text());

    populateNodeFeed(feed, replydoc);
    return feed;
}

function populateNodeFeed(feed, replydoc) {
    var entries = replydoc.find('/iq/p:pubsub/p:items/p:item/a:entry', {
        p: pubsub.ns,
        a: atom.ns
    });
    entries.forEach(function(entry) {
        atom.ensureEntryHasTitle(entry);
        feed.root().addChild(entry.remove());
    });
}

function postToNodeFeed(req, res) {
    var entry;
    try {
        entry = xml.parseXmlString(req.body);
    } catch (e) {
        res.send(400);
        return;
    }

    var channel = req.params.channel;
    var node = req.params.node;

    publishNodeItem(req, res, channel, node, entry, function(reply) {
        var itemId = getPublishedItemId(reply);
        if (!itemId) {
            res.send(500);
            return;
        }
        var itemUri = getNodeItemUri(channel, node, itemId);
        res.header('Location', itemUri);
        res.send(201);
    });
}

function publishNodeItem(req, res, channel, node, entry, callback) {
    autil.discoverChannelNode(req, res, channel, node, function(server, id) {
        var iq = pubsub.publishIq(id, entry.toString());
        iq.to = server;
        autil.sendQuery(req, res, iq, callback);
    });
}

function getPublishedItemId(reply) {
    try {
        return reply.
            getChild('pubsub').
            getChild('publish').
            getChild('item').attr('id');
    } catch (e) {
        return null;
    }
}

function getNodeItemUri(channel, node, item) {
    return '/channels/' + channel + '/' + node + '/item?id=' + item;
}

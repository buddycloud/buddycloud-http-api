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

// content_feed.js:
// Handles requests regarding channel node feeds
// (/<channel>/content/<node>).

var xmpp = require('node-xmpp');
var xml = require('libxmljs');
var api = require('./util/api');
var atom = require('./util/atom');
var config = require('./util/config');
var pubsub = require('./util/pubsub');
var session = require('./util/session');

/**
 * Registers resource URL handlers.
 */
exports.setup = function(app) {
    app.get('/:channel/content/:node',
        session.provider,
        api.channelServerDiscoverer,
        getNodeFeed);
    app.post('/:channel/content/:node',
        api.bodyReader,
        session.provider,
        api.channelServerDiscoverer,
        postToNodeFeed);
};

function getNodeFeed(req, res) {
    var channel = req.params.channel;
    var node = req.params.node;

    requestNodeItems(req, res, channel, node, function(reply) {
        var feed = generateNodeFeed(channel, node, reply);
        api.sendAtomResponse(req, res, feed.root());
    });
}

function requestNodeItems(req, res, channel, node, callback) {
    var nodeId = pubsub.channelNodeId(channel, node);
    var iq = pubsub.itemsIq(nodeId, req.query.max, req.query.after);
    iq.to = req.channelServer;
    api.sendQuery(req, res, iq, callback);
}

function generateNodeFeed(channel, node, reply) {
    var feed = xml.Document();
    feed.node('feed').namespace(atom.ns);
    feed.root().node('title', channel + ' ' + node);

    var nodeId = pubsub.channelNodeId(channel, node);
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
    var entry = parseRequestBody(req, res);
    if (!entry) {
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

function parseRequestBody(req, res) {
    try {
        if (req.is('json') || req.body.toString().match(/^\w*\{/)) {
            return atom.fromJSON(JSON.parse(req.body));
        } else {
            return xml.parseXmlString(req.body);
        }
    } catch (e) {
        res.send(400);
        return null;
    }
}

function publishNodeItem(req, res, channel, node, entry, callback) {
    var nodeId = pubsub.channelNodeId(channel, node);
    var iq = pubsub.publishIq(nodeId, entry.toString());
    iq.to = req.channelServer;
    api.sendQuery(req, res, iq, callback);
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
    return '/' + [channel, 'content', node, item].join('/');
}
